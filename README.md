# Live location share

Initial database setup:

```bash
createdb droid
psql droid
```

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE ROLE droid WITH LOGIN;
GRANT USAGE ON SCHEMA public TO droid;
GRANT CREATE ON SCHEMA public TO droid;
SET ROLE droid;

CREATE TABLE user_locations (
    user_id VARCHAR(50),
    geom GEOGRAPHY(Point, 4326),
    updated_at TIMESTAMP
);

ALTER TABLE user_locations
    ADD COLUMN IF NOT EXISTS speed NUMERIC,
    ADD COLUMN IF NOT EXISTS battery NUMERIC,
    ADD COLUMN IF NOT EXISTS accuracy NUMERIC,
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(32);
```
