FROM alpine:latest
WORKDIR /app

# Copy static binary
COPY ./target/x86_64-unknown-linux-musl/release/live-location-share ./app
# Copy external asset folder
COPY ./static ./static

CMD ["./app"]

