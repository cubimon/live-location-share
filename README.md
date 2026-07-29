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
