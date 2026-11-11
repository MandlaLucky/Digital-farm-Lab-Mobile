import { ScenarioParams } from './engine';
export class BaselineParamsResolver {
  forField(f:any): ScenarioParams {
    const crop = String(f?.cropCode || '').toUpperCase();
    const dt = f?.plantingDate || '2026-10-15';
    if (crop === 'MAIZE') return { irrigationMm:550, fertiliserKgHa:180, plantingDate:dt, irrigationReductionPct:0 };
    return { irrigationMm:400, fertiliserKgHa:100, plantingDate:dt, irrigationReductionPct:0 };
  }
}