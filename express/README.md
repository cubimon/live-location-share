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
  -d "id=31063742" \
  -d "lat=49.1701402" \
  -d "lon=9.1976332" \
  -d "timestamp=1785271758" \
  -d "accuracy=14.232999801635742" \
  -d "altitude=236.3000030517578" \
  -d "batt=74" \
  -d "charge=false"

curl -X POST http://cubimon:usersharepassword@live-location-share.cubimon.dedyn.io/log \
  -d "id=31063742" \
  -d "lat=49.1701402" \
  -d "lon=9.1976332" \
  -d "timestamp=1785271758" \
  -d "accuracy=14.232999801635742" \
  -d "altitude=236.3000030517578" \
  -d "batt=74" \
  -d "charge=false"

header: {"accept":"*/*","user-agent":"ktor-client","content-type":"application/x-www-form-urlencoded; charset=UTF-8","content-length":"137","host":"192.168.0.16:8080","connection":"Keep-Al
ive","accept-encoding":"gzip"}
body: {"id":"31063742","lat":"49.1701402","lon":"9.1976332","timestamp":"1785271758","accuracy":"14.232999801635742","altitude":"236.3000030517578","batt":"74","charge":"false"}
query: {}
```
