# 🔧 FIX: Lista Exacta de Modelos por Empresa

## Problema
Claude Code puso modelos que no pedimos y omitió los que sí queríamos.

## Lista EXACTA de modelos (NO agregar ni quitar)

### 🔵 Google (5 modelos)
| Modelo | Tags | Precio | Descripción |
|--------|------|--------|-------------|
| Gemini 2.5 Flash | RECOMENDADO, BEST TEXT, FAST | ~$0.02 | Mejor para texto legible en banners |
| Imagen 3 | - | ~$0.03 | High-quality images |
| Imagen 4 Fast | FAST | ~$0.02 | Generación rápida |
| Imagen 4 | - | ~$0.04 | Incredible prompt adherence |
| Imagen 4 Ultra | PREMIUM | ~$0.06 | Ultra quality |

### 🤖 OpenAI (1 modelo SOLAMENTE)
| Modelo | Tags | Precio | Descripción |
|--------|------|--------|-------------|
| GPT Image 1.5 | RECOMENDADO, NEW, TRENDING | ~$0.04 | Última versión - Mejor calidad general |

**IMPORTANTE: NO incluir GPT Image 1 ni GPT Image 1 Mini. SOLO GPT Image 1.5**

### 🌱 ByteDance/Seedream (4 modelos)
| Modelo | Tags | Precio | Descripción |
|--------|------|--------|-------------|
| Seedream 4.5 | RECOMENDADO, TRENDING | ~$0.032 | Highly aesthetic multi-image |
| Seedream 4 | - | ~$0.03 | Multi-image generation and editing |
| Seedream 4 4K | 4K | ~$0.04 | 4K with reference images |
| Seedream 3 | - | ~$0.02 | Exceptional creativity |

### ⚡ Black Forest Labs/FLUX (10 modelos)
| Modelo | Tags | Precio | Descripción |
|--------|------|--------|-------------|
| Flux.2 Max | PREMIUM | ~$0.08 | Advanced editing, maximum quality |
| Flux 2 Klein | NEW, FAST | ~$0.02 | Fast with high quality |
| Flux.2 Pro | RECOMENDADO, NEW | ~$0.05 | Next-gen editing and generation |
| Flux.2 Flex | NEW | ~$0.05 | Typography support |
| Flux.1 Kontext Max | - | ~$0.05 | Best for pros with reference images |
| Flux.1 Kontext Pro | - | ~$0.04 | Daily use, reference images |
| Flux.1 | - | ~$0.01 | Base model |
| Flux.1 Fast | FAST | ~$0.01 | <1s generations |
| Flux.1 Realism | - | ~$0.03 | Photorealism only |
| Flux.1.1 | - | ~$0.02 | Improved base |

---

## 📝 Código a actualizar

### lib/image-providers/types.ts

```typescript
// LISTA EXACTA - NO MODIFICAR
export const IMAGE_COMPANY_GROUPS = [
  {
    id: 'google',
    name: 'Google',
    icon: 'Sparkles', // lucide icon
    color: '#4285F4',
    models: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Mejor para texto legible en banners',
        price: '~$0.02',
        tags: ['RECOMENDADO', 'BEST_TEXT', 'FAST'],
        apiModelId: 'gemini-2.5-flash-preview-image-generation',
      },
      {
        id: 'imagen-3',
        name: 'Imagen 3',
        description: 'High-quality images',
        price: '~$0.03',
        tags: [],
        apiModelId: 'imagen-3',
      },
      {
        id: 'imagen-4-fast',
        name: 'Imagen 4 Fast',
        description: 'Generación rápida',
        price: '~$0.02',
        tags: ['FAST'],
        apiModelId: 'imagen-4-fast',
      },
      {
        id: 'imagen-4',
        name: 'Imagen 4',
        description: 'Incredible prompt adherence',
        price: '~$0.04',
        tags: [],
        apiModelId: 'imagen-4',
      },
      {
        id: 'imagen-4-ultra',
        name: 'Imagen 4 Ultra',
        description: 'Ultra quality',
        price: '~$0.06',
        tags: ['PREMIUM'],
        apiModelId: 'imagen-4-ultra',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Zap',
    color: '#10A37F',
    models: [
      // SOLO ESTE MODELO - NO AGREGAR MÁS
      {
        id: 'gpt-image-1.5',
        name: 'GPT Image 1.5',
        description: 'Última versión - Mejor calidad general',
        price: '~$0.04',
        tags: ['RECOMENDADO', 'NEW', 'TRENDING'],
        apiModelId: 'gpt-image-1.5',
      },
    ],
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    icon: 'ImagePlus',
    color: '#FF6B35',
    models: [
      {
        id: 'seedream-4.5',
        name: 'Seedream 4.5',
        description: 'Highly aesthetic multi-image',
        price: '~$0.032',
        tags: ['RECOMENDADO', 'TRENDING'],
        apiModelId: 'seedream-4.5',
      },
      {
        id: 'seedream-4',
        name: 'Seedream 4',
        description: 'Multi-image generation and editing',
        price: '~$0.03',
        tags: [],
        apiModelId: 'seedream-4',
      },
      {
        id: 'seedream-4-4k',
        name: 'Seedream 4 4K',
        description: '4K with reference images',
        price: '~$0.04',
        tags: ['4K'],
        apiModelId: 'seedream-4-4k',
      },
      {
        id: 'seedream-3',
        name: 'Seedream 3',
        description: 'Exceptional creativity',
        price: '~$0.02',
        tags: [],
        apiModelId: 'seedream-3',
      },
    ],
  },
  {
    id: 'bfl',
    name: 'Black Forest Labs',
    icon: 'Cpu',
    color: '#8B5CF6',
    models: [
      {
        id: 'flux-2-max',
        name: 'Flux.2 Max',
        description: 'Advanced editing, maximum quality',
        price: '~$0.08',
        tags: ['PREMIUM'],
        apiModelId: 'flux-2-max',
      },
      {
        id: 'flux-2-klein',
        name: 'Flux 2 Klein',
        description: 'Fast with high quality',
        price: '~$0.02',
        tags: ['NEW', 'FAST'],
        apiModelId: 'flux-2-klein',
      },
      {
        id: 'flux-2-pro',
        name: 'Flux.2 Pro',
        description: 'Next-gen editing and generation',
        price: '~$0.05',
        tags: ['RECOMENDADO', 'NEW'],
        apiModelId: 'flux-2-pro',
      },
      {
        id: 'flux-2-flex',
        name: 'Flux.2 Flex',
        description: 'Typography support',
        price: '~$0.05',
        tags: ['NEW'],
        apiModelId: 'flux-2-flex',
      },
      {
        id: 'flux-1-kontext-max',
        name: 'Flux.1 Kontext Max',
        description: 'Best for pros with reference images',
        price: '~$0.05',
        tags: [],
        apiModelId: 'flux-1-kontext-max',
      },
      {
        id: 'flux-1-kontext-pro',
        name: 'Flux.1 Kontext Pro',
        description: 'Daily use, reference images',
        price: '~$0.04',
        tags: [],
        apiModelId: 'flux-1-kontext-pro',
      },
      {
        id: 'flux-1',
        name: 'Flux.1',
        description: 'Base model',
        price: '~$0.01',
        tags: [],
        apiModelId: 'flux-1',
      },
      {
        id: 'flux-1-fast',
        name: 'Flux.1 Fast',
        description: '<1s generations',
        price: '~$0.01',
        tags: ['FAST'],
        apiModelId: 'flux-1-fast',
      },
      {
        id: 'flux-1-realism',
        name: 'Flux.1 Realism',
        description: 'Photorealism only',
        price: '~$0.03',
        tags: [],
        apiModelId: 'flux-1-realism',
      },
      {
        id: 'flux-1.1',
        name: 'Flux.1.1',
        description: 'Improved base',
        price: '~$0.02',
        tags: [],
        apiModelId: 'flux-1.1',
      },
    ],
  },
];
```

---

## ⚠️ INSTRUCCIONES PARA CLAUDE CODE

1. **Reemplaza** la constante `IMAGE_COMPANY_GROUPS` en `lib/image-providers/types.ts` con la lista de arriba

2. **NO uses Context7** para esta tarea - usa EXACTAMENTE los modelos de este spec

3. **Verifica** que el total sea:
   - Google: 5 modelos
   - OpenAI: 1 modelo (SOLO GPT Image 1.5)
   - ByteDance: 4 modelos
   - FLUX: 10 modelos
   - **Total: 20 modelos**

4. Los `apiModelId` pueden necesitar verificación con Context7 SOLO para los IDs reales de la API, pero la LISTA de modelos no debe cambiar.

---

## ✅ CHECKLIST

- [ ] Google tiene exactamente 5 modelos (Gemini 2.5 Flash, Imagen 3, Imagen 4 Fast, Imagen 4, Imagen 4 Ultra)
- [ ] OpenAI tiene SOLO 1 modelo (GPT Image 1.5) - NO incluir GPT Image 1 ni Mini
- [ ] ByteDance tiene exactamente 4 modelos (Seedream 4.5, 4, 4 4K, 3)
- [ ] FLUX tiene exactamente 10 modelos
- [ ] Hacer push a GitHub después de los cambios
