@echo off
echo ========================================
echo    REINICIANDO SISTEMA INEGI
echo ========================================
echo.

REM Verificar si PM2 está instalado
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PM2 no esta instalado.
    pause
    exit /b 1
)

REM Reiniciar la aplicación
echo Reiniciando aplicacion...
call pm2 restart inegi-sistema
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo reiniciar la aplicacion.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SISTEMA REINICIADO CORRECTAMENTE
echo ========================================
echo.

REM Mostrar el estado
call pm2 status

pause
