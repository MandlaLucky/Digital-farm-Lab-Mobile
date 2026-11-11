import {Entity,PrimaryGeneratedColumn as PG,Column as C,ManyToOne as M,JoinColumn as J,CreateDateColumn as D} from 'typeorm';
const num = { to:(v:any)=>v, from:(v:any)=>Number(v) };

@Entity('users') export class User { @PG('uuid') id:string; @C({name:'display_name',length:120}) displayName:string; @C({length:20}) role:string; @D({name:'created_at',type:'timestamptz'}) createdAt:Date; }

@Entity('farms') export class Farm { @PG('uuid') id:string; @C({name:'owner_id',type:'uuid'}) ownerId:string; @C({length:160}) name:string; @C({length:60}) province:string; @C({name:'total_ha',type:'numeric',precision:10,scale:2,transformer:num}) totalHa:number; @C({name:'is_demo',default:false}) isDemo:boolean; @C({type:'jsonb',nullable:true}) metadata:any; @D({name:'created_at',type:'timestamptz'}) createdAt:Date; }

@Entity('fields') export class Field { @PG('uuid') id:string; @C({name:'farm_id',type:'uuid'}) farmId:string; @M(()=>Farm) @J({name:'farm_id'}) farm:Farm; @C({length:120}) name:string; @C({name:'area_ha',type:'numeric',precision:10,scale:2,transformer:num}) areaHa:number; @C({name:'soil_type',length:40}) soilType:string; @C({name:'crop_code',length:40}) cropCode:string; @C({name:'planting_date',type:'date'}) plantingDate:string; }

@Entity('sensor_readings') export class SensorReading { @PG({type:'bigint'}) id:string; @C({name:'field_id',type:'uuid'}) fieldId:string; @C({length:30}) type:string; @C({type:'numeric',precision:10,scale:3,transformer:num}) value:number; @C({name:'recorded_at',type:'timestamptz'}) recordedAt:Date; }

@Entity('scenarios') export class Scenario { @PG('uuid') id:string; @C({name:'field_id',type:'uuid'}) fieldId:string; @M(()=>Field) @J({name:'field_id'}) field:Field; @C({name:'created_by',type:'uuid'}) createdBy:string; @C({length:160}) name:string; @C({type:'jsonb'}) params:any; @C({type:'jsonb',nullable:true}) metadata:any; @C({name:'is_preset',default:false}) isPreset:boolean; @D({name:'created_at',type:'timestamptz'}) createdAt:Date; }

@Entity('runs') export class ScenarioRun { @PG('uuid') id:string; @C({name:'scenario_id',type:'uuid'}) scenarioId:string; @M(()=>Scenario) @J({name:'scenario_id'}) scenario:Scenario; @C({name:'run_by',type:'uuid'}) runBy:string; @C({type:'jsonb'}) params:any; @C({type:'jsonb'}) results:any; @C({type:'jsonb'}) baseline:any; @C({type:'jsonb',nullable:true}) metadata:any; @C({type:'int',nullable:true}) score:number; @D({name:'created_at',type:'timestamptz'}) createdAt:Date; }

@Entity('exercises') export class Exercise { @PG('uuid') id:string; @C({name:'module_code',length:60}) moduleCode:string; @C({length:200}) title:string; @C({type:'text'}) prompt:string; @C({type:'jsonb'}) rubric:any; @C({name:'pass_score',type:'int',default:60}) passScore:number; }

@Entity('submissions') export class Submission { @PG('uuid') id:string; @C({name:'exercise_id',type:'uuid'}) exerciseId:string; @M(()=>Exercise) @J({name:'exercise_id'}) exercise:Exercise; @C({name:'run_id',type:'uuid'}) runId:string; @C({name:'user_id',type:'uuid'}) userId:string; @C({type:'int'}) score:number; @C({type:'text',nullable:true}) reflection:string | null; @D({name:'created_at',type:'timestamptz'}) createdAt:Date; }
