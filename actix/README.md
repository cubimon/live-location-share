# Live location share

```bash
# run locally
cargo run
# build release
paru -S musl
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl
docker build . -t live-location-share
# or
make build
make run
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

