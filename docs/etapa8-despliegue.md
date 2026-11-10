# Etapa 8 — Despliegue en la nube

## Proveedor seleccionado
Render, utilizando PostgreSQL, un Web Service para FastAPI y un Static Site para React.

## Servicios publicados
- Frontend: https://bodegas-del-atuel-web.onrender.com
- Backend: https://bodegas-del-atuel-api.onrender.com
- Documentación API: https://bodegas-del-atuel-api.onrender.com/docs

## Base de datos
- Motor: PostgreSQL 16.
- Migraciones 001 a 009 aplicadas.
- Conexión SSL requerida.
- API configurada con rol app_api.
- Credenciales gestionadas mediante variables de entorno.
- Carga reducida por las limitaciones del plan gratuito.

## Datos verificados
- Clientes: 20000
- Vinos: 300
- Comprobantes: 100
- Renglones de comprobantes: 350

## Integración
Se desplegó React y se configuró CORS en FastAPI.
Se comprobó que el catálogo consulta correctamente los vinos almacenados en PostgreSQL de Render.

## Respaldo y restauración
Se generó un respaldo utilizando pg_dump en formato personalizado:
backups/etapa8_render.backup

Se utilizó pg_restore para recuperar la base en un contenedor PostgreSQL 16 independiente, llamado bodegas-restauracion, con base bodegas_restaurada.

Conteos de referencia:
- cliente: 20000
- vino: 300
- comprobante: 100
- renglon_comprobante: 350

## Prueba de regla de negocio en la nube
Se probó el trigger trg_registrar_venta mediante una operación que excedía el stock disponible.

Resultado:

BEGIN
NOTICE: PRUEBA EXITOSA: RN-09: stock insuficiente para el vino 432 en la sala 16
DO
ROLLBACK

La operación fue rechazada y la transacción se revirtió sin alterar los datos originales.

## Evidencias
- Servicios de Render en estado Live.
- Catálogo de vinos funcionando en el frontend público.
- Respaldo generado.
- Restauración y comparación de conteos.
- Prueba exitosa del trigger RN-09.

## Pendiente de verificación
- Restricciones de acceso externo a PostgreSQL.
- Revisión de secretos en el historial del repositorio.
- Comparación documentada de proveedores y límites de sus planes.
## Comparación de proveedores

Se evaluaron Render y Neon para alojar la base de datos PostgreSQL.

### Render
- Ofrece PostgreSQL administrado.
- Plan gratuito de PostgreSQL: 1 GB de almacenamiento.
- La base gratuita vence 30 días después de su creación.
- Permite desplegar FastAPI mediante Docker.
- Permite publicar React como Static Site.
- Facilita la comunicación interna entre servicios de la misma región.
- El Web Service gratuito puede entrar en suspensión por inactividad.

### Neon
- Ofrece PostgreSQL administrado.
- Plan gratuito: 1 GB de almacenamiento por proyecto.
- Incluye cuotas mensuales de procesamiento.
- Permite escalado a cero durante períodos de inactividad.
- Para esta arquitectura, FastAPI y React requieren servicios de alojamiento adicionales.

### Decisión
Se seleccionó Render porque permite alojar la base de datos,
el backend y el frontend en una misma plataforma.

La solución facilita la integración y el despliegue del sistema.
Como limitaciones se identificaron la suspensión por inactividad
del Web Service gratuito y el vencimiento de PostgreSQL Free
después de 30 días.

## Verificación de seguridad

### Controles implementados
- HTTPS para el acceso público al frontend y a la API.
- Conexión a PostgreSQL con SSL requerido.
- Backend conectado mediante hostname interno de Render.
- Rol app_api separado del propietario de PostgreSQL.
- Credenciales configuradas mediante variables de entorno.
- No se incluyen contraseñas en este informe.

### Restricción de acceso externo: pendiente
Durante la revisión del 10 de noviembre de 2026 se observó
que PostgreSQL mantenía la regla 0.0.0.0/0 (everywhere).

Esta regla permite intentos de conexión desde cualquier IPv4,
aunque PostgreSQL sigue exigiendo credenciales válidas.

Se intentó acceder a la configuración de reglas desde Render,
pero no se consiguió modificarla desde las pantallas disponibles.

Por lo tanto, no se considera cumplido el requisito de
restringir el acceso externo a PostgreSQL.

Acción pendiente: configurar una lista de IP autorizadas o
deshabilitar el acceso externo, conservando el acceso interno
utilizado por FastAPI. Luego verificar el rechazo de una
conexión no autorizada.

También queda pendiente auditar el historial de Git en busca
de posibles secretos.

## Fuentes consultadas
- https://render.com/docs/free
- https://render.com/docs/inbound-ip-rules
- https://render.com/docs/postgresql-creating-connecting
- https://neon.com/blog/neon-free-plan-1-gb-per-project