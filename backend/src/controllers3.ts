import { Controller, Get, Put, Delete, Param, Body, HttpCode, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario, Submission, Exercise, SensorReading, Field } from './entities';
import { Roles, CurrentUser } from './auth';
import { CohortReportService } from './services';

@Controller('api/v1/workspace')
export class WorkspaceExtraController {
  constructor(@InjectRepository(Scenario) private scenarios: Repository<Scenario>) {}
  @Put('scenarios/:id') async update(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) {
    const s = await this.scenarios.findOne({ where: { id, createdBy: u.sub } });
    if (!s) throw new NotFoundException('Scenario not found');
    if (b?.name) s.name = String(b.name);
    if (b) s.metadata = b;
    const saved = await this.scenarios.save(s);
    return { ...(saved.metadata || {}), id: saved.id, name: saved.name };
  }
  @Delete('scenarios/:id') @HttpCode(204) async remove(@Param('id') id: string, @CurrentUser() u: any) {
    await this.scenarios.delete({ id, createdBy: u.sub });
  }
}

@Controller('api/v1/exercises')
export class ExerciseExtraController {
  constructor(
    @InjectRepository(Submission) private subs: Repository<Submission>,
    @InjectRepository(Exercise) private exercises: Repository<Exercise>,
  ) {}
  @Roles('LEARNER', 'TRAINER', 'ADMIN') @Get(':id/submissions/me')
  async mine(@Param('id') id: string, @CurrentUser() u: any) {
    const ex = await this.exercises.findOne({ where: { id } });
    if (!ex) throw new NotFoundException('Exercise not found');
    const list = await this.subs.find({ where: { exerciseId: id, userId: u.sub }, order: { createdAt: 'DESC' } });
    return list.map(s => ({ id: s.id, exerciseId: id, runId: s.runId, userId: s.userId, score: s.score, passed: s.score >= ex.passScore, createdAt: s.createdAt }));
  }
}

@Controller('api/v1/trainer')
export class TrainerExtraController {
  constructor(
    @InjectRepository(Submission) private subs: Repository<Submission>,
    @InjectRepository(Exercise) private exercises: Repository<Exercise>,
    private report: CohortReportService,
  ) {}
  @Roles('TRAINER', 'ADMIN') @Get('cohorts/:code/report')
  async cohort(@Param('code') code: string) {
    const exs = await this.exercises.find({ where: { moduleCode: code } });
    return Promise.all(exs.map(ex => this.report.reportForExercise(ex.id)));
  }
  @Roles('TRAINER', 'ADMIN') @Get('submissions/:id')
  async detail(@Param('id') id: string) {
    return this.report.submissionDetail(id);
  }
}

@Controller('api/v1/fields')
export class FieldExtraController {
  constructor(
    @InjectRepository(SensorReading) private readings: Repository<SensorReading>,
    @InjectRepository(Field) private fields: Repository<Field>,
  ) {}
  @Get(':id/baseline') async baseline(@Param('id') id: string) {
    const f = await this.fields.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Field not found');
    const rows = await this.readings.find({ where: { fieldId: id }, order: { recordedAt: 'DESC' }, take: 500 });
    let smSum = 0, smN = 0, rainSum = 0, rainN = 0, tmpSum = 0, tmpN = 0;
    for (const r of rows) {
      if (r.type === 'SOIL_MOISTURE') { smSum += r.value; smN++; }
      else if (r.type === 'RAIN_MM') { rainSum += r.value; rainN++; }
      else if (r.type === 'TEMP_C') { tmpSum += r.value; tmpN++; }
    }
    return {
      fieldId: id, fieldName: f.name,
      averageSoilMoisturePct: smN ? Math.round(smSum / smN * 100) / 100 : null,
      totalRainMm: rainN ? Math.round(rainSum * 100) / 100 : null,
      averageTempC: tmpN ? Math.round(tmpSum / tmpN * 100) / 100 : null,
      from: rows[rows.length - 1]?.recordedAt || null, to: rows[0]?.recordedAt || null,
      sampleCount: rows.length, computedAt: new Date(),
      disclaimer: 'Preliminary sensor aggregates. NOT agronomic advice.',
    };
  }
}
