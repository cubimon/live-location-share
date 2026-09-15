build:
	docker build --no-cache . -t live-location-share
run:
	docker run -p 8080:8080 -v .env:/app/.env:ro live-location-share
logs:
	sudo docker logs live-location-share-container
