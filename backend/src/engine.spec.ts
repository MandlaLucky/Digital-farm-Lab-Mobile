import { ScenarioEngine, NOT_AGRONOMIC_ADVICE, ScenarioParams } from './engine';

describe('ScenarioEngine', () => {
  let engine: ScenarioEngine;
  beforeEach(() => { engine = new ScenarioEngine(); });
  const baseline = (): ScenarioParams => ({ irrigationMm: 550, fertiliserKgHa: 180, plantingDate: '2026-10-15', irrigationReductionPct: 0 });
  const scenario = (irr: number, fert: number, date: string, red = 0): ScenarioParams => ({ irrigationMm: irr, fertiliserKgHa: fert, plantingDate: date, irrigationReductionPct: red });

  test('is deterministic', () => { expect(engine.run(baseline())).toEqual(engine.run(baseline())); });
  test('baseline yield ~6.92', () => { const y = engine.run(baseline()).yieldTha; expect(y).toBeGreaterThanOrEqual(6.85); expect(y).toBeLessThanOrEqual(7.00); });
  test('baseline water 7000', () => { expect(engine.run(baseline()).waterUseM3Ha).toBe(7000); });
  test('baseline cost 12035', () => { expect(engine.run(baseline()).costPerHa).toBe(12035); });
  test('20% reduction lowers yield', () => { expect(engine.run(scenario(440,180,'2026-10-15',20)).yieldTha).toBeLessThan(engine.run(baseline()).yieldTha); });
  test('less water less consumption', () => { expect(engine.run(scenario(440,180,'2026-10-15',20)).waterUseM3Ha).toBeLessThan(7000); });
  test('less fert not more yield', () => { expect(engine.run(scenario(550,50,'2026-10-15')).yieldTha).toBeLessThanOrEqual(engine.run(baseline()).yieldTha); });
  test('zero fert zero yield', () => { expect(engine.run(scenario(550,0,'2026-10-15')).yieldTha).toBe(0); });
  test('max under 8', () => { expect(engine.run(scenario(900,300,'2026-10-15')).yieldTha).toBeLessThanOrEqual(8); });
  test('late planting penalty', () => { expect(engine.run(scenario(550,180,'2026-11-14')).yieldTha).toBeLessThan(engine.run(baseline()).yieldTha); });
  test('disclaimer always present', () => { expect(engine.run(baseline()).disclaimer).toBe(NOT_AGRONOMIC_ADVICE); });
  test('incomplete throws', () => { expect(() => engine.run({ fertiliserKgHa: 180, plantingDate: '2026-10-15', irrigationReductionPct: 0 } as any)).toThrow(/incomplete/); });
});