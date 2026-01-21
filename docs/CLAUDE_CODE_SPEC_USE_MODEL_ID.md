# 🔧 SPEC: Usar modelId correcto en cada Provider

## Problema Actual
El usuario selecciona un modelo específico (ej: "Imagen 4 Ultra") pero el backend SIEMPRE usa el mismo modelo hardcodeado (ej: "gemini-2.5-flash-image"). El `modelId` se recibe pero NO se usa.

## Solución
Pasar el `modelId` seleccionado a cada provider y usar el endpoint/modelo correcto de la API.

---

## 📝 CAMBIOS REQUERIDOS

### 1. Frontend: Pasar modelId en el request

**Archivo:** `app/(dashboard)/dashboard/landing/[id]/page.tsx`

En la función `handleGenerate`, asegurarse de enviar `modelId`:

```typescript
const response = await fetch('/api/generate-landing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // ... otros campos
    modelId: selectedModel, // El ID del modelo seleccionado (ej: 'imagen-4-ultra')
    // ...
  }),
})
```

### 2. Backend: Pasar modelId al provider

**Archivo:** `app/api/generate-landing/route.ts`

Agregar `modelId` al `GenerateImageRequest`:

```typescript
const generateRequest: GenerateImageRequest = {
  provider: selectedProvider,
  modelId: modelId, // <-- AGREGAR ESTO
  prompt: '',
  templateBase64,
  // ... resto
}
```

### 3. Types: Agregar modelId al request

**Archivo:** `lib/image-providers/types.ts`

```typescript
export interface GenerateImageRequest {
  provider: ImageProviderType
  modelId?: string // <-- AGREGAR ESTO
  prompt: string
  templateBase64?: string
  // ... resto
}
```

### 4. Providers: Usar el modelId correcto

---

## 🔵 GOOGLE (gemini.ts)

**Mapeo de modelos:**

```typescript
const GOOGLE_MODEL_ENDPOINTS: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-image-generation',
  'imagen-3': 'imagen-3.0-generate-001',
  'imagen-4-fast': 'imagegeneration@006', // Verificar con Context7
  'imagen-4': 'imagegeneration@006',
  'imagen-4-ultra': 'imagegeneration@006',
}
```

**Usar en generate():**

```typescript
async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
  // Determinar el modelo a usar
  const modelId = request.modelId || 'gemini-2.5-flash'
  const apiModel = GOOGLE_MODEL_ENDPOINTS[modelId] || 'gemini-2.5-flash-preview-image-generation'
  
  // Usar el modelo correcto en el endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`
  
  // ... resto del código
}
```

**IMPORTANTE:** Usa Context7 para verificar los nombres exactos de los modelos de Google Imagen 3/4.

---

## 🤖 OPENAI (openai.ts)

**Mapeo de modelos:**

```typescript
const OPENAI_MODEL_ENDPOINTS: Record<string, string> = {
  'gpt-image-1.5': 'gpt-image-1', // Verificar nombre real con Context7
}
```

**Usar en generate():**

```typescript
const modelId = request.modelId || 'gpt-image-1.5'
const apiModel = OPENAI_MODEL_ENDPOINTS[modelId] || 'gpt-image-1'

// En el body del request:
body: JSON.stringify({
  model: apiModel,
  // ...
})
```

---

## 🌱 BYTEDANCE/SEEDREAM (kie-seedream.ts)

**Mapeo de modelos:**

```typescript
const SEEDREAM_MODEL_ENDPOINTS: Record<string, string> = {
  'seedream-4.5': 'seedream-4.5',
  'seedream-4': 'seedream-4',
  'seedream-4-4k': 'seedream-4-4k',
  'seedream-3': 'seedream-3',
}
```

**Usar en generate():**

```typescript
const modelId = request.modelId || 'seedream-4.5'
const apiModel = SEEDREAM_MODEL_ENDPOINTS[modelId] || 'seedream-4.5'

// Usar apiModel en el request a KIE.ai
```

**IMPORTANTE:** Usa Context7 para verificar los nombres exactos de los modelos en la API de KIE.ai.

---

## ⚡ FLUX (bfl-flux.ts)

**Mapeo de modelos:**

```typescript
const FLUX_MODEL_ENDPOINTS: Record<string, string> = {
  'flux-2-max': 'flux-pro-1.1-ultra', // Verificar con Context7
  'flux-2-klein': 'flux-schnell',
  'flux-2-pro': 'flux-pro-1.1',
  'flux-2-flex': 'flux-pro-1.1',
  'flux-1-kontext-max': 'flux-kontext-max',
  'flux-1-kontext-pro': 'flux-kontext-pro',
  'flux-1': 'flux-pro',
  'flux-1-fast': 'flux-schnell',
  'flux-1-realism': 'flux-pro-1.1',
  'flux-1.1': 'flux-pro-1.1',
}
```

**Usar en generate():**

```typescript
const modelId = request.modelId || 'flux-2-pro'
const apiModel = FLUX_MODEL_ENDPOINTS[modelId] || 'flux-pro-1.1'

// Usar apiModel en el endpoint de BFL
const endpoint = `https://api.bfl.ml/v1/${apiModel}`
```

**IMPORTANTE:** Usa Context7 para verificar los endpoints exactos de cada modelo FLUX.

---

## ✅ CHECKLIST

- [ ] Agregar `modelId?: string` a `GenerateImageRequest` en types.ts
- [ ] Frontend envía `modelId` en el request
- [ ] Backend pasa `modelId` al provider
- [ ] gemini.ts usa el modelo correcto según modelId
- [ ] openai.ts usa el modelo correcto según modelId
- [ ] kie-seedream.ts usa el modelo correcto según modelId
- [ ] bfl-flux.ts usa el modelo correcto según modelId
- [ ] Verificar nombres de API con Context7 ANTES de implementar
- [ ] Hacer PUSH a GitHub (NO trabajar en local)

---

## ⚠️ INSTRUCCIONES CRÍTICAS PARA CLAUDE CODE

1. **USA GITHUB MCP** para hacer los cambios - NO trabajes en local
2. **Usa Context7** para verificar los nombres exactos de cada API:
   - `context7: google imagen api models`
   - `context7: openai gpt-image api`
   - `context7: kie.ai seedream api models`
   - `context7: black forest labs flux api endpoints`
3. **Haz commits pequeños** - uno por archivo modificado
4. **NO hagas cambios en local** - usa `github:create_or_update_file` directamente

---

## 🎯 RESULTADO ESPERADO

Cuando el usuario seleccione "Imagen 4 Ultra", el backend debe usar el modelo `imagen-4.0-ultra` de Google, NO `gemini-2.5-flash-image`.

Cuando seleccione "FLUX 2 Pro", debe usar el endpoint correcto de BFL, NO uno genérico.
