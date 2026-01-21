# 🔧 FIX: Agregar Gemini 3 Pro Image como modelo principal

## Problema
- Gemini 2.5 Flash es GRATIS pero malo para seguir instrucciones
- Gemini 3 Pro Image es el modelo RECOMENDADO por Google para:
  - Texto preciso (94% vs ~60%)
  - Imágenes de referencia (hasta 14)
  - Calidad profesional

## Solución
Agregar `gemini-3-pro-image` a la lista de modelos de Google y hacerlo el RECOMENDADO.

---

## 📝 CAMBIOS EN `lib/image-providers/types.ts`

### 1. Agregar al tipo ImageModelId

```typescript
export type ImageModelId =
  // Google (6 modelos ahora)
  | 'gemini-3-pro-image'  // <-- AGREGAR ESTE
  | 'gemini-2.5-flash'
  | 'imagen-3'
  // ... resto
```

### 2. Agregar configuración del modelo

```typescript
'gemini-3-pro-image': {
  id: 'gemini-3-pro-image',
  name: 'Gemini 3 Pro Image',
  description: 'Mejor calidad, texto 94% preciso, hasta 14 imágenes de referencia',
  company: 'google',
  companyName: 'Google',
  supportsImageInput: true,  // ✅ SÍ SOPORTA IMÁGENES
  supportsAspectRatio: true,
  maxImages: 14,  // Hasta 14 imágenes de referencia
  requiresPolling: false,
  pricePerImage: '~$0.13-0.24',
  recommended: true,  // Este es el RECOMENDADO ahora
  tags: ['RECOMENDADO', 'BEST_TEXT', 'PREMIUM', 'NEW'],
  apiModelId: 'gemini-3-pro-image-preview',
},
```

### 3. Quitar RECOMENDADO de Gemini 2.5 Flash

```typescript
'gemini-2.5-flash': {
  // ...
  recommended: false,  // Ya no es el recomendado
  tags: ['FAST'],  // Solo FAST, quitar RECOMENDADO y BEST_TEXT
  // ...
},
```

### 4. Actualizar IMAGE_COMPANY_GROUPS

```typescript
{
  id: 'google',
  name: 'Google',
  icon: 'Sparkles',
  color: 'from-blue-500 to-purple-500',
  models: [
    IMAGE_MODELS['gemini-3-pro-image'],  // Primero el recomendado
    IMAGE_MODELS['gemini-2.5-flash'],
    IMAGE_MODELS['imagen-3'],
    IMAGE_MODELS['imagen-4-fast'],
    IMAGE_MODELS['imagen-4'],
    IMAGE_MODELS['imagen-4-ultra'],
  ],
},
```

---

## 📝 CAMBIOS EN `lib/image-providers/gemini.ts`

### Actualizar isGeminiModel() para incluir el nuevo modelo

```typescript
function isGeminiModel(modelId: string): boolean {
  return modelId.startsWith('gemini-')
}
```

Esto ya debería funcionar porque `gemini-3-pro-image` empieza con `gemini-`.

### Verificar que generateWithGemini use el endpoint correcto

El endpoint debe ser:
```typescript
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelId}:generateContent`
```

Con `apiModelId = 'gemini-3-pro-image-preview'` debería funcionar.

---

## ✅ RESULTADO ESPERADO

| Modelo | Posición | Tags | Recomendado |
|--------|----------|------|-------------|
| Gemini 3 Pro Image | 1º (primero) | RECOMENDADO, BEST_TEXT, PREMIUM, NEW | ✅ Sí |
| Gemini 2.5 Flash | 2º | FAST | ❌ No |
| Imagen 3 | 3º | - | ❌ No |
| Imagen 4 Fast | 4º | FAST | ❌ No |
| Imagen 4 | 5º | - | ❌ No |
| Imagen 4 Ultra | 6º | PREMIUM | ❌ No |

---

## ⚠️ IMPORTANTE

1. `gemini-3-pro-image-preview` es el apiModelId correcto según la documentación de Google
2. Este modelo usa `generateContent` (como 2.5 Flash), NO `predict` (como Imagen)
3. Soporta hasta 14 imágenes de entrada - PERFECTO para plantilla + producto
4. El precio es más alto (~$0.13-0.24) pero la calidad es mucho mejor

---

## 🔗 Referencias

- Documentación: https://ai.google.dev/gemini-api/docs/image-generation
- Modelo: gemini-3-pro-image-preview
- Máximo imágenes: 14 (6 objetos + 5 personas + extras)
