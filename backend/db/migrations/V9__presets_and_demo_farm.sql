-- V9: real preset scenarios + real demo farm

ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS is_preset BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Remove any stale demo farm + its fields (idempotent)
DELETE FROM fields WHERE farm_id IN (SELECT id FROM farms WHERE is_demo = TRUE);
DELETE FROM scenarios WHERE is_preset = TRUE;
DELETE FROM farms WHERE is_demo = TRUE;

-- Seed demo farm (Sunridge) owned by Lerato
INSERT INTO farms (id, owner_id, name, province, total_ha, is_demo, metadata) VALUES
  ('a0000000-0000-0000-0000-0000000000d0'::uuid,
   '11111111-1111-1111-1111-111111111111'::uuid,
   'Sunridge Demo Farm', 'Free State', 40.00, TRUE,
   '{"location":"Free State, South Africa","weather":"clear","temperature":24,"humidity":58,"isDemo":true,"waterSources":[{"id":"w1","type":"dam","x":78,"y":68},{"id":"w2","type":"borehole","x":78,"y":14}]}'::jsonb);

INSERT INTO fields (id, farm_id, name, area_ha, soil_type, crop_code, planting_date) VALUES
  ('a0000000-0000-0000-0000-0000000000f1'::uuid, 'a0000000-0000-0000-0000-0000000000d0'::uuid, 'Field A', 12.00, 'loamy', 'MAIZE',   DATE '2026-10-15'),
  ('a0000000-0000-0000-0000-0000000000f2'::uuid, 'a0000000-0000-0000-0000-0000000000d0'::uuid, 'Field B', 10.00, 'clay',  'WHEAT',   DATE '2026-10-15'),
  ('a0000000-0000-0000-0000-0000000000f3'::uuid, 'a0000000-0000-0000-0000-0000000000d0'::uuid, 'Field C', 8.00,  'sandy', 'SOYBEAN', DATE '2026-10-15');

-- Seed 8 preset scenarios
INSERT INTO scenarios (id, field_id, created_by, name, params, is_preset, metadata) VALUES
('a0000000-0000-0000-0000-000000000101'::uuid, 'a0000000-0000-0000-0000-0000000000f1'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Dry Season Survival',
 '{"irrigationMm":400,"fertiliserKgHa":180,"plantingDate":"2026-10-15","irrigationReductionPct":27}'::jsonb, TRUE,
 '{"description":"A hot, rain-free season with a shrinking dam. Keep crops alive while using as little water as possible.","category":"Drought Management","difficulty":"Intermediate","duration":120,"adjustableVariables":["Irrigation volume","Irrigation interval"],"learningObjectives":["Prioritise limited water across fields.","Recognise early signs of crop water stress."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f1"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f1","crop":"maize"}],"startingConditions":{"soilMoisture":30,"temperature":33,"rainfall":0,"budget":25000,"pestPressure":5}}'::jsonb),

('a0000000-0000-0000-0000-000000000102'::uuid, 'a0000000-0000-0000-0000-0000000000f1'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Smart Irrigation Calendar',
 '{"irrigationMm":500,"fertiliserKgHa":180,"plantingDate":"2026-10-15","irrigationReductionPct":9}'::jsonb, TRUE,
 '{"description":"Design an irrigation schedule that holds soil moisture near target without wasting water.","category":"Irrigation Scheduling","difficulty":"Beginner","duration":90,"adjustableVariables":["Irrigation volume","Irrigation interval"],"learningObjectives":["Match irrigation timing to crop growth stage.","Balance moisture stability against water use."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f1"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f1","crop":"maize"}],"startingConditions":{"soilMoisture":55,"temperature":24,"rainfall":8,"budget":25000,"pestPressure":5}}'::jsonb),

('a0000000-0000-0000-0000-000000000103'::uuid, 'a0000000-0000-0000-0000-0000000000f2'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Sand vs Clay',
 '{"irrigationMm":550,"fertiliserKgHa":180,"plantingDate":"2026-10-15","irrigationReductionPct":0}'::jsonb, TRUE,
 '{"description":"Compare how sandy and clay soils hold water and respond to the same management.","category":"Soil Type Comparison","difficulty":"Beginner","duration":100,"adjustableVariables":["Irrigation volume","Crop variety"],"learningObjectives":["Explain how soil texture affects water retention."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f2"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f2","crop":"wheat"}],"startingConditions":{"soilMoisture":55,"temperature":24,"rainfall":8,"budget":25000,"pestPressure":5}}'::jsonb),

('a0000000-0000-0000-0000-000000000104'::uuid, 'a0000000-0000-0000-0000-0000000000f1'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Late Frost Surprise',
 '{"irrigationMm":550,"fertiliserKgHa":180,"plantingDate":"2026-09-15","irrigationReductionPct":0}'::jsonb, TRUE,
 '{"description":"Unseasonal weather swings test your planting decisions and contingency planning.","category":"Changing Weather","difficulty":"Advanced","duration":150,"adjustableVariables":["Planting date","Crop variety","Labour budget"],"learningObjectives":["Adapt management to changing forecasts.","Weigh risk against yield potential."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f1"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f1","crop":"maize"}],"startingConditions":{"soilMoisture":55,"temperature":12,"rainfall":20,"budget":25000,"pestPressure":5}}'::jsonb),

('a0000000-0000-0000-0000-000000000105'::uuid, 'a0000000-0000-0000-0000-0000000000f1'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Nitrogen Balancing Act',
 '{"irrigationMm":550,"fertiliserKgHa":240,"plantingDate":"2026-10-15","irrigationReductionPct":0}'::jsonb, TRUE,
 '{"description":"Find the fertiliser rate that maximises yield before returns diminish and costs rise.","category":"Fertiliser Management","difficulty":"Intermediate","duration":110,"adjustableVariables":["Fertiliser rate","Irrigation volume"],"learningObjectives":["Identify the point of diminishing returns for nitrogen.","Link fertiliser rate to input cost."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f1"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f1","crop":"maize"}],"startingConditions":{"soilMoisture":55,"temperature":24,"rainfall":8,"budget":25000,"pestPressure":5}}'::jsonb),

('a0000000-0000-0000-0000-000000000106'::uuid, 'a0000000-0000-0000-0000-0000000000f1'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Drowned Roots',
 '{"irrigationMm":700,"fertiliserKgHa":180,"plantingDate":"2026-10-15","irrigationReductionPct":0}'::jsonb, TRUE,
 '{"description":"The farm starts over-watered. Recover the crop and understand the cost of too much water.","category":"Over-irrigation","difficulty":"Beginner","duration":80,"adjustableVariables":["Irrigation volume","Irrigation interval"],"learningObjectives":["Describe the effects of waterlogging on crops."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f1"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f1","crop":"maize"}],"startingConditions":{"soilMoisture":80,"temperature":24,"rainfall":8,"budget":25000,"pestPressure":5}}'::jsonb),

('a0000000-0000-0000-0000-000000000107'::uuid, 'a0000000-0000-0000-0000-0000000000f3'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Armyworm Alert',
 '{"irrigationMm":550,"fertiliserKgHa":180,"plantingDate":"2026-10-15","irrigationReductionPct":0}'::jsonb, TRUE,
 '{"description":"Pest pressure is climbing. Decide when and how much to spray without wrecking your budget.","category":"Pest Outbreak","difficulty":"Intermediate","duration":90,"adjustableVariables":["Pesticide use","Labour budget"],"learningObjectives":["Time interventions using pest thresholds.","Balance chemical use and cost."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f3"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f3","crop":"soybean"}],"startingConditions":{"soilMoisture":55,"temperature":24,"rainfall":8,"budget":25000,"pestPressure":35}}'::jsonb),

('a0000000-0000-0000-0000-000000000108'::uuid, 'a0000000-0000-0000-0000-0000000000f1'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Three-Season Rotation',
 '{"irrigationMm":550,"fertiliserKgHa":180,"plantingDate":"2026-10-15","irrigationReductionPct":0}'::jsonb, TRUE,
 '{"description":"Plan a rotation across your fields to rebuild soil and spread risk over several seasons.","category":"Crop Rotation","difficulty":"Advanced","duration":365,"adjustableVariables":["Crop variety","Planting date","Fertiliser rate"],"learningObjectives":["Explain how rotation improves soil health.","Plan crops to reduce disease and pest build-up."],"source":"preset","farmId":"a0000000-0000-0000-0000-0000000000d0","participatingFields":["a0000000-0000-0000-0000-0000000000f1"],"crops":[{"fieldId":"a0000000-0000-0000-0000-0000000000f1","crop":"maize"}],"startingConditions":{"soilMoisture":55,"temperature":24,"rainfall":8,"budget":25000,"pestPressure":5}}'::jsonb)
ON CONFLICT (id) DO NOTHING;