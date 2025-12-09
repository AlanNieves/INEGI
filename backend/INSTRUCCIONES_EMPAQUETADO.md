# [PACK] CÓMO EMPAQUETAR Y ENTREGAR EL SISTEMA

## OPCIÓN 1: Usar el script automático (RECOMENDADO)

1. Ejecute el archivo `empaquetar.bat` (doble clic o desde PowerShell)
2. El script creará automáticamente una carpeta con todo lo necesario
3. Comprima esa carpeta en formato ZIP
4. Entregue el ZIP a Marco

```powershell
# Ejecutar
.\empaquetar.bat

# Resultado: carpeta INEGI_Sistema_Produccion_YYYYMMDD
# Comprimir esa carpeta en ZIP
```

---

## OPCIÓN 2: Manual paso a paso

### PASO 1: Preparar carpeta limpia

Cree una nueva carpeta:
```
INEGI_Sistema_Produccion
```

### PASO 2: Copiar archivos esenciales

Copie a la nueva carpeta:

**Carpetas:**
- [OK] `dist/` - Backend + Frontend compilados
- [OK] `src/` - Código fuente (opcional)
- [OK] `templates/` - Plantillas HBS
- [OK] `logs/` - Carpeta vacía (créela si no existe)

**Archivos de configuración:**
- [OK] `package.json`
- [OK] `package-lock.json`
- [OK] `.env.production`
- [OK] `.env.example`
- [OK] `ecosystem.config.js`
- [OK] `tsconfig.json`

**Scripts:**
- [OK] `start.bat`
- [OK] `stop.bat`
- [OK] `restart.bat`

**Documentación:**
- [OK] `README_INSTALACION.md`
- [OK] `NOTAS_PRODUCCION.txt`
- [OK] `GENERAR_JWT_SECRET.txt`
- [OK] `CHECKLIST_ENTREGA.md`

### PASO 3: NO copiar

[X] `node_modules/` - Marco los instalará
[X] `.env` - Contiene tus credenciales de desarrollo
[X] `.git/` - No es necesario
[X] `tmp/` - Archivos temporales
[X] Carpetas de frontend (React ya está compilado en dist/)

### PASO 4: Verificar contenido

La estructura final debe ser:

```
INEGI_Sistema_Produccion/
├── dist/
│   ├── api/
│   ├── server.js
│   ├── index.html
│   └── assets/
├── src/
├── templates/
├── logs/
├── package.json
├── .env.production
├── ecosystem.config.js
├── start.bat
├── stop.bat
├── restart.bat
└── README_INSTALACION.md
```

### PASO 5: Comprimir

En Windows:
1. Click derecho en la carpeta `INEGI_Sistema_Produccion`
2. "Enviar a" → "Carpeta comprimida"
3. O usar 7-Zip / WinRAR

En PowerShell:
```powershell
Compress-Archive -Path "INEGI_Sistema_Produccion" -DestinationPath "INEGI_Sistema_Produccion.zip"
```

---

## [VERIFICACION] VERIFICACIÓN ANTES DE ENTREGAR

Abra el ZIP y verifique que contenga:

- [x] Carpeta `dist/` con archivos .js y index.html
- [x] Archivo `start.bat`
- [x] Archivo `README_INSTALACION.md`
- [x] Archivo `.env.production`
- [x] Archivo `ecosystem.config.js`
- [x] Carpeta `templates/` con archivos .hbs
- [x] NO contiene carpeta `node_modules/`
- [x] NO contiene archivo `.env` con tus credenciales

---

## [EMAIL] INFORMACIÓN PARA ENVIAR A MARCO

Junto con el ZIP, envíele este mensaje:

---

**Asunto:** Sistema INEGI - Paquete de Producción

Hola Marco,

Te envío el paquete completo del Sistema INEGI listo para instalación en producción.

**Contenido del archivo ZIP:**
- Backend compilado + Frontend integrado
- Scripts de inicio/parada automáticos
- Manual de instalación completo
- Configuraciones de PM2

**Pasos de instalación (resumen):**

1. Instalar Node.js v18 o superior
2. Tener MongoDB corriendo
3. Descomprimir el ZIP en `C:\INEGI\Sistema\`
4. Renombrar `.env.production` a `.env`
5. Editar `.env` con tu MONGO_URI y JWT_SECRET
6. Ejecutar: `npm install --production`
7. Ejecutar: `npm install -g pm2`
8. Ejecutar: `start.bat`
9. Acceder: http://localhost:4000

**IMPORTANTE:**
- Debes cambiar MONGO_URI en el archivo .env
- Debes generar un JWT_SECRET seguro (instrucciones incluidas)
- Si necesitas acceso desde otras PCs, configura el firewall para el puerto 4000

**Documentación completa:**
Ver archivo `README_INSTALACION.md` incluido en el paquete.

**Soporte:**
Si tienes algún problema durante la instalación, avísame.

Saludos

---

## [ENTREGA] ENTREGA FINAL

**Archivo a entregar:**
```
INEGI_Sistema_Produccion.zip
```

**Tamaño aproximado:** 
- Sin node_modules: ~5-15 MB
- Con node_modules incluidos (no recomendado): ~200-400 MB

**Método de entrega:**
- Email (si es < 25 MB)
- Google Drive / OneDrive
- WeTransfer
- USB

---

## [CHECKLIST] CHECKLIST FINAL

Antes de enviar:

- [ ] Frontend compilado correctamente
- [ ] Backend compilado sin errores
- [ ] Archivos copiados a carpeta limpia
- [ ] ZIP creado
- [ ] ZIP probado (extraer y verificar contenido)
- [ ] README_INSTALACION.md incluido
- [ ] .env.production incluido (NO .env)
- [ ] Scripts .bat incluidos
- [ ] Mensaje de email preparado

---

**[OK] ¡Listo para entregar!**
