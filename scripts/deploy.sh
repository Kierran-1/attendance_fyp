#!/bin/bash
docker compose down
docker compose up -d --build
echo "Deployment successful!"