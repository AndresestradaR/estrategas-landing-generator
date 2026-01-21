# 🔧 FIX URGENTE: Google solo 2 modelos que soportan imágenes

## Problema
- Los modelos Imagen 3, 4, 4 Fast, 4 Ultra NO soportan imagen de entrada
- Falta Gemini 3 Pro Image que es el MEJOR modelo

## Solución
Google debe tener SOLO 2 modelos:
1. **Gemini 3 Pro Image** (RECOMENDADO) - apiModelId: `gemini-3-pro-image-preview`
2. **Gemini 2.5 Flash** (FAST, gratis) - apiModelId: `gemini-2.5-flash-preview-image-generation`

---

## CAMBIOS EXACTOS en `lib/image-providers/types.ts`

### 1. Actualizar ImageModelId - SOLO estos de Google:

```typescript
export type ImageModelId =
  // Google (2 modelos SOLAMENTE)
  | 'gemini-3-pro-image'
  | 'gemini-2.5-flash'
  // OpenAI (1 model)
  | 'gpt-image-1.5'
  // ByteDance (4 models)
  | 'seedream-4.5'
  | 'seedream-4'
  | 'seedream-4-4k'
  | 'seedream-3'
  // FLUX (10 models)
  | 'flux-2-max'
  | 'flux-2-klein'
  | 'flux-2-pro'
  | 'flux-2-flex'
  | 'flux-1-kontext-max'
  | 'flux-1-kontext-pro'
  | 'flux-1'
  | 'flux-1-fast'
  | 'flux-1-realism'
  | 'flux-1.1'
```

### 2. Reemplazar TODA la sección de Google en IMAGE_MODELS:

```typescript
// ============================================
// GOOGLE (2 modelos que soportan imagen de entrada)
// ============================================
'gemini-3-pro-image': {
  id: 'gemini-3-pro-image',
  name: 'Gemini 3 Pro Image',
  description: 'Mejor calidad, texto 94% preciso, hasta 14 imagenes de referencia',
  company: 'google',
  companyName: 'Google',
  supportsImageInput: true,
  supportsAspectRatio: true,
  maxImages: 14,
  requiresPolling: false,
  pricePerImage: '~$0.13-0.24',
  recommended: true,
  tags: ['RECOMENDADO', 'BEST_TEXT', 'PREMIUM', 'NEW'],
  apiModelId: 'gemini-3-pro-image-preview',
},
'gemini-2.5-flash': {
  id: 'gemini-2.5-flash',
  name: 'Gemini 2.5 Flash',
  description: 'Gratis pero menor calidad de texto',
  company: 'google',
  companyName: 'Google',
  supportsImageInput: true,
  supportsAspectRatio: true,
  maxImages: 1,
  requiresPolling: false,
  pricePerImage: 'GRATIS',
  recommended: false,
  tags: ['FAST'],
  apiModelId: 'gemini-2.5-flash-preview-image-generation',
},
```

### 3. ELIMINAR estos modelos de IMAGE_MODELS:
- `'imagen-3'` - ELIMINAR TODO EL BLOQUE
- `'imagen-4-fast'` - ELIMINAR TODO EL BLOQUE
- `'imagen-4'` - ELIMINAR TODO EL BLOQUE
- `'imagen-4-ultra'` - ELIMINAR TODO EL BLOQUE

### 4. Actualizar IMAGE_COMPANY_GROUPS para Google:

```typescript
{
  id: 'google',
  name: 'Google',
  icon: 'Sparkles',
  color: 'from-blue-500 to-purple-500',
  models: [
    IMAGE_MODELS['gemini-3-pro-image'],
    IMAGE_MODELS['gemini-2.5-flash'],
  ],
},
```

---

## ⚠️ INSTRUCCIONES CRÍTICAS

1. **Usar GitHub MCP** (github:create_or_update_file) - NO trabajar en local
2. **Eliminar completamente** los modelos Imagen 3, 4, 4 Fast, 4 Ultra
3. **Agregar** gemini-3-pro-image como PRIMER modelo de Google
4. **Hacer push** después del cambio

## RESULTADO FINAL

Google tendrá exactamente 2 modelos:
| Modelo | apiModelId | Soporta Imagenes | Recomendado |
|--------|-----------|------------------|-------------|
| Gemini 3 Pro Image | gemini-3-pro-image-preview | ✅ Hasta 14 | ✅ Sí |
| Gemini 2.5 Flash | gemini-2.5-flash-preview-image-generation | ✅ Sí | ❌ No |
