# Trazabilidad de reglas de negocio — Etapa 2

| Regla | Descripción | Mecanismo | Archivo | Prueba |
|---|---|---|---|---|
| RN-01 | El precio del vino es único para cada vino y mayor que cero. | Atributo `precio` y `CHECK (precio > 0)` | `001_esquema.sql`, `002_constraints.sql` | Pendiente |
| RN-02 | Una sala pertenece a una localidad. | Clave foránea | `001_esquema.sql` | Pendiente |
| RN-03 | Cada empleado trabaja en una sala. | Clave foránea `NOT NULL` | `001_esquema.sql` | Pendiente |
| RN-04 | Una parcela tiene una cepa y se cosecha una vez por campaña. | Clave foránea y `UNIQUE` | `001_esquema.sql`, `002_constraints.sql` | Parcial |
| RN-05 | La composición de cada vino suma 100 %. | Constraint trigger diferido | `005_triggers.sql` | Parcial |
| RN-06 | El descuento depende del tipo de cliente. | Función y `CHECK` | `002_constraints.sql`, `003_funciones.sql` | Implementada |
| RN-07 | Un exportador puede tener varios permisos y el vencimiento supera la emisión. | Tabla y `CHECK` entre fechas | `001_esquema.sql`, `002_constraints.sql` | Parcial |
| RN-08 | El total del comprobante se calcula con sus renglones y descuentos. | Función y triggers | `003_funciones.sql`, `005_triggers.sql` | Implementada |
| RN-09 | No se puede vender más stock del disponible. | Trigger y `CHECK` | `002_constraints.sql`, `005_triggers.sql` | Implementada |
| RN-10 | Los ingresos avanzan de confección a terminado y procesado. | ENUM, trigger y procedimiento | `004_procedimientos.sql`, `005_triggers.sql` | Implementada |
| RN-11 | Las transferencias avanzan correctamente y no modifican su fecha. | Trigger y procedimiento | `004_procedimientos.sql`, `005_triggers.sql` | Implementada |
| RN-12 | No se modifican renglones fuera de confección. | Trigger | `005_triggers.sql` | Pendiente |
| RN-13 | Los cambios de precio quedan auditados. | Trigger y tabla de auditoría | `005_triggers.sql` | Pendiente |
| RN-14 | No se eliminan entidades con movimientos asociados. | `ON DELETE RESTRICT` | `001_esquema.sql` | Pendiente |
| RN-15 | Cantidades, superficies, kilos y precios son positivos; graduación entre 5 y 20. | `CHECK` | `002_constraints.sql` | Pendiente |