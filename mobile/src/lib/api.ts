const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8082';
const TOKEN = process.env.EXPO_PUBLIC_SPRING_DEV_TOKEN || '';

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`${res.status} ${res.statusText}: ${t.slice(0, 200)}`); }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type EngineOutput = { yieldTha: number; waterUseM3Ha: number; costPerHa: number; grossMarginPerHa: number; disclaimer: string };
export type BackendFarm = Record<string, any> & { id: string };
export type BackendScenario = Record<string, any> & { id: string };
export type BackendRun = { id: string; scenarioId: string; results: EngineOutput; baseline: EngineOutput; createdAt: string };
export type TrainerExercise = { exerciseId: string; moduleCode: string; title: string; passScore: number; submissionCount: number; uniqueLearners: number; averageScore: number; learnerPassRate: number };
export type TrainerReport = {
  exerciseId: string; moduleCode: string; title: string; prompt: string; passScore: number;
  statistics: { submissionCount: number; uniqueLearners: number; passedSubmissions: number; passedLearners: number; averageScore: number; minScore: number; medianScore: number; maxScore: number; submissionPassRate: number; learnerPassRate: number; rubricDriftCount: number };
  distribution: Array<{ range: string; lowerBound: number; upperBound: number; meetsPassThreshold: boolean; count: number }>;
  criteria: Array<{ key: string; label: string; weight: number; totalEvaluations: number; satisfied: number; satisfactionRate: number }>;
  recentSubmissions: Array<{ submissionId: string; userId: string; displayName: string | null; score: number; passed: boolean; createdAt: string }>;
};

export const api = {
  listFarms: () => req<BackendFarm[]>('/api/v1/workspace/farms'),
  createFarm: (b: any) => req<BackendFarm>('/api/v1/workspace/farms', { method: 'POST', body: JSON.stringify(b) }),
  updateFarm: (id: string, b: any) => req<BackendFarm>(`/api/v1/workspace/farms/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteFarm: (id: string) => req<void>(`/api/v1/workspace/farms/${id}`, { method: 'DELETE' }),
  listScenarios: () => req<BackendScenario[]>('/api/v1/workspace/scenarios'),
  createScenario: (b: any) => req<BackendScenario>('/api/v1/workspace/scenarios', { method: 'POST', body: JSON.stringify(b) }),
  updateScenario: (id: string, b: any) => req<BackendScenario>(`/api/v1/workspace/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteScenario: (id: string) => req<void>(`/api/v1/workspace/scenarios/${id}`, { method: 'DELETE' }),
  listRuns: () => req<BackendRun[]>('/api/v1/workspace/runs'),
  createRun: (b: any) => req<BackendRun>('/api/v1/workspace/runs', { method: 'POST', body: JSON.stringify(b) }),
  listPresets: () => req<BackendScenario[]>('/api/v1/workspace/presets'),
  getDemoFarm: () => req<BackendFarm>('/api/v1/workspace/demo-farm'),
  listExercises: () => req<Array<{ id: string; moduleCode: string; title: string; prompt: string; passScore: number }>>('/api/v1/exercises'),
  submitExercise: (id: string, data: { runId: string; reflection: string }) => req<{ id: string; runId: string; score: number; passed: boolean; passScore: number; breakdown: Array<{ key: string; label: string; weight: number; earned: number; satisfied: boolean }>; createdAt: string }>(`/api/v1/exercises/${id}/submissions`, { method: 'POST', body: JSON.stringify(data) }),
  trainerListExercises: () => req<TrainerExercise[]>('/api/v1/trainer/exercises'),
  trainerExerciseReport: (id: string) => req<TrainerReport>(`/api/v1/trainer/exercises/${id}/report`),
  sensorReadings: (fieldId: string) => req<{ fieldId: string; count: number; readings: Array<{ id: number; type: string; value: number; recordedAt: string }> }>(`/api/v1/fields/${fieldId}/sensor-readings`),
  demoRun: (b: any) => req<{ scenario: EngineOutput; baseline: EngineOutput }>('/api/v1/demo/run', { method: 'POST', body: JSON.stringify(b) }),
};

export function toFarm(raw: BackendFarm): import('../types').PersistedFarm {
  const r = raw as any;
  return {
    id: String(r.id || ''),
    name: String(r.name || 'Unnamed farm'),
    location: String(r.location || 'Unknown'),
    totalSize: Number(r.totalSize || 40),
    fields: Array.isArray(r.fields) ? r.fields : [],
    waterSources: Array.isArray(r.waterSources) ? r.waterSources : [],
    weather: r.weather || 'clear',
    temperature: Number(r.temperature ?? 24),
    humidity: Number(r.humidity ?? 62),
  };
}

export function toScenarioRecord(raw: BackendScenario): import('../types').ScenarioRecord {
  const r = raw as any;
  return {
    id: String(r.id || ''),
    name: String(r.name || 'Unnamed scenario'),
    description: String(r.description || ''),
    category: r.category || 'Irrigation Scheduling',
    farmId: String(r.farmId || ''),
    participatingFields: Array.isArray(r.participatingFields) ? r.participatingFields : [],
    crops: Array.isArray(r.crops) ? r.crops : [],
    startingConditions: r.startingConditions || { soilMoisture: 55, temperature: 24, rainfall: 8, budget: 25000, pestPressure: 5 },
    adjustableVariables: Array.isArray(r.adjustableVariables) ? r.adjustableVariables : [],
    duration: Number(r.duration ?? 120),
    difficulty: r.difficulty || 'Intermediate',
    learningObjectives: Array.isArray(r.learningObjectives) ? r.learningObjectives : [],
    source: 'preset',
  };
}
