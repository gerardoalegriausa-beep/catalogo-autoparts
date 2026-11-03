# Catálogo de repuestos Volvo para talleres

Catálogo B2B de repuestos Volvo (XC40, XC60, XC90, S60 y S90) importados desde
EE. UU. para talleres en Perú. El VIN es obligatorio en cada pedido para
reducir las devoluciones por incompatibilidad.

## Qué hace

- **Catálogo** con filtros por modelo, año y categoría (sensores y electrónica,
  motor y refrigeración, frenos, faros). Precios en **dólares**, puestos en el
  taller: repuesto + margen + flete por peso real o volumétrico + seguro +
  arancel + IGV/IPM + gestión de aduana + comisión de pago.
- **Búsqueda por VIN** (`/vin`): muestra solo las piezas que corresponden al vehículo.
- **Pedido con VIN obligatorio** (`/pedir/...`): el VIN se decodifica al momento
  con la API gratuita de la [NHTSA](https://vpic.nhtsa.dot.gov/api/) (marca,
  modelo, año y motor) y se compara con la compatibilidad de la pieza:
  - *Compatible*: se puede pedir.
  - *No corresponde*: el pedido se bloquea y se explica por qué.
  - *Sin datos* (p. ej. VIN europeo que la NHTSA no reconoce): se acepta y se
    marca para revisión manual.
  - Las piezas delicadas (módulos, faros) exigen el **número de parte** de la
    pieza que se reemplaza.
- **Seguimiento** (`/pedido/<enlace>`): línea de tiempo con los 6 estados
  (Recibido → VIN verificado → Comprado en EE. UU. → Recibido en Miami → En
  aduanas → Entregado) y fecha estimada de entrega.
- **Panel** (`/admin`): pedidos por validar / en curso / entregados. Para pasar a
  "VIN verificado" hay que confirmar que se revisó el número de parte en el
  catálogo original. Botón para avisar al taller por WhatsApp con el enlace de
  seguimiento y notas internas por pedido.

## Probarlo en tu computadora

Necesitas Node.js 22 o más reciente.

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Sin Supabase configurado funciona en **modo
demostración**: 14 piezas de ejemplo y pedidos en memoria. La contraseña del
panel en demo es `demo`.

## Ponerlo en producción

1. **Supabase** (gratis para empezar): crea un proyecto en https://supabase.com.
   En *SQL Editor* pega y ejecuta `supabase/migrations/0001_init.sql`.
2. **Repuestos**: edita `data/repuestos-ejemplo.csv` (se puede abrir en Google
   Sheets o Excel y guardar como CSV) y súbelo:
   ```bash
   cp .env.example .env.local   # completa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
   npm run import-parts -- data/repuestos-ejemplo.csv --dry-run   # solo valida
   npm run import-parts -- data/repuestos-ejemplo.csv             # sube
   ```
   También puedes editar piezas en *Table Editor* de Supabase. Después pulsa
   **Refrescar catálogo** en el panel.
3. **Vercel**: importa este repositorio en https://vercel.com/new y carga las
   variables de `.env.example` (como mínimo `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_PASSWORD`).

> La clave `service_role` de Supabase da acceso total a la base: úsala solo
> como variable del servidor, nunca en código del navegador.

### Formato del CSV de repuestos

| Columna | Ejemplo | Notas |
| --- | --- | --- |
| `slug` | `bomba-agua-drive-e` | Identificador único en la URL. Si ya existe, la pieza se actualiza. |
| `categoria` | `motor-refrigeracion` | `sensores-electronica`, `motor-refrigeracion`, `frenos`, `iluminacion` |
| `condicion` | `nuevo` | `nuevo`, `reconstruido`, `usado` |
| `costo_usd` | `138.50` | Costo del proveedor en EE. UU. |
| `margen_pct`, `arancel_pct` | vacío | Vacío = valor por defecto |
| `peso_kg`, `largo_cm`, `ancho_cm`, `alto_cm` | `1.6`, `22`, `18`, `14` | Para el flete (peso real o volumétrico, el mayor) |
| `requiere_numero_parte` | `si` | Exige el N.º de parte de la pieza antigua |
| `compatibilidad` | `xc60:2018-;xc90:2016-2020:B4204T` | `modelo:añoDesde-añoHasta[:motor]`, separadas por `;` |

## Precios: supuestos a confirmar

Los valores por defecto de `.env.example` son **supuestos para empezar**:
tarifa del forwarder (USD 8/kg, mínimo USD 25), arancel (6 %), IGV + IPM (18 %),
gestión de aduana (USD 15) y comisión de Stripe (4.4 % + USD 0.30). Confírmalos
con tu forwarder y tu agente de aduanas y cámbialos en las variables de entorno.

## Pendiente (siguientes pasos)

- Cobro con Stripe (autorizar y capturar después de validar el VIN). Una
  autorización de tarjeta suele vencer a los 7 días.
- Avisos automáticos por WhatsApp (hoy el panel arma el mensaje para enviarlo con un clic).
- Sincronización diaria de precios con proveedores mayoristas.

## Desarrollo

```bash
npm test           # pruebas (VIN, compatibilidad, precios, fechas, CSV)
npm run lint
npm run typecheck
npm run build
```

Next.js 16 (App Router, Cache Components) + Tailwind CSS 4 + Supabase. La
lógica de negocio está en `src/lib` (`vin.ts`, `fitment.ts`, `pricing.ts`,
`eta.ts`) y las pantallas en `src/app`.
