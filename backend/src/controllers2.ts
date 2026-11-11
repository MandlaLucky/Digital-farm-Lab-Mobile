import { Controller, Get, Post, Param, Body, HttpCode, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise, Submission, ScenarioRun, SensorReading, Field } from './entities';
import { CohortReportService } from './services';
import { ScoringService } from './scoring';
import { MockPassportClient } from './integration';
import { Roles, CurrentUser, Public } from './auth';
import { SubmitDto } from './dto';

@Controller('api/v1/exercises')
export class ExerciseController {
  private scorer = new ScoringService();
  private passport = new MockPassportClient();
  constructor(
    @InjectRepository(Exercise) private exercises:Repository<Exercise>,
    @InjectRepository(Submission) private subs:Repository<Submission>,
    @InjectRepository(ScenarioRun) private runs:Repository<ScenarioRun>,
  ) {}
  @Public() @Get() async list(){
    const list = await this.exercises.find({ order:{ moduleCode:'ASC', title:'ASC' } });
    return list.map(e => ({ id:e.id, moduleCode:e.moduleCode, title:e.title, prompt:e.prompt, passScore:e.passScore }));
  }
  @Public() @Get(':id') async get(@Param('id') id:string){
    const e = await this.exercises.findOne({ where:{ id } });
    if (!e) throw new NotFoundException('Exercise not found: ' + id);
    return { id:e.id, moduleCode:e.moduleCode, title:e.title, prompt:e.prompt, rubric:e.rubric, passScore:e.passScore };
  }
  @Roles('LEARNER') @Post(':id/submissions') @HttpCode(201) async submit(@Param('id') id:string, @Body() b:SubmitDto, @CurrentUser() u:any){
    const ex = await this.exercises.findOne({ where:{ id } });
    if (!ex) throw new NotFoundException('Exercise not found: ' + id);
    const run = await this.runs.findOne({ where:{ id:b.runId } });
    if (!run) throw new NotFoundException('Run not found: ' + b.runId);
    if (run.runBy !== u.sub) throw new ForbiddenException('You can only submit your own runs.');
    const dup = await this.subs.findOne({ where:{ exerciseId:id, runId:b.runId, userId:u.sub } });
    if (dup) throw new ConflictException('Duplicate submission');
    const outcome = this.scorer.score(ex.rubric, ex.passScore, { runId:run.id, runBy:run.runBy, runParams:run.params, scenarioParams:{}, results:run.results, baseline:run.baseline }, b.reflection || null);
    const saved = await this.subs.save(this.subs.create({ exerciseId:id, runId:b.runId, userId:u.sub, score:outcome.score, reflection:b.reflection || null }));
    if (outcome.passed) { try { await this.passport.issueCredential({ userId:u.sub, credentialType:'A14-' + ex.moduleCode, payload:{ score:outcome.score } }); } catch {} }
    return { id:saved.id, runId:saved.runId, score:outcome.score, passed:outcome.passed, passScore:outcome.passScore, breakdown:outcome.breakdown, createdAt:saved.createdAt };
  }
}

@Controller('api/v1/trainer')
export class TrainerController {
  constructor(private report:CohortReportService) {}
  @Roles('TRAINER','ADMIN') @Get('exercises') list(){ return this.report.overview(); }
  @Roles('TRAINER','ADMIN') @Get('exercises/:id/report') one(@Param('id') id:string){ return this.report.reportForExercise(id); }
}

@Controller('api/v1/fields')
export class FieldController {
  constructor(
    @InjectRepository(SensorReading) private readings:Repository<SensorReading>,
    @InjectRepository(Field) private fields:Repository<Field>,
  ) {}
  @Get(':id/sensor-readings') async list(@Param('id') id:string){
    const f = await this.fields.findOne({ where:{ id } });
    if (!f) throw new NotFoundException('Field not found');
    const rows = await this.readings.find({ where:{ fieldId:id }, order:{ recordedAt:'DESC' }, take:100 });
    return { fieldId:id, count:rows.length, truncated:false, readings: rows.map(r => ({ id:r.id, type:r.type, value:r.value, recordedAt:r.recordedAt })) };
  }
}
