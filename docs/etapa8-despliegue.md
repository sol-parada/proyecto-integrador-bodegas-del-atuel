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