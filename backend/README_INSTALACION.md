# [MANUAL] MANUAL DE INSTALACIÓN - SISTEMA INEGI
## Guía de Instalación para Servidor de Producción (Windows 11)

---

## [OK] PRE-REQUISITOS

Antes de comenzar, asegúrese de tener instalado:

### 1. Node.js versión 18 o superior
- Descargar desde: https://nodejs.org/
- Verificar instalación abriendo PowerShell o CMD:
  ```
  node --version
  ```
  Debe mostrar algo como: `v18.x.x` o superior

### 2. MongoDB
Puede usar:
- **MongoDB local** instalado en el servidor
- **MongoDB Atlas** (en la nube) - Recomendado para facilidad

---

## [PAQUETE] CONTENIDO DEL PAQUETE

El paquete incluye:
```
backend/
├── dist/              # Frontend compilado (React)
├── src/               # Código fuente del backend
├── templates/         # Plantillas para PDFs (Handlebars)
├── logs/              # Carpeta de logs (PM2)
├── .env.production    # Archivo de configuración
├── ecosystem.config.js # Configuración de PM2
├── start.bat          # Script de inicio
├── stop.bat           # Script de parada
├── restart.bat        # Script de reinicio
└── package.json       # Dependencias del proyecto
```

---

## [INICIO] PASOS DE INSTALACIÓN

### PASO 1: Copiar archivos al servidor

1. Copie toda la carpeta `backend` al servidor Windows 11
2. Ubicación recomendada: `C:\INEGI\Sistema\`
3. La ruta final quedaría: `C:\INEGI\Sistema\backend\`

### PASO 2: Configurar variables de entorno

1. En la carpeta del backend, renombre el archivo:
   ```
   .env.production  →  .env
   ```

2. Abra el archivo `.env` con el Bloc de notas y configure:

   ```env
   # Puerto donde correrá el sistema
   PORT=4000

   # Conexión a MongoDB (IMPORTANTE: Cambie esto)
   MONGO_URI=mongodb://localhost:27017/INEGI_DB
   # O si usa MongoDB Atlas:
   # MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/INEGI_DB

   # Clave secreta para JWT (GENERE UNA NUEVA)
   JWT_SECRET=CAMBIAR_POR_UNA_CLAVE_SEGURA_AQUI

   # URL donde se accederá al sistema
   PUBLIC_BASE_URL=http://localhost:4000
   # O con la IP del servidor:
   # PUBLIC_BASE_URL=http://192.168.1.100:4000

   # Resto de configuraciones (puede dejarlas como están)
   NODE_ENV=production
   LINK_TTL_HOURS=72
   DEBUG_LINKS=0
   ```

3. Guarde el archivo

**[IMPORTANTE] MUY IMPORTANTE:** 
- Cambie `MONGO_URI` con su conexión real a MongoDB
- Genere una clave segura aleatoria para `JWT_SECRET` (puede usar: https://randomkeygen.com/)

### PASO 3: Instalar dependencias

1. Abra PowerShell o CMD como Administrador
2. Navegue a la carpeta del backend:
   ```powershell
   cd C:\INEGI\Sistema\backend
   ```
3. Instale las dependencias de producción:
   ```powershell
   npm install --production
   ```
4. Espere a que termine la instalación (puede tardar unos minutos)

### PASO 4: Instalar PM2 (gestor de procesos)

PM2 mantendrá el sistema funcionando 24/7 y lo reiniciará automáticamente si hay errores.

```powershell
npm install -g pm2
```

### PASO 5: Iniciar el sistema

Ejecute el archivo de inicio:

```powershell
.\start.bat
```

O simplemente haga **doble clic** en `start.bat` desde el explorador de archivos.

El script automáticamente:
- ✅ Verificará que PM2 esté instalado
- ✅ Iniciará el servidor
- ✅ Guardará la configuración para que se ejecute al reiniciar Windows

---

## [ACCESO] ACCEDER AL SISTEMA

Una vez iniciado, el sistema estará disponible en:

- **Desde el mismo servidor:** http://localhost:4000
- **Desde otra computadora en la red:** http://[IP-DEL-SERVIDOR]:4000

Ejemplo: Si la IP del servidor es `192.168.1.50`, acceda con:
```
http://192.168.1.50:4000
```

---

## [CONFIG] COMANDOS ÚTILES

### Ver estado del sistema
```powershell
pm2 status
```

### Ver logs en tiempo real
```powershell
pm2 logs inegi-sistema
```

### Detener el sistema
```powershell
.\stop.bat
```
O:
```powershell
pm2 stop inegi-sistema
```

### Reiniciar el sistema
```powershell
.\restart.bat
```
O:
```powershell
pm2 restart inegi-sistema
```

### Ver uso de CPU y memoria
```powershell
pm2 monit
```

### Eliminar del PM2 (no recomendado)
```powershell
pm2 delete inegi-sistema
```

---

## [AUTO] CONFIGURAR INICIO AUTOMÁTICO AL ENCENDER WINDOWS

Para que el sistema inicie automáticamente cuando encienda el servidor:

```powershell
pm2 startup
```

Siga las instrucciones que aparecen en pantalla.

Luego ejecute:
```powershell
pm2 save
```

---

## [FIREWALL] FIREWALL Y PUERTOS

Si no puede acceder desde otras computadoras:

1. Abra el Firewall de Windows
2. Permita conexiones entrantes en el puerto **4000** (o el que configuró)
3. O ejecute este comando en PowerShell como Administrador:

```powershell
New-NetFirewallRule -DisplayName "INEGI Sistema" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
```

---

## [LOGS] LOGS Y TROUBLESHOOTING

### Ver logs de PM2
```powershell
pm2 logs inegi-sistema
```

### Logs guardados
Los logs se guardan en:
```
C:\INEGI\Sistema\backend\logs\
```

### Si el sistema no inicia

1. Verifique que MongoDB esté corriendo
2. Revise el archivo `.env` (especialmente `MONGO_URI`)
3. Vea los logs: `pm2 logs inegi-sistema`
4. Verifique que el puerto 4000 esté libre: 
   ```powershell
   netstat -ano | findstr :4000
   ```

### Si ve error "Cannot connect to MongoDB"

- Verifique que MongoDB esté corriendo
- Confirme que `MONGO_URI` en `.env` sea correcto
- Pruebe la conexión desde MongoDB Compass

---

## [SOPORTE] SOPORTE

Si tiene problemas con la instalación, revise:

1. Logs de PM2: `pm2 logs`
2. Archivo de configuración: `.env`
3. Estado del servicio: `pm2 status`

---

## [RESUMEN] RESUMEN RÁPIDO

```powershell
# 1. Copiar backend a C:\INEGI\Sistema\
# 2. Renombrar .env.production a .env y configurar
# 3. Instalar dependencias
cd C:\INEGI\Sistema\backend
npm install --production

# 4. Instalar PM2
npm install -g pm2

# 5. Iniciar sistema
.\start.bat

# 6. Verificar
pm2 status
```

---

## [CHECKLIST] CHECK LIST DE INSTALACIÓN

- [ ] Node.js v18+ instalado
- [ ] MongoDB corriendo (local o Atlas)
- [ ] Carpeta backend copiada a `C:\INEGI\Sistema\`
- [ ] Archivo `.env` configurado correctamente
- [ ] Dependencias instaladas (`npm install --production`)
- [ ] PM2 instalado globalmente
- [ ] Sistema iniciado con `start.bat`
- [ ] Verificado con `pm2 status`
- [ ] Acceso exitoso desde navegador
- [ ] Firewall configurado (si es necesario)
- [ ] PM2 configurado para inicio automático

---

**Fecha de instalación:** _____________

**Instalado por:** _____________

**Versión del sistema:** 1.0.0

**Contacto soporte:** _____________
