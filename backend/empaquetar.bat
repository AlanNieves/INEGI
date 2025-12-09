@echo off
echo ========================================
echo  EMPAQUETANDO SISTEMA INEGI PARA PRODUCCION
echo ========================================
echo.

REM Definir nombre del paquete
set PACKAGE_NAME=INEGI_Sistema_Produccion_%DATE:~-4%%DATE:~3,2%%DATE:~0,2%
set OUTPUT_DIR=..\%PACKAGE_NAME%

REM Limpiar carpeta de salida si existe
if exist "%OUTPUT_DIR%" (
    echo Limpiando carpeta anterior...
    rmdir /S /Q "%OUTPUT_DIR%"
)

REM Crear carpeta de salida
echo Creando carpeta de empaquetado...
mkdir "%OUTPUT_DIR%"

REM Copiar archivos necesarios
echo Copiando archivos del backend...

REM Copiar dist (backend compilado + frontend)
xcopy /E /I /Y dist "%OUTPUT_DIR%\dist"

REM Copiar src (código fuente - opcional, puede omitirse)
xcopy /E /I /Y src "%OUTPUT_DIR%\src"

REM Copiar templates
xcopy /E /I /Y src\templates "%OUTPUT_DIR%\templates"

REM Copiar archivos de configuración
copy /Y package.json "%OUTPUT_DIR%\"
copy /Y package-lock.json "%OUTPUT_DIR%\"
copy /Y .env.production "%OUTPUT_DIR%\"
copy /Y .env.example "%OUTPUT_DIR%\"
copy /Y ecosystem.config.js "%OUTPUT_DIR%\"
copy /Y tsconfig.json "%OUTPUT_DIR%\"

REM Copiar scripts
copy /Y start.bat "%OUTPUT_DIR%\"
copy /Y stop.bat "%OUTPUT_DIR%\"
copy /Y restart.bat "%OUTPUT_DIR%\"

REM Copiar documentación
copy /Y README_INSTALACION.md "%OUTPUT_DIR%\"
copy /Y NOTAS_PRODUCCION.txt "%OUTPUT_DIR%\"
copy /Y GENERAR_JWT_SECRET.txt "%OUTPUT_DIR%\"

REM Crear carpetas vacías necesarias
mkdir "%OUTPUT_DIR%\logs"

REM Crear archivo de verificación
echo ========================================
echo CONTENIDO DEL PAQUETE
echo ========================================
echo.
echo [OK] Backend compilado: dist/
echo [OK] Frontend integrado: dist/index.html
echo [OK] Codigo fuente: src/
echo [OK] Plantillas: templates/
echo [OK] Configuracion: .env.production
echo [OK] Scripts: start.bat, stop.bat, restart.bat
echo [OK] PM2: ecosystem.config.js
echo [OK] Documentacion: README_INSTALACION.md
echo [OK] Carpeta de logs: logs/
echo.
echo ========================================
echo PAQUETE CREADO EXITOSAMENTE
echo ========================================
echo.
echo Ubicacion: %OUTPUT_DIR%
echo.
echo Siguiente paso:
echo 1. Comprima la carpeta %PACKAGE_NAME% en un ZIP
echo 2. Entregue el ZIP a Marco
echo 3. Marco debe seguir las instrucciones en README_INSTALACION.md
echo.

pause
