# 🎨 Rediseño Visual - Tema Oscuro Estilo Komposo

## ⚠️ IMPORTANTE - SOLO CAMBIOS ESTÉTICOS
Este spec es SOLO para cambios visuales. NO modificar:
- Lógica de negocio
- Llamadas a API
- Funciones existentes
- Flujos de autenticación
- Generación de imágenes/secciones

## Paleta de Colores

### Colores oscuros (fondos)
```typescript
dark: {
  bg: '#0a0a0a',       // Fondo principal (casi negro)
  surface: '#121212',   // Cards, sidebar, modals
  border: '#2a2a2a',    // Bordes sutiles
  input: '#1a1a1a'      // Campos de entrada
}
```

### Color de acento (turquesa/teal)
```typescript
brand: {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',  // Color principal
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
  950: '#042f2e',
}
```

## Archivos a Modificar

### 1. `tailwind.config.ts` - Agregar colores personalizados

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        dark: {
          bg: '#0a0a0a',
          surface: '#121212',
          border: '#2a2a2a',
          input: '#1a1a1a'
        }
      },
    },
  },
  plugins: [],
};
export default config;
```

### 2. `app/globals.css` - Estilos globales oscuros

Agregar después de los imports de Tailwind:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

/* Base dark theme */
:root {
  --background: #0a0a0a;
  --foreground: #e2e8f0;
  --surface: #121212;
  --border: #2a2a2a;
  --brand: #14b8a6;
}

body {
  background-color: var(--background);
  color: var(--foreground);
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: #2a2a2a;
  border-radius: 20px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #14b8a6;
}

/* Glassmorphism utility */
.glass-panel {
  background: rgba(18, 18, 18, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Glow animation */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 15px rgba(20, 184, 166, 0.1); }
  50% { box-shadow: 0 0 25px rgba(20, 184, 166, 0.3); }
}
.animate-glow {
  animation: pulse-glow 3s infinite;
}
```

### 3. `app/layout.tsx` - Agregar clase dark al body

```tsx
// Cambiar el className del body a:
<body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-dark-bg text-slate-300`}>
```

### 4. Componentes del Dashboard - Cambios de estilo

#### Sidebar (`components/dashboard/sidebar.tsx` o donde esté)

Cambiar clases de:
- `bg-white` → `bg-dark-surface`
- `border-gray-200` → `border-dark-border`
- `text-gray-600` → `text-slate-400`
- `text-gray-900` → `text-white`
- `hover:bg-gray-100` → `hover:bg-dark-border`
- Botón activo: `bg-brand-500/10 text-brand-400`

#### Cards y contenedores

Cambiar:
- `bg-white` → `bg-dark-surface`
- `border-gray-200` → `border-dark-border`
- `shadow-sm` → `shadow-lg shadow-black/20`

#### Inputs y formularios

Cambiar:
- `bg-white` → `bg-dark-input`
- `border-gray-300` → `border-dark-border`
- `focus:ring-blue-500` → `focus:ring-brand-500`
- `focus:border-blue-500` → `focus:border-brand-500`
- `text-gray-900` → `text-white`
- `placeholder-gray-400` → `placeholder-slate-500`

#### Botones primarios

Cambiar:
- `bg-blue-600` → `bg-brand-500`
- `hover:bg-blue-700` → `hover:bg-brand-400`
- `bg-green-600` → `bg-brand-500`
- `hover:bg-green-700` → `hover:bg-brand-400`

Ejemplo de botón principal:
```tsx
<button className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/25 transition-all">
  Generar Sección
</button>
```

#### Botones secundarios

```tsx
<button className="bg-dark-border hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
  Cancelar
</button>
```

#### Headers y títulos

- `text-gray-900` → `text-white`
- `text-gray-600` → `text-slate-400`
- `text-gray-500` → `text-slate-500`

### 5. Páginas específicas a actualizar

#### `/app/(dashboard)/dashboard/page.tsx`
- Fondo: `bg-dark-bg`
- Cards: `bg-dark-surface border-dark-border`
- Textos: `text-white`, `text-slate-400`

#### `/app/(dashboard)/dashboard/landing/page.tsx`
- Lista de landings con fondo oscuro
- Cards con hover: `hover:bg-dark-border`

#### `/app/(dashboard)/dashboard/landing/[id]/page.tsx`
- Panel izquierdo: `bg-dark-surface`
- Panel derecho (preview): `bg-dark-bg`
- Toolbar: `bg-dark-surface/30 border-dark-border`
- Inputs: `bg-dark-input border-dark-border`

### 6. Logo/Icono del sidebar

Crear un icono con gradiente turquesa:
```tsx
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
  <span className="text-white font-bold text-lg">E</span>
</div>
```

## Proceso de implementación

1. **Primero**: Actualizar `tailwind.config.ts` con los nuevos colores
2. **Segundo**: Actualizar `globals.css` con las fuentes y estilos base
3. **Tercero**: Actualizar `layout.tsx` con las clases oscuras
4. **Cuarto**: Ir componente por componente actualizando clases
5. **Quinto**: Verificar que TODO funcione igual, solo cambie la apariencia

## Búsqueda y reemplazo sugerido

Hacer estos reemplazos en archivos `.tsx` del dashboard:

| Buscar | Reemplazar |
|--------|------------|
| `bg-white` | `bg-dark-surface` |
| `bg-gray-50` | `bg-dark-bg` |
| `bg-gray-100` | `bg-dark-border` |
| `border-gray-200` | `border-dark-border` |
| `border-gray-300` | `border-dark-border` |
| `text-gray-900` | `text-white` |
| `text-gray-800` | `text-slate-200` |
| `text-gray-700` | `text-slate-300` |
| `text-gray-600` | `text-slate-400` |
| `text-gray-500` | `text-slate-500` |
| `text-gray-400` | `text-slate-500` |
| `hover:bg-gray-50` | `hover:bg-dark-border` |
| `hover:bg-gray-100` | `hover:bg-dark-border` |
| `focus:ring-blue-500` | `focus:ring-brand-500` |
| `focus:border-blue-500` | `focus:border-brand-500` |
| `bg-blue-600` | `bg-brand-500` |
| `bg-blue-500` | `bg-brand-500` |
| `hover:bg-blue-700` | `hover:bg-brand-400` |
| `bg-green-600` | `bg-brand-500` |
| `bg-green-500` | `bg-brand-500` |
| `hover:bg-green-700` | `hover:bg-brand-400` |
| `text-blue-600` | `text-brand-400` |
| `text-green-600` | `text-brand-400` |

## Testing

Después de los cambios, verificar:
- [ ] Login/registro funciona
- [ ] Dashboard carga correctamente
- [ ] Crear nuevo landing funciona
- [ ] Generar secciones funciona
- [ ] Editar en Canva funciona
- [ ] Descargar imágenes funciona
- [ ] Todos los botones son clickeables
- [ ] Todos los inputs son escribibles
- [ ] No hay texto ilegible (contraste)

## NO TOCAR

- `/app/api/*` - APIs intactas
- `/lib/*` - Lógica intacta
- Funciones `handleGenerateSection`, `handleOpenInCanva`, etc.
- Llamadas a Supabase
- Llamadas a APIs de generación de imágenes
- Autenticación
