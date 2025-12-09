@echo off
echo ========================================
echo    INICIANDO SISTEMA INEGI
echo ========================================
echo.

REM Verificar si PM2 está instalado
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PM2 no esta instalado.
    echo Instalando PM2 globalmente...
    call npm install -g pm2
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] No se pudo instalar PM2.
        pause
        exit /b 1
    )
)

REM Iniciar la aplicación con PM2
echo Iniciando aplicacion...
call pm2 start ecosystem.config.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo iniciar la aplicacion.
    pause
    exit /b 1
)

REM Guardar configuración de PM2
echo Guardando configuracion de PM2...
call pm2 save

echo.
echo ========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo Ver estado: pm2 status
echo Ver logs:   pm2 logs inegi-sistema
echo Detener:    ejecutar stop.bat
echo.

REM Mostrar el estado
call pm2 status

pause
