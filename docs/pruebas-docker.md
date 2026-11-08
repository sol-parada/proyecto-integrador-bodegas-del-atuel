# Prueba de Docker y PostgreSQL

## Proyecto

**Bodegas del Atuel**

## Etapa

**Etapa 1 — Modelado**

## Responsable

**Sol**

## Fecha

**26 de octubre de 2026**

---

## 1. Objetivo

El objetivo de esta prueba fue preparar y verificar un entorno reproducible para ejecutar PostgreSQL mediante Docker Compose y comprobar que el esquema inicial de la base de datos pudiera crearse correctamente desde cero.

Durante la prueba se verificó que:

- Docker Compose iniciara correctamente PostgreSQL.
- Las variables de entorno fueran reconocidas.
- La base de datos local se creara correctamente.
- El contenedor aceptara conexiones.
- El archivo `001_esquema.sql` se ejecutara sin errores.
- Las tablas del esquema inicial se crearan correctamente.

---

## 2. Archivos utilizados

Para esta prueba se utilizaron los siguientes archivos:

```text
.env
.env.example
.gitignore
compose.yaml
database/migrations/001_esquema.sql
```

### Archivo `.env`

El archivo `.env` contiene las variables locales utilizadas para ejecutar PostgreSQL.

Este archivo no debe subirse al repositorio porque contiene información sensible, como la contraseña local de la base de datos.

### Archivo `.env.example`

El archivo `.env.example` documenta las variables necesarias para configurar el entorno, sin incluir contraseñas reales.

### Archivo `.gitignore`

El archivo `.gitignore` evita que se suban al repositorio:

- El archivo `.env`.
- Contraseñas.
- Logs.
- Archivos temporales.
- Backups.
- Entornos virtuales.
- Dependencias locales.

### Archivo `compose.yaml`

El archivo `compose.yaml` define el servicio de PostgreSQL, sus variables de entorno, el puerto de conexión, el volumen de datos y el healthcheck.

### Archivo `001_esquema.sql`

El archivo `database/migrations/001_esquema.sql` contiene la definición inicial de la base de datos, incluyendo las tablas, claves y relaciones correspondientes al modelo aprobado para esta etapa.

---

## 3. Requisitos utilizados

Para realizar la prueba se utilizaron:

- Docker Desktop.
- Docker Compose.
- PostgreSQL 16 mediante una imagen oficial de Docker.
- PowerShell.
- Sistema operativo Windows.

La versión utilizada de PostgreSQL cumple con el requisito de la consigna, que solicita PostgreSQL 14 o superior.

---

## 4. Configuración del entorno

El archivo `.env` se creó manualmente en la raíz del repositorio.

La estructura utilizada fue:

```text
tpi-bodegas-del-atuel/
├── .env
├── .env.example
├── .gitignore
├── compose.yaml
├── database/
│   └── migrations/
│       └── 001_esquema.sql
└── docs/
```

El archivo `.env` contiene las variables necesarias para crear la base local:

```env
POSTGRES_DB=bodegas_atuel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CONTRASENA_LOCAL
POSTGRES_PORT=5432
```

La contraseña real utilizada se mantiene únicamente en el archivo `.env` local y no se incluye en el repositorio.

---

## 5. Comandos ejecutados

Los comandos se ejecutaron desde la carpeta raíz del repositorio.

### 5.1. Actualizar los cambios del repositorio

Antes de realizar la prueba se actualizaron los archivos locales desde la rama principal:

```powershell
git fetch origin
git switch main
git pull origin main
```

### 5.2. Reiniciar la base desde cero

Para garantizar que la prueba se realizara sobre una base vacía, se eliminaron el contenedor y el volumen local:

```powershell
docker compose down -v
```

Luego se inició nuevamente PostgreSQL:

```powershell
docker compose up -d
```

### 5.3. Verificar el estado del servicio

```powershell
docker compose ps
```

### 5.4. Consultar los logs de PostgreSQL

```powershell
docker compose logs db
```

### 5.5. Ejecutar el esquema inicial

El archivo `001_esquema.sql` se ejecutó dentro del contenedor mediante:

```powershell
Get-Content .\database\migrations\001_esquema.sql | docker compose exec -T db psql -U postgres -d bodegas_atuel
```

### 5.6. Ingresar a la base de datos

```powershell
docker compose exec db psql -U postgres -d bodegas_atuel
```

### 5.7. Detener el entorno

```powershell
docker compose down
```

---

## 6. Resultado de la prueba de Docker y PostgreSQL

La primera ejecución produjo advertencias porque el archivo `.env` todavía no había sido creado. Docker Compose no encontró las variables necesarias y PostgreSQL no pudo inicializarse porque no recibió una contraseña para el usuario administrador.

El problema se solucionó creando manualmente el archivo `.env` en la raíz del repositorio y completando las variables necesarias.

Luego se reinició el entorno con:

```powershell
docker compose down -v
docker compose up -d
```

Después de corregir la configuración:

- El contenedor inició correctamente.
- PostgreSQL quedó disponible para aceptar conexiones.
- La base `bodegas_atuel` fue creada.
- Las variables de entorno fueron reconocidas correctamente.
- No se produjeron errores de inicialización.

Los logs confirmaron que PostgreSQL estaba listo para aceptar conexiones.

---

## 7. Ejecución del esquema inicial

Una vez actualizado el modelo, se ejecutó el archivo:

```text
database/migrations/001_esquema.sql
```

La ejecución se realizó sobre una base vacía mediante:

```powershell
Get-Content .\database\migrations\001_esquema.sql | docker compose exec -T db psql -U postgres -d bodegas_atuel
```

El script se ejecutó de principio a fin correctamente.

No se produjeron errores de sintaxis ni errores relacionados con:

- Creación de tablas.
- Claves primarias.
- Claves foráneas.
- Relaciones entre tablas.
- Tipos de datos incluidos en el esquema.

---

## 8. Verificación de la conexión

Se ingresó a PostgreSQL mediante:

```powershell
docker compose exec db psql -U postgres -d bodegas_atuel
```

Dentro de PostgreSQL se ejecutaron las siguientes consultas:

```sql
SELECT current_database();
```

La consulta confirmó que la base activa era:

```text
bodegas_atuel
```

También se consultó la versión del servidor:

```sql
SELECT version();
```

La base quedó funcionando sobre PostgreSQL 16.

---

## 9. Verificación de las tablas

Para listar las tablas creadas se ejecutó:

```sql
\dt
```

También se utilizó la siguiente consulta:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

La consulta permitió confirmar que las tablas definidas en `001_esquema.sql` fueron creadas correctamente dentro del esquema `public`.

Para salir de la consola de PostgreSQL se utilizó:

```sql
\q
```

---

## 10. Verificación de seguridad del archivo `.env`

El archivo `.env` contiene una contraseña local y no debe subirse al repositorio.

Se verificó el estado de Git mediante:

```powershell
git status
```

También se puede comprobar específicamente que `.env` esté siendo ignorado con:

```powershell
git check-ignore -v .env
```

El archivo que debe compartirse en el repositorio es:

```text
.env.example
```

El archivo que debe permanecer únicamente en cada computadora local es:

```text
.env
```

---

## 11. Resultado final

La prueba del entorno y del esquema inicial fue satisfactoria.

Se comprobó que:

- Docker Compose funciona correctamente.
- PostgreSQL 16 inicia dentro del contenedor.
- La base de datos `bodegas_atuel` se crea correctamente.
- El contenedor acepta conexiones.
- El archivo `001_esquema.sql` se ejecuta desde cero sin errores.
- Las tablas del esquema inicial se crean correctamente.
- Las claves y relaciones definidas en el script no generan errores durante la creación.
- El procedimiento puede reproducirse en otra computadora con Docker y el archivo `.env` correspondiente.

---

## 12. Observaciones

La prueba se realizó sobre una base vacía utilizando:

```powershell
docker compose down -v
```

Esto permitió comprobar que el esquema inicial pudiera ejecutarse desde cero, tal como solicita la consigna de la Etapa 1.

Los scripts correspondientes a etapas posteriores no formaron parte de esta prueba. Su implementación y validación se realizarán más adelante, cuando corresponda según el avance del proyecto.

---

## 13. Conclusión

La configuración del entorno local y la prueba del esquema inicial quedaron completadas correctamente.

Se logró:

- Preparar el repositorio.
- Configurar Docker Compose.
- Proteger el archivo `.env`.
- Levantar PostgreSQL mediante Docker.
- Crear la base de datos local.
- Ejecutar `001_esquema.sql` sobre una base vacía.
- Verificar la creación de las tablas.
- Documentar el procedimiento y el resultado.

Con esta prueba queda finalizada la parte de infraestructura y validación técnica correspondiente a la responsabilidad de Sol en la Etapa 1 — Modelado.