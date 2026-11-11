export interface RunSnapshot { runId:string; runBy:string; runParams:any; scenarioParams:any; results:any; baseline:any }
export interface CriterionResult { key:string; label:string; weight:number; earned:number; satisfied:boolean }
export interface ScoringOutcome { score:number; passed:boolean; passScore:number; breakdown:CriterionResult[] }

export class ScoringService {
  score(rubric:any, passScore:number, run:RunSnapshot, reflection:string | null): ScoringOutcome {
    const cs = Array.isArray(rubric?.criteria) ? rubric.criteria : [];
    let tw = 0, ew = 0; const bd: CriterionResult[] = [];
    for (const c of cs) {
      const w = Number(c.weight) || 0;
      const ok = this.ev(c, run, reflection);
      const e = ok ? w : 0;
      tw += w; ew += e;
      bd.push({ key:String(c.key||''), label:String(c.label||c.key||''), weight:w, earned:e, satisfied:ok });
    }
    const s = tw === 0 ? 0 : Math.round(100*ew/tw);
    return { score:s, passed:s >= passScore, passScore, breakdown:bd };
  }
  private ev(c:any, run:RunSnapshot, ref:string | null): boolean {
    try {
      switch (c.type) {
        case 'PARAMS_DIFFER': return JSON.stringify(run.runParams) !== JSON.stringify(run.scenarioParams);
        case 'PARAMS_RANGE': return this.rng(c, run.runParams);
        case 'RESULT_RANGE': return this.rng(c, run.results);
        case 'RESULT_MAX_PCT_DELTA_FROM_BASELINE': return this.delta(c, run.results, run.baseline);
        case 'REFLECTION_MIN_WORDS':
          if (!ref) return false;
          return ref.trim().split(/\s+/).filter(Boolean).length >= (Number(c.minWords)||0);
        default: return false;
      }
    } catch { return false; }
  }
  private rng(c:any, d:any): boolean {
    const v=this.n(d?.[c.field]), lo=this.n(c.min), hi=this.n(c.max);
    if (v===null) return false;
    if (lo!==null && v<lo) return false;
    if (hi!==null && v>hi) return false;
    return true;
  }
  private delta(c:any, r:any, b:any): boolean {
    const a=this.n(r?.[c.field]), base=this.n(b?.[c.field]), m=this.n(c.maxPctDelta);
    if (a===null||base===null||m===null||base===0) return false;
    return Math.abs(a-base)/Math.abs(base) <= m;
  }
  private n(v:any): number | null {
    if (typeof v==='number') return v;
    if (typeof v==='string'){const x=parseFloat(v);return isNaN(x)?null:x;}
    return null;
  }
}