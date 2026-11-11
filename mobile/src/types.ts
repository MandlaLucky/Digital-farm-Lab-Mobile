export type SoilType = 'sandy' | 'clay' | 'loamy' | 'silt';
export type CropType = 'maize' | 'wheat' | 'soybean' | 'sunflower' | 'vegetables' | 'none';
export type WaterSourceType = 'dam' | 'borehole' | 'river' | 'reservoir';
export type IrrigationType = 'drip' | 'sprinkler' | 'flood' | 'none';
export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'hot';
export type WaterSource = { id: string; type: WaterSourceType; x: number; y: number };
export type FarmField = {
  id: string; name: string; size: number;
  soil: SoilType; crop: CropType; irrigation: IrrigationType;
  x: number; y: number; width: number; height: number;
};
export type FarmConfig = {
  name: string; location: string; totalSize: number;
  fields: FarmField[]; waterSources: WaterSource[];
  weather: WeatherType; temperature: number; humidity: number;
};
export type PersistedFarm = FarmConfig & { id: string };
export type ScenarioRecord = {
  id: string; name: string; description: string; category: string;
  farmId: string; participatingFields: string[];
  crops: { fieldId: string; crop: string }[];
  startingConditions: { soilMoisture: number; temperature: number; rainfall: number; budget: number; pestPressure: number };
  adjustableVariables: string[]; duration: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  learningObjectives: string[];
  source: 'preset' | 'mine';
  fields?: FarmField[];
  waterSources?: WaterSource[];
  weather?: WeatherType;
  temperature?: number;
  humidity?: number;
};
export type EngineOutput = { yieldTha: number; waterUseM3Ha: number; costPerHa: number; grossMarginPerHa: number; disclaimer: string };
export type RunRecord = {
  id: string; scenarioId?: string; serverId?: string;
  finishedAt: string; complete: boolean;
  farmName: string; scenarioName: string; category: string; difficulty: string;
  duration: number; dayReached: number;
  series: { day: number; moisture: number; growth: number; water: number }[];
  decisions: { targetMoisture: number; flowRate: number; nitrogen: number };
  metrics: { moisture: number; growth: number; waterUsed: number; yieldTHa: number; stress: number };
  scores: { moisture: number; water: number; nutrients: number; overall: number };
  objectives: { text: string; achieved: boolean }[];
  engineResults?: EngineOutput; engineBaseline?: EngineOutput;
  details?: any;
};
export const emptyFarm: FarmConfig = {
  name: '', location: '', totalSize: 40,
  fields: [], waterSources: [],
  weather: 'clear', temperature: 24, humidity: 62,
};
