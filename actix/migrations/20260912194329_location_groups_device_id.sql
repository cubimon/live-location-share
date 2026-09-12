ALTER TABLE location_groups
ADD COLUMN IF NOT EXISTS device_id VARCHAR(32);

WITH group_device AS (
  SELECT MIN(device_id) AS device_id, group_id
  FROM user_locations
  WHERE group_id IS NOT NULL
  GROUP BY group_id
)
UPDATE location_groups AS lg
SET device_id = gd.device_id
FROM group_device AS gd
where gd.group_id = lg.id;
