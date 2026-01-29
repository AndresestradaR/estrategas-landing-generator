# 🔍 Buscador de Productos - Especificación DropKiller

## Objetivo
Crear un buscador de productos ganadores que se conecte a DropKiller para obtener datos de ventas, stock y métricas de productos de dropshipping en LATAM.

---

## API de DropKiller (Dashboard)

### Endpoint Principal - Búsqueda de Productos
```http
GET https://app.dropkiller.com/dashboard/products?{params}
```

**Requiere autenticación:** Cookie de sesión de DropKiller (usuario debe tener suscripción activa)

### Query Parameters

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `platform` | string | Plataforma de dropshipping | `dropi`, `easydrop`, `aliclick` |
| `country` | UUID | ID del país | `65c75a5f-0c4a-45fb-8c90-5b538805a15a` |
| `limit` | number | Productos por página | `50` |
| `page` | number | Número de página | `1` |
| `s7min` | number | Ventas 7 días mínimo | `10` |
| `s7max` | number | Ventas 7 días máximo | `100` |
| `s30min` | number | Ventas 30 días mínimo | `50` |
| `s30max` | number | Ventas 30 días máximo | `500` |
| `f7min` | number | Facturación 7 días mínimo (COP) | `100000` |
| `f7max` | number | Facturación 7 días máximo (COP) | `5000000` |
| `f30min` | number | Facturación 30 días mínimo | `500000` |
| `f30max` | number | Facturación 30 días máximo | `20000000` |
| `stock-min` | number | Stock mínimo | `50` |
| `stock-max` | number | Stock máximo | `1000` |
| `price-min` | number | Precio mínimo | `25000` |
| `price-max` | number | Precio máximo | `150000` |
| `creation-date` | string | Rango de fechas | `2025-12-01/2025-12-30` |

**Ejemplo de URL completa:**
```
https://app.dropkiller.com/dashboard/products?platform=dropi&country=65c75a5f-0c4a-45fb-8c90-5b538805a15a&limit=50&page=1&s7min=10&stock-min=50&price-min=25000&price-max=150000
```

---

### IDs de Países (UUIDs)

```typescript
const COUNTRY_IDS = {
  colombia: '65c75a5f-0c4a-45fb-8c90-5b538805a15a',
  ecuador: '82811e8b-d17d-4ab9-847a-fa925785d566',
  mexico: '98993bd0-955a-4fa3-9612-c9d4389c44d0',
  chile: 'ad63080c-908d-4757-9548-30decb082b7e',
  spain: '3f18ae66-2f98-4af1-860e-53ed93e5cde0',
  peru: '6acfee32-9c25-4f95-b030-a005e488f3fb',
  panama: 'c1f01c6a-99c7-4253-b67f-4e2607efae9e',
  paraguay: 'f2594db9-caee-4221-b4a6-9b6267730a2d',
  argentina: 'de93b0dd-d9d3-468d-8c44-e9780799a29f',
  guatemala: '77c15189-b3b9-4f55-9226-e56c231f87ac',
} as const;
```

---

### Plataformas Soportadas

| Plataforma | Valor | Países Disponibles |
|------------|-------|-------------------|
| Dropi | `dropi` | AR, CL, CO, EC, ES, GT, MX, PA, PY, PE |
| Easydrop | `easydrop` | CL, EC, MX, PE |
| Aliclick | `aliclick` | PE |
| Dropea | `dropea` | ES |
| Droplatam | `droplatam` | CL, CO, EC, ES, MX, PA, PY, PE |
| Seventy Block | `seventy block` | CO |
| Wimpy | `wimpy` | CO, MX |
| Mastershop | `mastershop` | CO |

---

### Endpoint de Detalle de Producto

```http
GET https://app.dropkiller.com/dashboard/tracking/detail/{product_uuid}?platform=dropi
```

**Respuesta incluye:**
- Gráfico de ventas diarias (30 días)
- Total de ventas
- Promedio diario
- Facturación total
- Historial de stock
- URL del producto en la plataforma origen

---

## Implementación Sugerida

### Opción 1: Web Scraping con Puppeteer/Playwright
Como DropKiller requiere autenticación por cookies, se puede hacer scraping:

```typescript
import { chromium } from 'playwright';

async function scrapeDropKiller(filters: ProductFilters, cookies: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Parsear y cargar cookies de sesión del usuario
  const cookieObjects = parseCookieString(cookies);
  await context.addCookies(cookieObjects);
  
  const page = await context.newPage();
  const url = buildDropKillerUrl(filters);
  await page.goto(url);
  
  // Esperar a que cargue la tabla
  await page.waitForSelector('table tbody tr');
  
  // Extraer datos de la tabla de productos
  const products = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    return Array.from(rows).map(row => {
      // Parsear cada fila
    });
  });
  
  await browser.close();
  return products;
}
```

### Opción 2: Interceptar API calls
DropKiller hace llamadas a su backend. Se puede interceptar:

```typescript
page.on('response', async (response) => {
  if (response.url().includes('/api/products')) {
    const data = await response.json();
    // Procesar datos directamente del JSON
  }
});
```

---

## Estructura de Datos Esperada

```typescript
interface Product {
  id: string;
  externalId: string;          // ID en Dropi/plataforma
  name: string;
  image: string;
  price: number;
  stock: number;
  sales7d: number;             // Ventas últimos 7 días
  sales30d: number;            // Ventas últimos 30 días
  revenue7d: number;           // Facturación 7 días
  revenue30d: number;          // Facturación 30 días
  platform: string;            // dropi, easydrop, etc.
  country: string;
  url: string;                 // Link al producto
  createdAt: Date;
  dailySales?: number[];       // Array de ventas por día (30 días)
}

interface ProductFilters {
  platform?: string;
  country?: string;
  minSales7d?: number;
  maxSales7d?: number;
  minSales30d?: number;
  maxSales30d?: number;
  minStock?: number;
  maxStock?: number;
  minPrice?: number;
  maxPrice?: number;
  dateRange?: { from: string; to: string };
  page?: number;
  limit?: number;
}
```

---

## UI Requerida

Crear una nueva página/tab "Encuentra tu Producto Ganador" con:

### 1. Filtros (sidebar o top bar):
- Selector de país (dropdown con bandera)
- Selector de plataforma (dropdown)
- Rango de ventas 7d (slider dual o 2 inputs min/max)
- Rango de ventas 30d (slider dual o 2 inputs min/max)  
- Rango de precio (slider dual o 2 inputs min/max)
- Rango de stock (slider dual o 2 inputs min/max)
- Botón "Buscar"

### 2. Campo de Cookies:
- Input/textarea donde el usuario pega sus cookies de DropKiller
- Instrucciones de cómo obtenerlas (F12 > Application > Cookies)
- Guardar en localStorage para no pedir cada vez

### 3. Tabla de resultados:
| Imagen | Nombre | Precio | Ventas 7d | Ventas 30d | Stock | Acciones |
|--------|--------|--------|-----------|------------|-------|----------|
| [img]  | Prod 1 | $50k   | 45        | 180        | 500   | 🔗 📋    |

### 4. Acciones por producto:
- 🔗 Ver en Dropi (abre link)
- 📋 Copiar link
- ⭐ Agregar a favoritos (opcional)
- 📊 Ver detalle (modal con gráfico de ventas)

---

## Arquitectura en el Proyecto

```
src/
├── app/
│   └── productos/              # Nueva ruta
│       └── page.tsx            # Página del buscador
├── components/
│   └── productos/
│       ├── ProductFilters.tsx  # Componente de filtros
│       ├── ProductTable.tsx    # Tabla de resultados
│       ├── ProductCard.tsx     # Card individual
│       └── CookieInput.tsx     # Input de cookies
├── lib/
│   └── dropkiller/
│       ├── scraper.ts          # Lógica de scraping
│       ├── types.ts            # Interfaces
│       └── constants.ts        # IDs países, plataformas
└── api/
    └── productos/
        └── search/
            └── route.ts        # API endpoint
```

---

## API Endpoint Backend

```typescript
// POST /api/productos/search
// Body: { filters: ProductFilters, cookies: string }
// Response: { products: Product[], total: number, page: number }
```

---

## Notas Importantes

1. **Cookies:** El usuario DEBE tener suscripción activa en DropKiller
2. **Rate Limiting:** No hacer más de 1 request cada 2-3 segundos
3. **Cache:** Cachear resultados por 5-10 minutos para no sobrecargar
4. **Error Handling:** Manejar cookies expiradas, cuenta sin suscripción, etc.
