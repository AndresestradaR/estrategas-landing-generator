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
└── image-providers/           # CREAR NUEVO
    ├── index.ts               # Export unificado
    ├── types.ts               # Interfaces comunes
    ├── openai.ts              # GPT Image 1.5
    ├── kie-seedream.ts        # Seedream 4.5 via Kie.ai
    ├── bfl-flux.ts            # FLUX via BFL directo
    └── gemini.ts              # Mover código actual aquí
components/
└── generator/
    └── ModelSelector.tsx      # CREAR - UI para seleccionar modelo
app/
└── api/
    └── generate-landing/
        └── route.ts           # MODIFICAR - agregar selector de modelo
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

## 🎨 INTERFACE COMÚN (types.ts)

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
  productName: string;
  productDetails?: string;
  salesAngle?: string;
  targetAvatar?: string;
  priceAfter?: string;
  priceBefore?: string;
  currencySymbol?: string;
  additionalInstructions?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
  error?: string;
  model: ImageModel;
  generationTime?: number;
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Estructura Base
- [ ] Crear carpeta `lib/image-providers/`
- [ ] Crear `types.ts` con interfaces
- [ ] Crear `index.ts` con router

### Fase 2: Providers
- [ ] Mover código Gemini actual a `gemini.ts`
- [ ] Implementar `openai.ts` (GPT Image 1.5)
- [ ] Implementar `kie-seedream.ts` (Seedream 4.5)
- [ ] Implementar `bfl-flux.ts` (FLUX)

### Fase 3: UI
- [ ] Crear `ModelSelector.tsx`
- [ ] Integrar selector en página de generación

### Fase 4: Backend
- [ ] Modificar `route.ts` para aceptar `model`
- [ ] Agregar validación de API keys por modelo

---

**Creado:** 2025-01-21
