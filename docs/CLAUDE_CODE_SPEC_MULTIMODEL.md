# 🎯 ESPECIFICACIÓN TÉCNICA: Multi-Model Image Generation
## Proyecto: estrategas-landing-generator (AndresEstradaR/estrategas-landing-generator)

---

## ⚠️ INSTRUCCIONES CRÍTICAS PARA CLAUDE CODE

**ANTES DE ESCRIBIR CUALQUIER CÓDIGO:**
1. Usa Context7 MCP para obtener documentación actualizada de cada API
2. NO uses código de memoria - siempre verifica con Context7
3. Lee las skills disponibles en `/mnt/skills/`

### Queries para Context7:
```
# OpenAI GPT Image 1.5
context7: openai images api gpt-image-1.5 generate

# Kie.ai Seedream
context7: kie.ai seedream api documentation

# Black Forest Labs FLUX
context7: black forest labs flux api bfl.ai documentation

# Canva Button API
context7: canva design button api integration
```

---

## 📋 VARIABLES DE ENTORNO (Ya configuradas en Vercel)

```env
# OpenAI - Para GPT Image 1.5
OPENAI_API_KEY=sk-...

# Kie.ai - Para Seedream 4.5
KIE_API_KEY=...

# Black Forest Labs - Para FLUX (opcional)
BFL_API_KEY=...
```

---

## 🔧 ARQUITECTURA A IMPLEMENTAR

### Estructura de Archivos:

```
lib/
├── image-providers/           # CREAR NUEVO
│   ├── index.ts               # Export unificado
│   ├── types.ts               # Interfaces comunes
│   ├── openai.ts              # GPT Image 1.5
│   ├── kie-seedream.ts        # Seedream 4.5 via Kie.ai
│   ├── bfl-flux.ts            # FLUX via BFL directo
│   └── gemini.ts              # Mover código actual aquí
└── constants/
    └── countries.ts           # CREAR - Lista de países y monedas
components/
└── generator/
    ├── ModelSelector.tsx      # CREAR - Selector de modelo IA
    ├── CountrySelector.tsx    # CREAR - Selector de país
    ├── PricingControls.tsx    # CREAR - Controles de precios
    └── CanvaButton.tsx        # CREAR - Botón editar en Canva
app/
└── api/
    └── generate-landing/
        └── route.ts           # MODIFICAR - agregar nuevos campos
```

---

## 🌍 SELECTOR DE PAÍS Y MONEDA (NUEVO)

### Constantes de Países (lib/constants/countries.ts)

```typescript
export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CO', name: 'Colombia', currency: 'COP', currencySymbol: '$' },
  { code: 'PE', name: 'Perú', currency: 'PEN', currencySymbol: 'S/' },
  { code: 'CL', name: 'Chile', currency: 'CLP', currencySymbol: '$' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', currencySymbol: '$' },
  { code: 'MX', name: 'México', currency: 'MXN', currencySymbol: '$' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', currencySymbol: '$' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD', currencySymbol: '$' },
  { code: 'ES', name: 'España', currency: 'EUR', currencySymbol: '€' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', currencySymbol: 'Bs' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', currencySymbol: '₲' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', currencySymbol: '$U' },
  { code: 'VE', name: 'Venezuela', currency: 'USD', currencySymbol: '$' },
  { code: 'PA', name: 'Panamá', currency: 'USD', currencySymbol: '$' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', currencySymbol: '₡' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', currencySymbol: 'Q' },
  { code: 'HN', name: 'Honduras', currency: 'HNL', currencySymbol: 'L' },
  { code: 'SV', name: 'El Salvador', currency: 'USD', currencySymbol: '$' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', currencySymbol: 'C$' },
];

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}
```

### Componente CountrySelector

```tsx
// components/generator/CountrySelector.tsx
'use client';

import { COUNTRIES, Country } from '@/lib/constants/countries';

interface Props {
  value: string; // country code
  onChange: (country: Country) => void;
  disabled?: boolean;
}

export function CountrySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <span>🌍</span> País de venta
      </label>
      <select
        value={value}
        onChange={(e) => {
          const country = COUNTRIES.find(c => c.code === e.target.value);
          if (country) onChange(country);
        }}
        disabled={disabled}
        className="w-full p-3 rounded-lg border bg-background"
      >
        <option value="">Seleccionar país...</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name} ({country.currencySymbol})
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## 💰 CONTROLES DE PRECIOS (NUEVO)

### IMPORTANTE: Lógica de precios opcionales
- Si TODOS los campos de precio están vacíos → El prompt NO incluye precios
- Si hay al menos un precio → Se incluyen los precios que estén llenos
- El símbolo de moneda se puede editar manualmente después de seleccionar país

### Componente PricingControls

```tsx
// components/generator/PricingControls.tsx
'use client';

interface PricingData {
  currencySymbol: string;
  priceAfter: string;      // Precio oferta (principal)
  priceBefore: string;     // Precio antes (tachado)
  priceCombo2: string;     // Precio 2 unidades
  priceCombo3: string;     // Precio 3 unidades
}

interface Props {
  value: PricingData;
  onChange: (data: PricingData) => void;
  disabled?: boolean;
}

export function PricingControls({ value, onChange, disabled }: Props) {
  const updateField = (field: keyof PricingData, newValue: string) => {
    onChange({ ...value, [field]: newValue });
  };

  return (
    <div className="space-y-4">
      {/* Símbolo de moneda editable */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Símbolo de moneda</label>
        <input
          type="text"
          value={value.currencySymbol}
          onChange={(e) => updateField('currencySymbol', e.target.value)}
          disabled={disabled}
          className="w-20 p-2 rounded-lg border bg-background text-center"
          placeholder="$"
        />
        <p className="text-xs text-muted-foreground">
          Puedes modificar el símbolo manualmente
        </p>
      </div>

      {/* Precios principales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">💵 Precio Oferta</label>
          <div className="flex">
            <span className="px-3 py-2 bg-muted rounded-l-lg border border-r-0">
              {value.currencySymbol || '$'}
            </span>
            <input
              type="text"
              value={value.priceAfter}
              onChange={(e) => updateField('priceAfter', e.target.value)}
              disabled={disabled}
              placeholder="89900"
              className="flex-1 p-2 rounded-r-lg border bg-background"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">🏷️ Precio Antes</label>
          <div className="flex">
            <span className="px-3 py-2 bg-muted rounded-l-lg border border-r-0">
              {value.currencySymbol || '$'}
            </span>
            <input
              type="text"
              value={value.priceBefore}
              onChange={(e) => updateField('priceBefore', e.target.value)}
              disabled={disabled}
              placeholder="109900"
              className="flex-1 p-2 rounded-r-lg border bg-background"
            />
          </div>
          <p className="text-xs text-muted-foreground">Precio tachado</p>
        </div>
      </div>

      {/* Precios por cantidad */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">📦 Precio 2 Unidades</label>
          <div className="flex">
            <span className="px-3 py-2 bg-muted rounded-l-lg border border-r-0">
              {value.currencySymbol || '$'}
            </span>
            <input
              type="text"
              value={value.priceCombo2}
              onChange={(e) => updateField('priceCombo2', e.target.value)}
              disabled={disabled}
              placeholder="139900"
              className="flex-1 p-2 rounded-r-lg border bg-background"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">📦 Precio 3 Unidades</label>
          <div className="flex">
            <span className="px-3 py-2 bg-muted rounded-l-lg border border-r-0">
              {value.currencySymbol || '$'}
            </span>
            <input
              type="text"
              value={value.priceCombo3}
              onChange={(e) => updateField('priceCombo3', e.target.value)}
              disabled={disabled}
              placeholder="179900"
              className="flex-1 p-2 rounded-r-lg border bg-background"
            />
          </div>
        </div>
      </div>

      {/* Nota sobre precios opcionales */}
      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        💡 Los precios son opcionales. Si dejas todos vacíos, el banner se generará sin precios.
      </p>
    </div>
  );
}
```

---

## 🎨 INTERFACE ACTUALIZADA (types.ts)

```typescript
export type ImageModel = 
  | 'gemini-2.5-flash-image'
  | 'gpt-image-1.5'
  | 'seedream-4.5'
  | 'flux-pro-1.1'
  | 'flux-dev';

export interface ImageGenerationRequest {
  model: ImageModel;
  prompt: string;
  templateImage?: string;
  productImages: string[];
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5';
  quality?: 'low' | 'medium' | 'high';
  
  // Producto
  productName: string;
  productDetails?: string;
  
  // País y moneda
  targetCountry?: string;      // Código de país (CO, MX, PE, etc.)
  currencySymbol?: string;     // $, S/, €, etc.
  
  // Precios (TODOS OPCIONALES - si vacíos, no se incluyen en prompt)
  priceAfter?: string;         // Precio oferta principal
  priceBefore?: string;        // Precio antes (tachado)
  priceCombo2?: string;        // Precio 2 unidades
  priceCombo3?: string;        // Precio 3 unidades
  
  // Creatividad
  salesAngle?: string;
  targetAvatar?: string;
  additionalInstructions?: string;
}

// Helper para verificar si hay precios
export function hasPricing(request: ImageGenerationRequest): boolean {
  return !!(
    request.priceAfter || 
    request.priceBefore || 
    request.priceCombo2 || 
    request.priceCombo3
  );
}

// Helper para construir sección de precios del prompt
export function buildPricingPrompt(request: ImageGenerationRequest): string {
  if (!hasPricing(request)) {
    return 'NO incluir precios en este banner - es solo para branding/awareness.';
  }
  
  const symbol = request.currencySymbol || '$';
  const lines: string[] = ['PRECIOS EXACTOS (usar estos valores, NO inventar):'];
  
  if (request.priceAfter) {
    lines.push(`- Precio OFERTA: ${symbol}${request.priceAfter} (grande, destacado)`);
  }
  if (request.priceBefore) {
    lines.push(`- Precio ANTES: ${symbol}${request.priceBefore} (tachado, más pequeño)`);
  }
  if (request.priceCombo2) {
    lines.push(`- Precio 2 UNIDADES: ${symbol}${request.priceCombo2}`);
  }
  if (request.priceCombo3) {
    lines.push(`- Precio 3 UNIDADES: ${symbol}${request.priceCombo3}`);
  }
  
  return lines.join('\n');
}
```

---

## 🖼️ BOTÓN EDITAR EN CANVA (NUEVO)

### Componente CanvaButton

```tsx
// components/generator/CanvaButton.tsx
'use client';

import { useEffect, useState } from 'react';

interface Props {
  imageUrl: string;           // URL o base64 de la imagen generada
  designType?: 'InstagramStory' | 'Poster' | 'FacebookPost';
  disabled?: boolean;
}

export function CanvaButton({ imageUrl, designType = 'InstagramStory', disabled }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [canvaReady, setCanvaReady] = useState(false);

  // Cargar SDK de Canva
  useEffect(() => {
    // VERIFICAR CON CONTEXT7 la URL correcta del SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.canva.com/designbutton/v2/api.js';
    script.async = true;
    script.onload = () => setCanvaReady(true);
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const openInCanva = async () => {
    if (!canvaReady || !window.Canva) return;
    
    setIsLoading(true);
    try {
      // VERIFICAR CON CONTEXT7 el método correcto de inicialización
      const api = await window.Canva.DesignButton.initialize({
        apiKey: process.env.NEXT_PUBLIC_CANVA_API_KEY,
      });

      await api.createDesign({
        design: {
          type: designType,
        },
        editor: {
          publishLabel: 'Descargar',
        },
        onDesignOpen: ({ designId }) => {
          console.log('Canva design opened:', designId);
        },
        onDesignPublish: ({ exportUrl }) => {
          console.log('Design exported:', exportUrl);
          // Aquí podrías guardar la URL editada
        },
      });
    } catch (error) {
      console.error('Error opening Canva:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={openInCanva}
      disabled={disabled || !canvaReady || isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-[#00C4CC] hover:bg-[#00B4BC] text-white rounded-lg transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )}
      Editar en Canva
    </button>
  );
}

// Agregar tipos para window
declare global {
  interface Window {
    Canva?: {
      DesignButton: {
        initialize: (config: any) => Promise<any>;
      };
    };
  }
}
```

### Variable de entorno para Canva
```env
# Agregar en Vercel
NEXT_PUBLIC_CANVA_API_KEY=...
```

---

## 📚 DOCUMENTACIÓN DE CADA API

### 1. OpenAI GPT Image 1.5

**Model ID:** `gpt-image-1.5`
**Endpoint:** `https://api.openai.com/v1/images/generations`

**Características:**
- Mejor renderizado de texto en español
- Edición precisa de imágenes
- Soporta hasta 16 imágenes de referencia
- Tamaños: 1024x1024, 1536x1024, 1024x1536

### 2. Kie.ai - Seedream 4.5

**Base URL:** `https://api.kie.ai/v1`
**Precio:** $0.032/imagen

**Características:**
- Excelente para texto en imágenes
- Soporta hasta 10 imágenes de referencia
- Resolución hasta 4K

### 3. Black Forest Labs - FLUX

**Base URL:** `https://api.bfl.ai/v1`
**Docs:** https://docs.bfl.ml

**Modelos:**
- `flux-pro-1.1` - Mejor calidad ($0.04/img)
- `flux-dev` - Para desarrollo

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Estructura Base
- [ ] Crear carpeta `lib/image-providers/`
- [ ] Crear `types.ts` con interfaces actualizadas
- [ ] Crear `index.ts` con router
- [ ] Crear `lib/constants/countries.ts`

### Fase 2: Providers
- [ ] Mover código Gemini actual a `gemini.ts`
- [ ] Implementar `openai.ts` (GPT Image 1.5)
- [ ] Implementar `kie-seedream.ts` (Seedream 4.5)
- [ ] Implementar `bfl-flux.ts` (FLUX)

### Fase 3: UI Components
- [ ] Crear `ModelSelector.tsx` (selector tipo Freepik)
- [ ] Crear `CountrySelector.tsx` (países LATAM)
- [ ] Crear `PricingControls.tsx` (precios opcionales)
- [ ] Crear `CanvaButton.tsx` (editar en Canva)
- [ ] Integrar componentes en página de generación

### Fase 4: Backend
- [ ] Modificar `route.ts` para aceptar nuevos campos
- [ ] Implementar lógica de precios opcionales en prompt
- [ ] Agregar validación de API keys por modelo

### Fase 5: Deployment
- [ ] Agregar NEXT_PUBLIC_CANVA_API_KEY en Vercel
- [ ] Test en producción
- [ ] Monitoreo de errores

---

## 🚨 NOTAS IMPORTANTES

1. **Context7 SIEMPRE**: Antes de implementar cada provider/componente, usa Context7.

2. **Precios Opcionales**: Si todos los campos de precio están vacíos, el prompt debe indicar que NO incluya precios.

3. **Moneda Editable**: Aunque se autocomplete al seleccionar país, el usuario puede editarla manualmente.

4. **Canva SDK**: Verificar con Context7 la versión más reciente del SDK de Canva Design Button.

5. **Error Handling**: Cada provider debe manejar sus propios errores consistentemente.

---

**Actualizado:** 2025-01-21
**Proyecto:** estrategas-landing-generator
**Owner:** AndresEstradaR
