# deploy.ps1
# Script de despliegue automatizado para Creador de Tarjetas (Ruta Secundaria)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"
$ServerPath = "/var/www/creador_tarjetas"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Iniciando despliegue de Creador de Tarjetas" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compilar Frontend localmente
Write-Host "`n[1/4] Compilando Frontend con ruta base..." -ForegroundColor Yellow
Push-Location frontend
npm run build
Pop-Location

# 2. Asegurar directorios en el servidor y limpiar frontend anterior
Write-Host "`n[2/4] Preparando directorios en el VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p $ServerPath/frontend/dist $ServerPath/backend && rm -rf $ServerPath/frontend/dist/*"

# Subir carpeta dist/ completa
$distFiles = Get-ChildItem -Path frontend/dist | Select-Object -ExpandProperty FullName
scp -r $distFiles "${ServerDest}:$ServerPath/frontend/dist/"

Write-Host "   Verificando assets en servidor..." -ForegroundColor Gray
$assetCount = ssh $ServerDest "ls $ServerPath/frontend/dist/assets/*.js 2>/dev/null | wc -l"
Write-Host "   Assets JS encontrados en servidor: $assetCount" -ForegroundColor Gray

# 3. Desplegar Backend al VPS (excluyendo node_modules)
Write-Host "`n[3/4] Subiendo Backend al VPS..." -ForegroundColor Yellow
# Crear carpeta assets si no existe en el backend local antes de subir
if (-not (Test-Path -Path backend/assets)) { New-Item -ItemType Directory -Path backend/assets }

# Subir directorios del backend
scp -r backend/controllers backend/routes backend/services backend/utils backend/assets "${ServerDest}:$ServerPath/backend/"
# Subir archivos raíz del backend
scp backend/server.js backend/package.json backend/package-lock.json "${ServerDest}:$ServerPath/backend/"

# 4. Instalar dependencias en el servidor, recargar PM2 y restablecer permisos
Write-Host "`n[4/4] Instalando dependencias del backend y recargando PM2..." -ForegroundColor Yellow
ssh $ServerDest "cd $ServerPath/backend && npm install --production"

# Iniciar o recargar el backend en el puerto 3002
ssh $ServerDest "pm2 describe tarjetas-backend > /dev/null && pm2 reload tarjetas-backend || (cd $ServerPath/backend && PORT=3002 pm2 start server.js --name 'tarjetas-backend')"

# Ajustar permisos de archivos en el servidor
ssh $ServerDest "chown -R www-data:www-data $ServerPath && chmod -R 755 $ServerPath"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Despliegue finalizado con éxito!            " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green