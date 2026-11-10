# Etapa 8 - Avance del despliegue en Render

Fecha: 10/11/2026
Rama de trabajo: valen/etapa8

## Trabajo realizado

- Creacion de PostgreSQL 16 en Render.
- Configuracion de acceso externo mediante reglas de IP.
- Verificacion de conexion cifrada mediante SSL.
- Ejecucion de las migraciones 001 a 009.
- Creacion de tablas, restricciones, funciones, procedimientos, triggers, vistas e indices.
- Configuracion de roles y privilegios de PostgreSQL.
- Adaptacion temporal de permisos para ejecutar la migracion 007 en Render.
- Adaptacion en memoria de la migracion 009 por restricciones de superusuario de Render.
- Creacion del rol app_api con permisos especificos para la API.

## Estado actual

Las nueve migraciones finalizaron sin errores.

Pendiente:
- Verificar los atributos y permisos efectivos de app_api.
- Configurar la contrasena del usuario de la API.
- Cargar los datos en PostgreSQL de Render.
- Desplegar la API FastAPI.
- Desplegar el frontend React.
- Validar el funcionamiento publico mediante HTTPS.
- Crear y restaurar un backup.
- Documentar pruebas y evidencias finales.

## Consideraciones

Las adaptaciones de las migraciones se realizaron durante su ejecucion
en Render, sin modificar los archivos SQL originales.

No se incluyen contrasenas, URLs privadas ni credenciales.

El despliegue en la nube todavia esta en desarrollo.
