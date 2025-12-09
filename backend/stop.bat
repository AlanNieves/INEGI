@echo off
echo ========================================
echo    DETENIENDO SISTEMA INEGI
echo ========================================
echo.

REM Verificar si PM2 está instalado
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PM2 no esta instalado.
    pause
    exit /b 1
)

REM Detener la aplicación
echo Deteniendo aplicacion...
call pm2 stop inegi-sistema
if %ERRORLEVEL% NEQ 0 (
    echo [ADVERTENCIA] La aplicacion podria no estar en ejecucion.
)

echo.
echo ========================================
echo   SISTEMA DETENIDO
echo ========================================
echo.
echo Para volver a iniciar: ejecutar start.bat
echo Para eliminar del PM2: pm2 delete inegi-sistema
echo.

pause
