import { Allow, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DemoRunDto {
  @Allow() irrigationMm?: number;
  @Allow() fertiliserKgHa?: number;
  @Allow() plantingDate?: string;
}

export class CreateFarmDto {
  @Allow() name?: string;
  @Allow() location?: string;
  @Allow() totalSize?: number;
  @Allow() fields?: any[];
  @Allow() metadata?: any;
}

export class CreateScenarioDto {
  @Allow() name?: string;
  @Allow() farmId?: string;
  @Allow() description?: string;
  @Allow() category?: string;
  @Allow() participatingFields?: string[];
  @Allow() crops?: any[];
  @Allow() startingConditions?: any;
  @Allow() adjustableVariables?: string[];
  @Allow() duration?: number;
  @Allow() difficulty?: string;
  @Allow() learningObjectives?: string[];
}

export class SubmitDto {
  @IsUUID() runId: string;
  @IsOptional() @IsString() @MaxLength(2000) reflection?: string;
}

export class RunBodyDto {
  @Allow() scenarioId?: string | null;
  @Allow() params?: any;
  @Allow() record?: any;
}
