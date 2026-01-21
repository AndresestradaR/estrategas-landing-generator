# 🎨 ESPECIFICACIÓN: Model Selector Jerárquico (Por Empresa)

## Contexto
El selector actual muestra 1 modelo por empresa. Necesitamos mostrar TODOS los modelos agrupados por empresa, con UI jerárquica.

---

## 🎯 ESTRUCTURA DE MODELOS

### 🔵 Google (API: Google AI Studio)
| Modelo | ID API | Descripción | Precio aprox |
|--------|--------|-------------|--------------|
| Nano Banana Pro | `nano-banana-pro` | Highest quality from Google | Alto |
| Nano Banana | `nano-banana` | High quality | Medio |
| Imagen 3 | `imagen-3` | High-quality images | Medio |
| Imagen 4 Fast | `imagen-4-fast` | Faster generation | Bajo |
| Imagen 4 | `imagen-4` | Incredible prompt adherence | Alto |
| Imagen 4 Ultra | `imagen-4-ultra` | Ultra quality | Muy Alto |

**Nota:** Verificar con Context7 los IDs exactos de la API de Google.

### 🤖 OpenAI (API: OpenAI)
| Modelo | ID API | Descripción | Precio aprox |
|--------|--------|-------------|--------------|
| GPT Image 1.5 | `gpt-image-1.5` | Best text rendering, photorealistic | ~$0.04/img |

**Solo este modelo de OpenAI.**

### 🌱 Seedream (API: Kie.ai - ByteDance)
| Modelo | ID API | Descripción | Precio aprox |
|--------|--------|-------------|--------------|
| Seedream 4.5 | `seedream-4.5` | Highly aesthetic, multi-image | ~$0.032/img |
| Seedream 4 | `seedream-4` | Multi-image generation and editing | Medio |
| Seedream 4 4K | `seedream-4-4k` | 4K with reference images | Alto |
| Seedream 3 | `seedream-3` | Exceptional creativity | Bajo |

### ⚡ FLUX (API: Black Forest Labs)
| Modelo | ID API | Descripción | Precio aprox |
|--------|--------|-------------|--------------|
| Flux.2 Max | `flux-2-max` | Maximum quality, advanced editing | Muy Alto |
| Flux 2 Klein | `flux-2-klein` | Fast with high quality | Bajo |
| Flux.2 Pro | `flux-2-pro` | Next-gen editing and generation | Alto |
| Flux.2 Flex | `flux-2-flex` | Typography support | Alto |
| Flux.1 Kontext Max | `flux-1-kontext-max` | Best for reference images (pros) | Alto |
| Flux.1 Kontext Pro | `flux-1-kontext-pro` | Daily use, reference images | Medio |
| Flux.1 | `flux-1` | Base model | Muy Bajo |
| Flux.1 Fast | `flux-1-fast` | <1s generations | Muy Bajo |
| Flux.1 Realism | `flux-1-realism` | Photorealism only | Medio |
| Flux.1.1 | `flux-1.1` | Improved base | Bajo |

---

## 📝 TIPOS ACTUALIZADOS

### lib/image-providers/types.ts

```typescript
// Providers disponibles
export type ImageProvider = 'google' | 'openai' | 'seedream' | 'flux';

// Modelos por provider
export type GoogleModel = 
  | 'nano-banana-pro'
  | 'nano-banana'
  | 'imagen-3'
  | 'imagen-4-fast'
  | 'imagen-4'
  | 'imagen-4-ultra';

export type OpenAIModel = 'gpt-image-1.5';

export type SeedreamModel = 
  | 'seedream-4.5'
  | 'seedream-4'
  | 'seedream-4-4k'
  | 'seedream-3';

export type FluxModel = 
  | 'flux-2-max'
  | 'flux-2-klein'
  | 'flux-2-pro'
  | 'flux-2-flex'
  | 'flux-1-kontext-max'
  | 'flux-1-kontext-pro'
  | 'flux-1'
  | 'flux-1-fast'
  | 'flux-1-realism'
  | 'flux-1.1';

export type ImageModel = GoogleModel | OpenAIModel | SeedreamModel | FluxModel;

// Configuración de cada modelo
export interface ModelConfig {
  id: ImageModel;
  name: string;
  provider: ImageProvider;
  description: string;
  priceLevel: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  tags?: string[]; // 'NEW', 'TRENDING', 'FAST', etc.
  apiModelId: string; // ID real para la API del provider
}

// Configuración de cada provider
export interface ProviderConfig {
  id: ImageProvider;
  name: string;
  icon: string; // emoji o nombre de icono
  color: string; // para UI
  apiKeyField: string; // nombre del campo en profiles
  models: ModelConfig[];
}

// Exportar configuración completa
export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    icon: '🔵',
    color: '#4285F4',
    apiKeyField: 'google_api_key',
    models: [
      {
        id: 'nano-banana-pro',
        name: 'Nano Banana Pro',
        provider: 'google',
        description: 'The highest quality model from Google',
        priceLevel: 'high',
        tags: ['NEW'],
        apiModelId: 'nano-banana-pro', // VERIFICAR CON CONTEXT7
      },
      {
        id: 'nano-banana',
        name: 'Nano Banana',
        provider: 'google',
        description: 'High quality model from Google',
        priceLevel: 'medium',
        apiModelId: 'nano-banana',
      },
      {
        id: 'imagen-3',
        name: 'Imagen 3',
        provider: 'google',
        description: 'High-quality images with Google Imagen 3',
        priceLevel: 'medium',
        apiModelId: 'imagen-3',
      },
      {
        id: 'imagen-4-fast',
        name: 'Imagen 4 Fast',
        provider: 'google',
        description: 'Incredible prompt adherence, faster',
        priceLevel: 'low',
        tags: ['FAST'],
        apiModelId: 'imagen-4-fast',
      },
      {
        id: 'imagen-4',
        name: 'Imagen 4',
        provider: 'google',
        description: 'Incredible prompt adherence',
        priceLevel: 'high',
        apiModelId: 'imagen-4',
      },
      {
        id: 'imagen-4-ultra',
        name: 'Imagen 4 Ultra',
        provider: 'google',
        description: 'Ultra quality, best results',
        priceLevel: 'very-high',
        tags: ['PREMIUM'],
        apiModelId: 'imagen-4-ultra',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    color: '#10A37F',
    apiKeyField: 'openai_api_key',
    models: [
      {
        id: 'gpt-image-1.5',
        name: 'GPT Image 1.5',
        provider: 'openai',
        description: 'Best text rendering, photorealistic',
        priceLevel: 'medium',
        tags: ['NEW', 'BEST TEXT'],
        apiModelId: 'gpt-image-1.5', // VERIFICAR CON CONTEXT7
      },
    ],
  },
  {
    id: 'seedream',
    name: 'Seedream',
    icon: '🌱',
    color: '#FF6B35',
    apiKeyField: 'kie_api_key',
    models: [
      {
        id: 'seedream-4.5',
        name: 'Seedream 4.5',
        provider: 'seedream',
        description: 'Highly aesthetic multi-image generation',
        priceLevel: 'medium',
        tags: ['NEW', 'TRENDING'],
        apiModelId: 'seedream-4.5',
      },
      {
        id: 'seedream-4',
        name: 'Seedream 4',
        provider: 'seedream',
        description: 'Multi-image generation and editing',
        priceLevel: 'medium',
        apiModelId: 'seedream-4',
      },
      {
        id: 'seedream-4-4k',
        name: 'Seedream 4 4K',
        provider: 'seedream',
        description: 'The only 4K with reference images',
        priceLevel: 'high',
        tags: ['4K'],
        apiModelId: 'seedream-4-4k',
      },
      {
        id: 'seedream-3',
        name: 'Seedream 3',
        provider: 'seedream',
        description: 'Exceptional creativity',
        priceLevel: 'low',
        apiModelId: 'seedream-3',
      },
    ],
  },
  {
    id: 'flux',
    name: 'FLUX',
    icon: '⚡',
    color: '#8B5CF6',
    apiKeyField: 'bfl_api_key',
    models: [
      {
        id: 'flux-2-max',
        name: 'Flux.2 Max',
        provider: 'flux',
        description: 'Advanced editing with maximum quality',
        priceLevel: 'very-high',
        tags: ['NEW', 'PREMIUM'],
        apiModelId: 'flux-2-max',
      },
      {
        id: 'flux-2-klein',
        name: 'Flux 2 Klein',
        provider: 'flux',
        description: 'Fast generation with high quality',
        priceLevel: 'low',
        tags: ['NEW', 'FAST'],
        apiModelId: 'flux-2-klein',
      },
      {
        id: 'flux-2-pro',
        name: 'Flux.2 Pro',
        provider: 'flux',
        description: 'Next-gen image editing and generation',
        priceLevel: 'high',
        tags: ['TRENDING'],
        apiModelId: 'flux-2-pro',
      },
      {
        id: 'flux-2-flex',
        name: 'Flux.2 Flex',
        provider: 'flux',
        description: 'Image editing with typography support',
        priceLevel: 'high',
        tags: ['NEW', 'TYPOGRAPHY'],
        apiModelId: 'flux-2-flex',
      },
      {
        id: 'flux-1-kontext-max',
        name: 'Flux.1 Kontext Max',
        provider: 'flux',
        description: 'Best for pros with reference images',
        priceLevel: 'high',
        apiModelId: 'flux-1-kontext-max',
      },
      {
        id: 'flux-1-kontext-pro',
        name: 'Flux.1 Kontext Pro',
        provider: 'flux',
        description: 'Daily use with reference images',
        priceLevel: 'medium',
        apiModelId: 'flux-1-kontext-pro',
      },
      {
        id: 'flux-1',
        name: 'Flux.1',
        provider: 'flux',
        description: 'Train styles, objects, and characters',
        priceLevel: 'very-low',
        apiModelId: 'flux-1',
      },
      {
        id: 'flux-1-fast',
        name: 'Flux.1 Fast',
        provider: 'flux',
        description: '<1s generations',
        priceLevel: 'very-low',
        tags: ['FAST'],
        apiModelId: 'flux-1-fast',
      },
      {
        id: 'flux-1-realism',
        name: 'Flux.1 Realism',
        provider: 'flux',
        description: 'Photorealism only',
        priceLevel: 'medium',
        apiModelId: 'flux-1-realism',
      },
      {
        id: 'flux-1.1',
        name: 'Flux.1.1',
        provider: 'flux',
        description: 'Improved base model',
        priceLevel: 'low',
        apiModelId: 'flux-1.1',
      },
    ],
  },
];

// Helpers
export function getProviderById(id: ImageProvider): ProviderConfig | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function getModelById(id: ImageModel): ModelConfig | undefined {
  for (const provider of PROVIDERS) {
    const model = provider.models.find(m => m.id === id);
    if (model) return model;
  }
  return undefined;
}

export function getModelsByProvider(providerId: ImageProvider): ModelConfig[] {
  const provider = getProviderById(providerId);
  return provider?.models || [];
}
```

---

## 🎨 UI DEL SELECTOR JERÁRQUICO

### Diseño (Dropdown con secciones)

```
┌─────────────────────────────────────────────────────────┐
│ ✨ Modelo de IA                                         │
├─────────────────────────────────────────────────────────┤
│ [🔵 Google - Nano Banana Pro                        ▼] │
└─────────────────────────────────────────────────────────┘

Al hacer click se abre:

┌─────────────────────────────────────────────────────────┐
│ 🔵 GOOGLE                                               │
├─────────────────────────────────────────────────────────┤
│   Nano Banana Pro      NEW        The highest quality   │
│   Nano Banana                     High quality          │
│   Imagen 3                        High-quality images   │
│   Imagen 4 Fast        FAST       Faster generation     │
│   Imagen 4                        Prompt adherence      │
│   Imagen 4 Ultra       PREMIUM    Ultra quality         │
├─────────────────────────────────────────────────────────┤
│ 🤖 OPENAI                                               │
├─────────────────────────────────────────────────────────┤
│   GPT Image 1.5        NEW        Best text rendering   │
├─────────────────────────────────────────────────────────┤
│ 🌱 SEEDREAM                                             │
├─────────────────────────────────────────────────────────┤
│   Seedream 4.5         TRENDING   Multi-image aesthetic │
│   Seedream 4                      Multi-image editing   │
│   Seedream 4 4K        4K         4K with references    │
│   Seedream 3                      Exceptional creativity│
├─────────────────────────────────────────────────────────┤
│ ⚡ FLUX                                                  │
├─────────────────────────────────────────────────────────┤
│   Flux.2 Max           PREMIUM    Maximum quality       │
│   Flux 2 Klein         FAST       Fast + high quality   │
│   Flux.2 Pro           TRENDING   Next-gen editing      │
│   Flux.2 Flex          TYPOGRAPHY Typography support    │
│   Flux.1 Kontext Max              For pros              │
│   Flux.1 Kontext Pro              Daily use             │
│   Flux.1                          Base model            │
│   Flux.1 Fast          FAST       <1s generations       │
│   Flux.1 Realism                  Photorealism only     │
│   Flux.1.1                        Improved base         │
└─────────────────────────────────────────────────────────┘
```

### Componente ModelSelector.tsx

```tsx
// components/generator/ModelSelector.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { PROVIDERS, ImageModel, getModelById } from '@/lib/image-providers/types';

interface Props {
  value: ImageModel;
  onChange: (model: ImageModel) => void;
  disabled?: boolean;
  // Keys configuradas por el usuario (para mostrar cuáles están disponibles)
  configuredProviders?: string[];
}

// Colores de tags
const TAG_COLORS: Record<string, string> = {
  'NEW': 'bg-green-500/20 text-green-400',
  'TRENDING': 'bg-orange-500/20 text-orange-400',
  'FAST': 'bg-blue-500/20 text-blue-400',
  'PREMIUM': 'bg-purple-500/20 text-purple-400',
  '4K': 'bg-pink-500/20 text-pink-400',
  'BEST TEXT': 'bg-emerald-500/20 text-emerald-400',
  'TYPOGRAPHY': 'bg-cyan-500/20 text-cyan-400',
};

export function ModelSelector({ value, onChange, disabled, configuredProviders = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedModel = getModelById(value);
  const selectedProvider = PROVIDERS.find(p => p.id === selectedModel?.provider);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isProviderConfigured = (providerId: string) => {
    // Google siempre está disponible (es el default)
    if (providerId === 'google') return true;
    return configuredProviders.includes(providerId);
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Modelo de IA
      </label>
      
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between p-4 rounded-lg border
          bg-card hover:bg-card/80 transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-primary' : ''}
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedProvider?.icon}</span>
          <div className="text-left">
            <div className="font-medium">{selectedModel?.name}</div>
            <div className="text-sm text-muted-foreground">
              {selectedProvider?.name} - {selectedModel?.description}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-2 bg-popover border rounded-lg shadow-xl max-h-[400px] overflow-y-auto">
          {PROVIDERS.map((provider) => (
            <div key={provider.id}>
              {/* Header del provider */}
              <div 
                className="px-4 py-2 text-sm font-semibold text-muted-foreground flex items-center gap-2 sticky top-0 bg-popover border-b"
                style={{ borderLeftColor: provider.color, borderLeftWidth: '3px' }}
              >
                <span>{provider.icon}</span>
                <span>{provider.name.toUpperCase()}</span>
                {!isProviderConfigured(provider.id) && (
                  <span className="text-xs text-warning ml-auto">API Key requerida</span>
                )}
              </div>
              
              {/* Modelos del provider */}
              {provider.models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onChange(model.id);
                    setIsOpen(false);
                  }}
                  disabled={!isProviderConfigured(provider.id)}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors
                    ${value === model.id ? 'bg-accent' : ''}
                    ${!isProviderConfigured(provider.id) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {/* Check si está seleccionado */}
                  <div className="w-5">
                    {value === model.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  
                  {/* Info del modelo */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {model.tags?.map(tag => (
                        <span 
                          key={tag}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${TAG_COLORS[tag] || 'bg-gray-500/20 text-gray-400'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">{model.description}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## ⚠️ INSTRUCCIONES PARA CLAUDE CODE

1. **PRIMERO:** Usa Context7 para verificar los IDs exactos de cada API:
   - `context7: google ai imagen api models list`
   - `context7: openai gpt-image api models`
   - `context7: kie.ai seedream api models`
   - `context7: black forest labs flux api models`

2. **Actualiza** `lib/image-providers/types.ts` con la configuración de PROVIDERS

3. **Reemplaza** `components/generator/ModelSelector.tsx` con el nuevo componente jerárquico

4. **Actualiza** los providers individuales (`google.ts`, `openai.ts`, etc.) para manejar múltiples modelos

5. **Verifica** que el backend (`route.ts`) pase el modelo correcto a cada provider

---

## ✅ CHECKLIST

- [ ] Actualizar types.ts con estructura de PROVIDERS
- [ ] Verificar IDs de API con Context7
- [ ] Crear nuevo ModelSelector jerárquico
- [ ] Actualizar cada provider para múltiples modelos
- [ ] Mostrar "API Key requerida" si el provider no está configurado
- [ ] Test de cada modelo

---

**IMPORTANTE:** Los `apiModelId` en este spec son PLACEHOLDER. Claude Code DEBE verificar con Context7 los IDs reales de cada API antes de implementar.
