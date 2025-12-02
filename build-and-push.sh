#!/bin/bash
# Script para build e push das imagens Docker para Docker Hub
# Uso: ./build-and-push.sh [version]
# Exemplo: ./build-and-push.sh 1.0.0

DOCKER_USER="seu-usuario-dockerhub"
VERSION="${1:-latest}"

echo "========================================"
echo " S3E System PRO - Build e Push Docker"
echo "========================================"
echo ""
echo "Docker User: $DOCKER_USER"
echo "Version: $VERSION"
echo ""

# Verificar se está logado no Docker Hub
echo "Verificando login no Docker Hub..."
if ! docker info > /dev/null 2>&1; then
    echo "ERRO: Docker não está rodando ou você não está logado!"
    echo "Execute: docker login"
    exit 1
fi

echo ""
echo "[1/4] Building Backend Image..."
docker build -t "${DOCKER_USER}/s3e-backend:${VERSION}" \
  --target production \
  -f backend/Dockerfile \
  ./backend

if [ $? -ne 0 ]; then
    echo "ERRO: Build do backend falhou!"
    exit 1
fi

echo ""
echo "[2/4] Building Frontend Image..."
docker build -t "${DOCKER_USER}/s3e-frontend:${VERSION}" \
  --target production \
  --build-arg VITE_API_URL=http://192.168.100.228:3001 \
  -f frontend/Dockerfile \
  ./frontend

if [ $? -ne 0 ]; then
    echo "ERRO: Build do frontend falhou!"
    exit 1
fi

echo ""
echo "[3/4] Pushing Backend Image..."
docker push "${DOCKER_USER}/s3e-backend:${VERSION}"

if [ $? -ne 0 ]; then
    echo "ERRO: Push do backend falhou!"
    exit 1
fi

echo ""
echo "[4/4] Pushing Frontend Image..."
docker push "${DOCKER_USER}/s3e-frontend:${VERSION}"

if [ $? -ne 0 ]; then
    echo "ERRO: Push do frontend falhou!"
    exit 1
fi

echo ""
echo "========================================"
echo " Build e Push Concluídos com Sucesso!"
echo "========================================"
echo ""
echo "Imagens publicadas:"
echo "  - ${DOCKER_USER}/s3e-backend:${VERSION}"
echo "  - ${DOCKER_USER}/s3e-frontend:${VERSION}"
echo ""
echo "Para usar no TrueNAS Scale, use:"
echo "  - ${DOCKER_USER}/s3e-backend:${VERSION}"
echo "  - ${DOCKER_USER}/s3e-frontend:${VERSION}"
echo ""

