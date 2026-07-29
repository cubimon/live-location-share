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
```

the tables are created on startup, see `migrations.js`

```bash
curl -X POST http://cubimon:secret@localhost:8080/log \
  -d "id=3" \
  -d "lat=50.0" \
  -d "lon=10.0" \
  -d "timestamp=1785200000" \
  -d "accuracy=15.0" \
  -d "altitude=200.0" \
  -d "batt=74" \
  -d "charge=false"

```
