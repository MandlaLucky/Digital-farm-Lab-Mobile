-- V10: enrich every scenario's metadata with the actual field + water + weather
-- snapshot of the farm it belongs to.

UPDATE scenarios s
SET metadata = jsonb_set(
  COALESCE(s.metadata, '{}'::jsonb),
  '{fields}',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', f.id, 'name', f.name, 'size', f.area_ha::float,
        'soil', lower(f.soil_type),
        'crop', COALESCE(
          (SELECT lower(elem->>'crop')
           FROM jsonb_array_elements(COALESCE(s.metadata->'crops', '[]'::jsonb)) AS elem
           WHERE elem->>'fieldId' = f.id::text LIMIT 1),
          lower(f.crop_code)
        ),
        'irrigation', 'none',
        'x', 8.0, 'y', 10.0, 'width', 24.0, 'height', 30.0
      ) ORDER BY f.name
    )
    FROM fields f
    WHERE f.farm_id = (SELECT farm_id FROM fields WHERE id = s.field_id)
  )
)
WHERE s.metadata->'fields' IS NULL
  AND s.field_id IS NOT NULL;

-- Fixed: s.metadata (was ambiguous with farms.metadata)
UPDATE scenarios s
SET metadata = s.metadata
  || jsonb_build_object('waterSources', COALESCE(fa.metadata->'waterSources', '[]'::jsonb))
  || jsonb_build_object('weather',     COALESCE(fa.metadata->>'weather', 'clear'))
  || jsonb_build_object('temperature', COALESCE(fa.metadata->'temperature', '24'::jsonb))
  || jsonb_build_object('humidity',    COALESCE(fa.metadata->'humidity', '62'::jsonb))
FROM farms fa
WHERE fa.id = (SELECT farm_id FROM fields WHERE id = s.field_id)
  AND s.metadata->'waterSources' IS NULL;