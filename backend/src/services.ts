import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field, Scenario, ScenarioRun, Exercise, Submission } from './entities';
import { ScenarioEngine, ScenarioParams } from './engine';
import { BaselineParamsResolver } from './baseline';
import { ScoringService, RunSnapshot, CriterionResult } from './scoring';

const fn = (...v:any[]):number => { for (const x of v) if (x!=null && !isNaN(Number(x))) return Number(x); return 0; };
const fnl = (...v:any[]):number | null => { for (const x of v) if (x!=null && !isNaN(Number(x))) return Number(x); return null; };

export function mergeParams(o:any, s:any, b:ScenarioParams): ScenarioParams {
  const irr = fn(o?.irrigationMm, s?.irrigationMm, b.irrigationMm);
  const fer = fn(o?.fertiliserKgHa, s?.fertiliserKgHa, b.fertiliserKgHa);
  const dt = o?.plantingDate || s?.plantingDate || b.plantingDate;
  let red = fnl(o?.irrigationReductionPct, s?.irrigationReductionPct);
  if (red===null && b.irrigationMm>0) red = Math.round(Math.max(0,(b.irrigationMm-irr)/b.irrigationMm)*100);
  if (red===null) red = 0;
  red = Math.max(0, Math.min(100, red));
  return { irrigationMm:irr, fertiliserKgHa:fer, plantingDate:dt, irrigationReductionPct:red };
}

@Injectable()
export class RunService {
  private engine = new ScenarioEngine();
  private resolver = new BaselineParamsResolver();
  constructor(
    @InjectRepository(Scenario) private scenarios: Repository<Scenario>,
    @InjectRepository(ScenarioRun) private runs: Repository<ScenarioRun>,
    @InjectRepository(Field) private fields: Repository<Field>,
  ) {}
  async createRun(userId:string, scenarioId:string | null, body:any): Promise<ScenarioRun> {
    let sc: Scenario | null = null;
    if (scenarioId) sc = await this.scenarios.findOne({ where:{ id:scenarioId, createdBy:userId } });
    if (!sc) {
      const field = (await this.fields.find({ take:1 }))[0];
      if (!field) throw new Error('No fields available');
      sc = await this.scenarios.save(this.scenarios.create({ fieldId:field.id, createdBy:userId, name:'Preset run', params:{ irrigationMm:440, fertiliserKgHa:180, plantingDate:'2026-10-15', irrigationReductionPct:20 }, metadata:{}, isPreset:false }));
    }
    const field = await this.fields.findOne({ where:{ id:sc.fieldId } });
    const baseline = this.resolver.forField(field);
    const effective = mergeParams(body?.params || {}, sc.params, baseline);
    return this.runs.save(this.runs.create({ scenarioId:sc.id, runBy:userId, params:effective, results:this.engine.run(effective) as any, baseline:this.engine.run(baseline) as any, metadata:body?.record || {} }));
  }
}

export interface CriterionStat { key: string; label: string; weight: number; totalEvaluations: number; satisfied: number; satisfactionRate: number; }
export interface SubmissionDetail { submissionId: string; exerciseId: string; runId: string; userId: string; displayName: string | null; score: number; passed: boolean; passScore: number; createdAt: Date; reflection: string | null; runParams: any; results: any; baseline: any; breakdown: CriterionResult[]; rubricDriftDetected: boolean; }

@Injectable()
export class CohortReportService {
  private scorer = new ScoringService();
  constructor(
    @InjectRepository(Exercise) private exercises: Repository<Exercise>,
    @InjectRepository(Submission) private submissions: Repository<Submission>,
    @InjectRepository(ScenarioRun) private runs: Repository<ScenarioRun>,
    @InjectRepository(Scenario) private scenarios: Repository<Scenario>,
  ) {}

  private async loadSnapshot(runId: string): Promise<RunSnapshot | null> {
    const run = await this.runs.findOne({ where: { id: runId } });
    if (!run) return null;
    const scenario = await this.scenarios.findOne({ where: { id: run.scenarioId } });
    return { runId: run.id, runBy: run.runBy, runParams: run.params || {}, scenarioParams: scenario?.params || {}, results: run.results || {}, baseline: run.baseline || {} };
  }

  async computeCriterionStats(ex: Exercise, subs: Submission[]): Promise<CriterionStat[]> {
    if (!subs.length) return [];
    const agg = new Map<string, { key: string; label: string; weight: number; total: number; satisfied: number }>();
    for (const s of subs) {
      const snap = await this.loadSnapshot(s.runId);
      if (!snap) continue;
      let outcome;
      try { outcome = this.scorer.score(ex.rubric, ex.passScore, snap, s.reflection); } catch { continue; }
      for (const c of outcome.breakdown) {
        const a = agg.get(c.key) ?? { key: c.key, label: c.label, weight: c.weight, total: 0, satisfied: 0 };
        a.total++; if (c.satisfied) a.satisfied++;
        agg.set(c.key, a);
      }
    }
    return [...agg.values()].map(a => ({ key: a.key, label: a.label, weight: a.weight, totalEvaluations: a.total, satisfied: a.satisfied, satisfactionRate: a.total ? Math.round((100 * a.satisfied / a.total) * 10) / 10 : 0 }));
  }

  async countDrift(ex: Exercise, subs: Submission[]): Promise<number> {
    let drift = 0;
    for (const s of subs) {
      const snap = await this.loadSnapshot(s.runId);
      if (!snap) continue;
      try { const rescored = this.scorer.score(ex.rubric, ex.passScore, snap, s.reflection).score; if (rescored !== s.score) drift++; } catch {}
    }
    return drift;
  }

  async submissionDetail(id: string): Promise<SubmissionDetail> {
    const s = await this.submissions.findOne({ where: { id } });
    if (!s) throw new Error('Submission not found: ' + id);
    const ex = await this.exercises.findOne({ where: { id: s.exerciseId } });
    if (!ex) throw new Error('Exercise not found: ' + s.exerciseId);
    const snap = await this.loadSnapshot(s.runId);
    if (!snap) throw new Error('Run not found: ' + s.runId);
    const outcome = this.scorer.score(ex.rubric, ex.passScore, snap, s.reflection);
    return { submissionId: s.id, exerciseId: s.exerciseId, runId: s.runId, userId: s.userId, displayName: null, score: s.score, passed: s.score >= ex.passScore, passScore: ex.passScore, createdAt: s.createdAt, reflection: s.reflection, runParams: snap.runParams, results: snap.results, baseline: snap.baseline, breakdown: outcome.breakdown, rubricDriftDetected: outcome.score !== s.score };
  }

  async overview() {
    const exs = await this.exercises.find({ order:{ moduleCode:'ASC', title:'ASC' } });
    return Promise.all(exs.map(async ex => {
      const subs = await this.submissions.find({ where:{ exerciseId:ex.id } });
      const scores = subs.map(s=>s.score).sort((a,b)=>a-b);
      const learners = new Set(subs.map(s=>s.userId));
      const passed = new Set(subs.filter(s=>s.score>=ex.passScore).map(s=>s.userId));
      const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
      return { exerciseId:ex.id, moduleCode:ex.moduleCode, title:ex.title, passScore:ex.passScore, submissionCount:subs.length, uniqueLearners:learners.size, averageScore:Math.round(avg*10)/10, learnerPassRate:learners.size?Math.round(100*passed.size/learners.size*10)/10:0 };
    }));
  }

  async reportForExercise(id:string) {
    const ex = await this.exercises.findOne({ where:{ id } });
    if (!ex) throw new Error('Exercise not found: ' + id);
    const subs = await this.submissions.find({ where:{ exerciseId:id } });
    const scores = subs.map(s=>s.score).sort((a,b)=>a-b);
    const counts = new Array(11).fill(0);
    for (const s of subs) counts[Math.min(10, Math.floor(Math.max(0, Math.min(100, s.score)) / 10))]++;
    const distribution = counts.map((count, i) => ({ range:(i*10)+'-'+(i===10?100:i*10+9), lowerBound:i*10, upperBound:i===10?100:i*10+9, meetsPassThreshold:i*10>=ex.passScore, count }));
    const learners = new Set(subs.map(s=>s.userId));
    const passedL = new Set(subs.filter(s=>s.score>=ex.passScore).map(s=>s.userId));
    const passedS = subs.filter(s=>s.score>=ex.passScore).length;
    const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
    const median = scores.length===0?0:(scores.length%2?scores[Math.floor(scores.length/2)]:Math.round((scores[scores.length/2-1]+scores[scores.length/2])/2));
    const criteria = await this.computeCriterionStats(ex, subs);
    const rubricDriftCount = subs.length ? await this.countDrift(ex, subs) : 0;
    return { exerciseId:ex.id, moduleCode:ex.moduleCode, title:ex.title, prompt:ex.prompt, passScore:ex.passScore, statistics:{ submissionCount:subs.length, uniqueLearners:learners.size, passedSubmissions:passedS, passedLearners:passedL.size, averageScore:Math.round(avg*10)/10, minScore:scores[0]||0, medianScore:median, maxScore:scores[scores.length-1]||0, submissionPassRate:subs.length?Math.round(100*passedS/subs.length*10)/10:0, learnerPassRate:learners.size?Math.round(100*passedL.size/learners.size*10)/10:0, rubricDriftCount }, distribution, criteria, recentSubmissions: subs.slice(0,20).map(s=>({ submissionId:s.id, userId:s.userId, displayName:null, score:s.score, passed:s.score>=ex.passScore, createdAt:s.createdAt })) };
  }
}