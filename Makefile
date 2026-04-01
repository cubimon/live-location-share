build:
	sudo docker build . -t live-location-share
start:
	sudo docker run -d -p 3000:3000 --name live-location-share-container live-location-share
logs:
	sudo docker logs live-location-share-container
