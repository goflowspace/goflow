#!/bin/bash

echo "========================================"
echo "  Starting Go Flow (OSS Edition)"
echo "========================================"
echo ""

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверяем что Docker daemon запущен
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running. Please start Docker."
    exit 1
fi

echo "Building and starting containers..."
docker compose up -d --build

echo ""
echo "========================================"
echo "  Go Flow is starting..."
echo "========================================"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "  It may take a minute for all services to be ready."
echo "  Use 'docker compose logs -f' to watch the logs."
echo "========================================"
