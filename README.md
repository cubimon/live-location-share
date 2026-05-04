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
    ADD COLUMN speed NUMERIC,
    ADD COLUMN battery NUMERIC,
    ADD COLUMN accuracy NUMERIC,
    ADD COLUMN device_id VARCHAR(32);
```
