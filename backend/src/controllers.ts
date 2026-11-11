import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Farm, Field, Scenario, ScenarioRun, SensorReading, Exercise, Submission } from './entities';
import { RunService, CohortReportService } from './services';
import { ScenarioEngine } from './engine';
import { ScoringService } from './scoring';
import { Public, Roles, CurrentUser } from './auth';
import { DemoRunDto, SubmitDto } from './dto';

@Controller('api/v1/workspace')
export class WorkspaceController {
  constructor(
    @InjectRepository(Farm) private farms:Repository<Farm>,
    @InjectRepository(Field) private fields:Repository<Field>,
    @InjectRepository(Scenario) private scenarios:Repository<Scenario>,
    @InjectRepository(ScenarioRun) private runs:Repository<ScenarioRun>,
    private runService:RunService,
  ) {}

  @Get('farms') async listFarms(@CurrentUser() u:any){
    const list = await this.farms.find({ where:{ ownerId:u.sub }, order:{ name:'ASC' } });
    const out:any[] = [];
    for (const f of list) {
      const fs = await this.fields.find({ where: { farmId: f.id } });
      const fields = fs.map((x:any, i:number) => ({
        id: x.id, name: x.name, size: Number(x.areaHa),
        soil: String(x.soilType || 'loamy').toLowerCase(),
        crop: String(x.cropCode || 'NONE').toLowerCase(),
        irrigation: 'none',
        x: 8 + (i % 3) * 28, y: 10 + Math.floor(i / 3) * 39, width: 24, height: 30,
      }));
      out.push({ ...(f.metadata||{}), id:f.id, name:f.name, location:f.province, totalSize:f.totalHa, fields });
    }
    return out;
  }
  @Post('farms') @HttpCode(201) async createFarm(@Body() b:any, @CurrentUser() u:any){
    const f = await this.farms.save(this.farms.create({ ownerId:u.sub, name:String(b?.name||'Unnamed farm'), province:String(b?.location||'Unknown'), totalHa:Number(b?.totalSize||40), metadata:b, isDemo:false }));
    const ff = Array.isArray(b?.fields) ? b.fields : [];
    for (const fd of ff) {
      await this.fields.save(this.fields.create({ farmId:f.id, name:String(fd?.name||'Field'), areaHa:Number(fd?.size||5), soilType:String(fd?.soil||'loamy'), cropCode:String(fd?.crop||'none').toUpperCase(), plantingDate:'2026-10-15' }));
    }
    return { ...(f.metadata||{}), id:f.id, name:f.name, location:f.province, totalSize:f.totalHa };
  }
  @Put('farms/:id') async updateFarm(@Param('id') id:string, @Body() b:any, @CurrentUser() u:any){
    const f = await this.farms.findOne({ where:{ id, ownerId:u.sub } });
    if (!f) throw new NotFoundException('Farm not found');
    f.name = String(b?.name||f.name); f.province = String(b?.location||f.province); f.metadata = b;
    const s = await this.farms.save(f);
    return { ...(s.metadata||{}), id:s.id, name:s.name, location:s.province, totalSize:s.totalHa };
  }
  @Delete('farms/:id') @HttpCode(204) async deleteFarm(@Param('id') id:string, @CurrentUser() u:any){
    await this.farms.delete({ id, ownerId:u.sub });
  }
  @Get('scenarios') async listScenarios(@CurrentUser() u:any){
    const list = await this.scenarios.find({ where:{ createdBy:u.sub }, order:{ createdAt:'DESC' } });
    return list.map(s => ({ ...(s.metadata||{}), id:s.id, name:s.name }));
  }
  @Post('scenarios') @HttpCode(201) async createScenario(@Body() b:any, @CurrentUser() u:any){
    const field = (await this.fields.find({ take:1 }))[0];
    if (!field) throw new NotFoundException('No field');
    const params = { irrigationMm:440, fertiliserKgHa:180, plantingDate:'2026-10-15', irrigationReductionPct:20 };
    const s = await this.scenarios.save(this.scenarios.create({ fieldId:field.id, createdBy:u.sub, name:String(b?.name||'Unnamed scenario'), params, metadata:b, isPreset:false }));
    return { ...(s.metadata||{}), id:s.id, name:s.name };
  }
  @Get('runs') async listRuns(@CurrentUser() u:any){
    const list = await this.runs.find({ where:{ runBy:u.sub }, order:{ createdAt:'DESC' } });
    return list.map(r => ({ ...(r.metadata||{}), id:r.id, scenarioId:r.scenarioId, results:r.results, baseline:r.baseline, createdAt:r.createdAt }));
  }
  @Post('runs') @HttpCode(201) async createRun(@Body() b:any, @CurrentUser() u:any){
    const r = await this.runService.createRun(u.sub, b?.scenarioId || null, b);
    return { ...(r.metadata||{}), id:r.id, scenarioId:r.scenarioId, results:r.results, baseline:r.baseline, createdAt:r.createdAt };
  }
  @Public() @Get('presets') async listPresets(){
    const list = await this.scenarios.find({ where:{ isPreset:true } });
    return list.map(s => ({ ...(s.metadata||{}), id:s.id, name:s.name }));
  }
  @Public() @Get('demo-farm') async demoFarm(){
    const f = await this.farms.findOne({ where:{ isDemo:true } });
    if (!f) throw new NotFoundException('No demo farm');
    const fs = await this.fields.find({ where: { farmId: f.id } });
    const fields = fs.map((x:any, i:number) => ({
      id: x.id, name: x.name, size: Number(x.areaHa),
      soil: String(x.soilType || 'loamy').toLowerCase(),
      crop: String(x.cropCode || 'NONE').toLowerCase(),
      irrigation: 'none',
      x: 8 + (i % 3) * 28, y: 10 + Math.floor(i / 3) * 39, width: 24, height: 30,
    }));
    return { ...(f.metadata||{}), id:f.id, name:f.name, location:f.province, totalSize:f.totalHa, fields };
  }
}

@Controller('api/v1/demo')
export class DemoController {
  private engine = new ScenarioEngine();
  @Post('run') @HttpCode(200) @Public() run(@Body() b:DemoRunDto){
    const baseline = { irrigationMm:550, fertiliserKgHa:180, plantingDate:'2026-10-15', irrigationReductionPct:0 };
    const irr = Math.max(0, Math.min(900, Number(b?.irrigationMm ?? 550)));
    const fer = Math.max(0, Math.min(300, Number(b?.fertiliserKgHa ?? 180)));
    const dt = String(b?.plantingDate || '2026-10-15');
    const red = baseline.irrigationMm > 0 ? Math.round(Math.max(0, (baseline.irrigationMm-irr)/baseline.irrigationMm)*100) : 0;
    const p = { irrigationMm:irr, fertiliserKgHa:fer, plantingDate:dt, irrigationReductionPct:Math.max(0, Math.min(100, red)) };
    return { scenario: this.engine.run(p), baseline: this.engine.run(baseline) };
  }
}
