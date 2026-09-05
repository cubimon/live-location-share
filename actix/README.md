# Live location share

```bash
cargo run
```

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
```

