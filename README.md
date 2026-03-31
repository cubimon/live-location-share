# Live location share

Initial database setup:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE user_locations (
    user_id VARCHAR(50) PRIMARY KEY,
    geom GEOGRAPHY(Point, 4326),
    updated_at TIMESTAMP
);
```
