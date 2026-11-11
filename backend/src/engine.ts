export interface ScenarioParams { irrigationMm:number; fertiliserKgHa:number; plantingDate:string; irrigationReductionPct:number }
export interface ScenarioResult { yieldTha:number; waterUseM3Ha:number; costPerHa:number; grossMarginPerHa:number; disclaimer:string }
export const NOT_AGRONOMIC_ADVICE = 'Simulated teaching model. NOT agronomic advice.';
const CROP = 600, RAIN = 150, EFF = 0.70, KY = 1.25, MAX = 8.0, K = 0.012, OM = 10, OD = 15, GRACE = 14, PEN = 0.005, FC = 12, IC = 2.5, FIX = 8500, PRICE = 3800, M3 = 10;
const r = (v:number,d:number) => Math.round(v * Math.pow(10,d)) / Math.pow(10,d);

export class ScenarioEngine {
  run(p: ScenarioParams): ScenarioResult {
    const y = r(Math.min(this.water(p.irrigationMm), this.fert(p.fertiliserKgHa)) * this.plant(p.plantingDate), 2);
    const w = r((RAIN + p.irrigationMm) * M3, 2);
    const c = r(FC * p.fertiliserKgHa + IC * p.irrigationMm + FIX, 2);
    return { yieldTha:y, waterUseM3Ha:w, costPerHa:c, grossMarginPerHa:r(y*PRICE-c,2), disclaimer:NOT_AGRONOMIC_ADVICE };
  }
  private water(irr:number): number {
    const s = RAIN + irr * EFF;
    const d = s < CROP ? (CROP-s)/CROP : 0;
    return MAX * Math.max(0, Math.min(1, 1 - d * KY));
  }
  private fert(kg:number): number { return MAX * (1 - Math.exp(-K * kg)); }
  private plant(dt:string): number {
    const d = new Date(dt + 'T00:00:00Z');
    const o = Date.UTC(d.getUTCFullYear(), OM - 1, OD);
    const p = Math.max(0, Math.abs(d.getTime() - o) / 86400000 - GRACE);
    return Math.max(0, 1 - PEN * p);
  }
}