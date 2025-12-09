# [INICIO RAPIDO] INICIO RÁPIDO - 5 MINUTOS

Si tienes prisa y quieres instalar YA, sigue estos pasos. Para detalles completos, ve a README_INSTALACION.md

---

## [OK] PRE-REQUISITOS

- [ ] Windows 11 [OK] (ya lo tienes)
- [ ] Node.js v18+ (instalar desde: https://nodejs.org)
- [ ] MongoDB corriendo (local o Atlas)

---

## [INICIO] INSTALACIÓN EXPRESS

### [1] Copiar archivos
```
Descomprime el ZIP en: C:\INEGI\Sistema\
```

### [2] Configurar
```powershell
# Renombrar archivo de configuración
cd C:\INEGI\Sistema
ren .env.production .env

# Editar .env con Bloc de notas
notepad .env
```

**Cambiar estos 3 valores en .env:**
- `MONGO_URI=` → Tu conexión a MongoDB
- `JWT_SECRET=` → Una clave aleatoria de 64 caracteres
- `PUBLIC_BASE_URL=` → http://localhost:4000 (o tu IP)

### [3] Instalar
```powershell
# Instalar dependencias
npm install --production

# Instalar PM2 (gestor de procesos)
npm install -g pm2
```

### [4] Iniciar
```powershell
# Iniciar el sistema
.\start.bat
```

### [5] Verificar
```
Abrir navegador en: http://localhost:4000
```

---

## [COMANDOS] COMANDOS ESENCIALES

```powershell
.\start.bat          # Iniciar sistema
.\stop.bat           # Detener sistema
.\restart.bat        # Reiniciar sistema
pm2 logs             # Ver logs
pm2 status           # Ver estado
```

---

## [IMPORTANTE] SI ALGO FALLA

### MongoDB no conecta
```
[OK] Verifica que MongoDB esté corriendo
[OK] Revisa MONGO_URI en .env
[OK] Prueba la conexión con MongoDB Compass
```

### Puerto ocupado
```
[OK] Verifica que el puerto 4000 esté libre:
  netstat -ano | findstr :4000
[OK] Cambia PORT en .env a otro número (ej: 5000)
```

### No accede desde otras PCs
```
[OK] Configura firewall:
  PowerShell como Admin:
  New-NetFirewallRule -DisplayName "INEGI" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
```

---

## [DOCS] DOCUMENTACIÓN COMPLETA

- **Manual detallado:** README_INSTALACION.md
- **Generar JWT_SECRET:** GENERAR_JWT_SECRET.txt
- **Comandos y tips:** NOTAS_PRODUCCION.txt
- **Todos los docs:** INDICE_DOCUMENTACION.md

---

## [CHECKLIST] CHECKLIST RÁPIDO

- [ ] Node.js instalado (`node --version`)
- [ ] MongoDB corriendo
- [ ] ZIP descomprimido en C:\INEGI\Sistema
- [ ] .env.production renombrado a .env
- [ ] MONGO_URI configurado en .env
- [ ] JWT_SECRET configurado en .env
- [ ] `npm install --production` ejecutado
- [ ] `npm install -g pm2` ejecutado
- [ ] `.\start.bat` ejecutado
- [ ] http://localhost:4000 abierto en navegador

---

**Tiempo total:** 5-10 minutos

**Si necesitas ayuda:** Lee README_INSTALACION.md (tiene troubleshooting completo)

[OK] ¡Listo! El sistema debería estar corriendo.
