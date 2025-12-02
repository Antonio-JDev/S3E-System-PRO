@echo off
REM Script para build e push das imagens Docker para Docker Hub
REM Uso: build-and-push.bat [version]
REM Exemplo: build-and-push.bat 1.0.0

set DOCKER_USER=seu-usuario-dockerhub
set VERSION=%1
if "%VERSION%"=="" set VERSION=latest

echo ========================================
echo  S3E System PRO - Build e Push Docker
echo ========================================
echo.
echo Docker User: %DOCKER_USER%
echo Version: %VERSION%
echo.

REM Verificar se está logado no Docker Hub
echo Verificando login no Docker Hub...
docker info >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker nao esta rodando ou voce nao esta logado!
    echo Execute: docker login
    pause
    exit /b 1
)

echo.
echo [1/4] Building Backend Image...
docker build -t %DOCKER_USER%/s3e-backend:%VERSION% ^
  --target production ^
  -f backend/Dockerfile ^
  ./backend

if errorlevel 1 (
    echo ERRO: Build do backend falhou!
    pause
    exit /b 1
)

echo.
echo [2/4] Building Frontend Image...
docker build -t %DOCKER_USER%/s3e-frontend:%VERSION% ^
  --target production ^
  --build-arg VITE_API_URL=http://192.168.100.228:3001 ^
  -f frontend/Dockerfile ^
  ./frontend

if errorlevel 1 (
    echo ERRO: Build do frontend falhou!
    pause
    exit /b 1
)

echo.
echo [3/4] Pushing Backend Image...
docker push %DOCKER_USER%/s3e-backend:%VERSION%

if errorlevel 1 (
    echo ERRO: Push do backend falhou!
    pause
    exit /b 1
)

echo.
echo [4/4] Pushing Frontend Image...
docker push %DOCKER_USER%/s3e-frontend:%VERSION%

if errorlevel 1 (
    echo ERRO: Push do frontend falhou!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Build e Push Concluidos com Sucesso!
echo ========================================
echo.
echo Imagens publicadas:
echo   - %DOCKER_USER%/s3e-backend:%VERSION%
echo   - %DOCKER_USER%/s3e-frontend:%VERSION%
echo.
echo Para usar no TrueNAS Scale, use:
echo   - %DOCKER_USER%/s3e-backend:%VERSION%
echo   - %DOCKER_USER%/s3e-frontend:%VERSION%
echo.
pause

