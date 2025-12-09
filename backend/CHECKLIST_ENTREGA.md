# [CHECKLIST] CHECKLIST DE VERIFICACIÓN ANTES DE ENTREGAR

## [PAQUETE] ARCHIVOS INCLUIDOS EN EL PAQUETE

### Backend
- [x] dist/ - Backend compilado (TypeScript → JavaScript)
- [x] dist/ - Frontend compilado (React → HTML/JS/CSS)
- [x] src/ - Código fuente (opcional, para referencia)
- [x] templates/ - Plantillas Handlebars (.hbs) para PDFs
- [x] node_modules/ - NO INCLUIR (Marco los instalará)
- [x] logs/ - Carpeta vacía (se llenará en producción)

### Configuración
- [x] .env.production - Template de variables de entorno
- [x] .env.example - Ejemplo de configuración
- [x] ecosystem.config.js - Configuración de PM2
- [x] package.json - Dependencias del proyecto
- [x] package-lock.json - Versiones exactas de dependencias
- [x] tsconfig.json - Configuración TypeScript (referencia)

### Scripts de Ejecución
- [x] start.bat - Iniciar el sistema con PM2
- [x] stop.bat - Detener el sistema
- [x] restart.bat - Reiniciar el sistema

### Documentación
- [x] README_INSTALACION.md - Manual completo de instalación
- [x] NOTAS_PRODUCCION.txt - Notas importantes
- [x] GENERAR_JWT_SECRET.txt - Cómo generar clave segura

---

## [OK] VERIFICACIONES TÉCNICAS

### Build del Frontend
- [x] `npm run build` ejecutado exitosamente en /frontend
- [x] Carpeta /frontend/dist generada
- [x] Archivos copiados a /backend/dist

### Build del Backend
- [x] `npm run build` ejecutado exitosamente en /backend
- [x] TypeScript compilado sin errores
- [x] Templates copiados a /backend/dist/templates

### Integración Frontend + Backend
- [x] app.ts configurado para servir archivos estáticos
- [x] Ruta `/*` (SPA) configurada para devolver index.html
- [x] Solo activo en NODE_ENV=production

### Configuración
- [x] .env.production contiene todas las variables necesarias
- [x] MONGO_URI marcada para que Marco la cambie
- [x] JWT_SECRET marcada como CAMBIAR
- [x] PUBLIC_BASE_URL con ejemplo claro

### PM2
- [x] ecosystem.config.js apunta a dist/server.js
- [x] Configurado para NODE_ENV=production
- [x] Logs configurados en ./logs/

### Scripts
- [x] start.bat instala PM2 si no existe
- [x] start.bat inicia con ecosystem.config.js
- [x] stop.bat detiene el proceso
- [x] restart.bat reinicia el proceso

---

## [PRUEBAS] PRUEBAS LOCALES (Opcional)

Si quiere probar antes de entregar:

1. **Compilar todo:**
   ```powershell
   cd frontend
   npm run build
   
   cd ..\backend
   npm run build
   ```

2. **Configurar .env temporal:**
   - Copiar .env.production a .env
   - Poner su MONGO_URI de desarrollo
   - Generar JWT_SECRET temporal

3. **Probar en local:**
   ```powershell
   .\start.bat
   ```

4. **Verificar:**
   - Abrir http://localhost:4000
   - Verificar que el frontend cargue
   - Verificar que las APIs funcionen
   - Ver logs: `pm2 logs inegi-sistema`

5. **Detener:**
   ```powershell
   .\stop.bat
   pm2 delete inegi-sistema
   ```

---

## [INSTRUCCIONES] INSTRUCCIONES PARA MARCO

Marco debe:

1. ✅ Instalar Node.js v18+
2. ✅ Tener MongoDB corriendo (local o Atlas)
3. ✅ Copiar carpeta del paquete a C:\INEGI\Sistema\
4. ✅ Renombrar .env.production → .env
5. ✅ Editar .env con sus valores reales
6. ✅ Ejecutar: `npm install --production`
7. ✅ Ejecutar: `npm install -g pm2`
8. ✅ Ejecutar: `.\start.bat`
9. ✅ Acceder: http://localhost:4000
10. ✅ Configurar firewall si necesita acceso remoto

---

## [IMPORTANTE] RECORDATORIOS FINALES

### CRÍTICO - Marco DEBE cambiar:
- [ ] MONGO_URI en .env
- [ ] JWT_SECRET en .env (generar una nueva)
- [ ] PUBLIC_BASE_URL si accede desde red

### IMPORTANTE - Verificar:
- [ ] Puerto 4000 libre en el servidor
- [ ] MongoDB accesible desde el servidor
- [ ] Firewall permitiendo puerto 4000 (si acceso remoto)

### OPCIONAL - Mejoras futuras:
- [ ] Configurar PM2 startup para inicio automático
- [ ] Agregar HTTPS con certificado SSL
- [ ] Configurar nginx como reverse proxy
- [ ] Implementar backups automáticos de MongoDB

---

## [SOPORTE] SOPORTE POST-ENTREGA

Si Marco reporta problemas:

1. **No inicia el servidor:**
   - Verificar logs: `pm2 logs inegi-sistema`
   - Revisar .env (especialmente MONGO_URI)
   - Verificar puerto 4000 libre

2. **Error de MongoDB:**
   - Confirmar MongoDB está corriendo
   - Probar URI desde MongoDB Compass
   - Verificar firewall de MongoDB

3. **Frontend no carga:**
   - Verificar NODE_ENV=production en .env
   - Verificar dist/ contiene index.html
   - Ver logs del navegador (F12)

4. **Error 404 en rutas:**
   - Verificar app.ts tiene el middleware de SPA
   - Confirmar build del backend se ejecutó

---

## [LISTA] LISTA DE ENTREGA

Archivo ZIP debe contener:

```
INEGI_Sistema_Produccion_YYYYMMDD/
├── dist/                           [OK]
│   ├── api/                        [OK] Backend compilado
│   ├── middleware/                 [OK]
│   ├── models/                     [OK]
│   ├── services/                   [OK]
│   ├── templates/                  [OK]
│   ├── server.js                   [OK] Punto de entrada
│   ├── index.html                  [OK] Frontend
│   └── assets/                     [OK] CSS/JS del frontend
├── src/                            [OK] Código fuente (referencia)
├── templates/                      [OK] Plantillas .hbs
├── logs/                           [OK] Carpeta vacía
├── package.json                    [OK]
├── package-lock.json               [OK]
├── .env.production                 [OK]
├── .env.example                    [OK]
├── ecosystem.config.js             [OK]
├── start.bat                       [OK]
├── stop.bat                        [OK]
├── restart.bat                     [OK]
├── README_INSTALACION.md           [OK]
├── NOTAS_PRODUCCION.txt            [OK]
└── GENERAR_JWT_SECRET.txt          [OK]
```

---

**ESTADO:** [OK] LISTO PARA ENTREGAR

**Fecha de empaquetado:** ______________

**Empaquetado por:** ______________

**Versión:** 1.0.0
