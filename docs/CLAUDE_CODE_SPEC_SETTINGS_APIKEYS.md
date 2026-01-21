# 🔑 ESPECIFICACIÓN: API Keys en Settings (BYOK Multi-Provider)

## Contexto
El sistema multi-modelo ya está implementado pero falta la UI para que los usuarios configuren sus propias API keys. Actualmente Settings solo tiene Google API Key (Gemini).

---

## ⚠️ INSTRUCCIONES PARA CLAUDE CODE

**PASO 1: Ejecutar SQL en Supabase**

Antes de modificar código, el usuario debe ejecutar esto en Supabase SQL Editor:

```sql
-- Agregar columnas para nuevas API keys
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kie_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bfl_api_key TEXT;

-- Índice para búsqueda rápida (opcional)
CREATE INDEX IF NOT EXISTS idx_profiles_has_keys ON profiles (id) 
WHERE openai_api_key IS NOT NULL OR kie_api_key IS NOT NULL OR bfl_api_key IS NOT NULL;
```

---

## 📋 ARCHIVOS A MODIFICAR

### 1. app/api/keys/route.ts

**GET:** Agregar campos para las nuevas keys (masked)
**POST:** Agregar lógica para guardar las nuevas keys

```typescript
// En GET response agregar:
{
  hasGoogleApiKey: boolean,
  hasOpenaiApiKey: boolean,
  hasKieApiKey: boolean,
  hasBflApiKey: boolean,
  maskedGoogleApiKey?: string,
  maskedOpenaiApiKey?: string,
  maskedKieApiKey?: string,
  maskedBflApiKey?: string,
}

// En POST body aceptar:
{
  googleApiKey?: string,
  openaiApiKey?: string,
  kieApiKey?: string,
  bflApiKey?: string,
}

// Solo actualizar los campos que vienen en el request (no vacíos y no masked)
```

### 2. app/(dashboard)/dashboard/settings/page.tsx

**Agregar secciones para cada provider:**

```tsx
// Estados nuevos:
const [openaiApiKey, setOpenaiApiKey] = useState('')
const [kieApiKey, setKieApiKey] = useState('')
const [bflApiKey, setBflApiKey] = useState('')
const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false)
const [hasKieApiKey, setHasKieApiKey] = useState(false)
const [hasBflApiKey, setHasBflApiKey] = useState(false)

// Actualizar fetchKeys para cargar todas las keys
// Actualizar handleSave para guardar todas las keys que hayan cambiado
```

---

## 🎨 DISEÑO UI - Settings Page

La página debe tener **secciones colapsables** o **cards separadas** para cada provider:

### Estructura:

```
┌─────────────────────────────────────────────────────────┐
│ 🔧 Configuración                                        │
│ Configura tus API keys para los diferentes modelos     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔑 Google AI (Gemini)                     [✓ Configurada]│
├─────────────────────────────────────────────────────────┤
│ Se usa para: Gemini Flash (texto en imágenes)          │
│                                                         │
│ API Key: [••••••••••••••••••••••]                       │
│                                                         │
│ 🔗 Obtener API Key (aistudio.google.com)               │
│                                          [Guardar]      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 OpenAI (GPT Image 1)                  [No configurada]│
├─────────────────────────────────────────────────────────┤
│ Se usa para: GPT Image 1 (fotorealista, mejor texto)   │
│ Precio aprox: ~$0.04/imagen                            │
│                                                         │
│ API Key: [sk-...]                                       │
│                                                         │
│ 🔗 Obtener API Key (platform.openai.com/api-keys)      │
│                                          [Guardar]      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🌱 KIE.ai (Seedream 4.5)                 [No configurada]│
├─────────────────────────────────────────────────────────┤
│ Se usa para: Seedream 4.5 (edición de imágenes)        │
│ Precio aprox: ~$0.032/imagen                           │
│                                                         │
│ API Key: [kie_...]                                      │
│                                                         │
│ 🔗 Obtener API Key (kie.ai)                            │
│                                          [Guardar]      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⚡ Black Forest Labs (FLUX)              [No configurada]│
├─────────────────────────────────────────────────────────┤
│ Se usa para: FLUX Pro 1.1 (ultra rápido)               │
│ Precio aprox: ~$0.04/imagen                            │
│                                                         │
│ API Key: [bfl_...]                                      │
│                                                         │
│ 🔗 Obtener API Key (blackforestlabs.ai)                │
│                                          [Guardar]      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ℹ️ ¿Por qué necesito mis propias keys?                 │
├─────────────────────────────────────────────────────────┤
│ Estrategas IA utiliza el modelo BYOK (Bring Your Own   │
│ Key) para darte control total sobre tus costos.        │
│ Solo pagas lo que consumes directamente a cada         │
│ proveedor, sin intermediarios.                         │
│                                                         │
│ NOTA: Solo necesitas configurar los modelos que        │
│ quieras usar. Google AI (Gemini) es el mínimo          │
│ requerido.                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 COMPONENTE REUTILIZABLE: ApiKeyCard

Crear un componente reutilizable para cada provider:

```tsx
// components/settings/ApiKeyCard.tsx

interface ApiKeyCardProps {
  icon: React.ReactNode;
  title: string;
  provider: string;
  description: string;
  price?: string;
  docsUrl: string;
  docsLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isConfigured: boolean;
  isSaving: boolean;
  onSave: () => void;
  required?: boolean;
}

export function ApiKeyCard({
  icon,
  title,
  provider,
  description,
  price,
  docsUrl,
  docsLabel,
  placeholder,
  value,
  onChange,
  isConfigured,
  isSaving,
  onSave,
  required = false,
}: ApiKeyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {icon}
            {title}
            {required && <span className="text-xs text-error">(Requerido)</span>}
          </span>
          {isConfigured ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="w-3 h-3" />
              Configurada
            </span>
          ) : (
            <span className="text-xs text-text-tertiary">No configurada</span>
          )}
        </CardTitle>
        <CardDescription>
          {description}
          {price && <span className="block mt-1 text-xs">Precio aprox: {price}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="password"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <a 
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
          >
            {docsLabel} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <Button 
          onClick={onSave}
          isLoading={isSaving}
          disabled={!value || value.includes('•')}
          size="sm"
        >
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🔗 URLs para obtener API Keys

| Provider | URL | Placeholder |
|----------|-----|-------------|
| Google AI | https://aistudio.google.com/app/apikey | AIzaSy... |
| OpenAI | https://platform.openai.com/api-keys | sk-... |
| KIE.ai | https://kie.ai/dashboard | (verificar URL exacta) |
| BFL | https://blackforestlabs.ai | (verificar URL exacta) |

---

## ✅ CHECKLIST

### Backend (app/api/keys/route.ts)
- [ ] GET: Retornar estado de todas las keys (has + masked)
- [ ] POST: Guardar keys que vengan en el request
- [ ] Solo actualizar campos no vacíos y no masked (no contienen '•')

### Frontend (app/(dashboard)/dashboard/settings/page.tsx)  
- [ ] Agregar estados para las 3 nuevas keys
- [ ] Cargar estado de todas las keys en fetchKeys
- [ ] Mostrar 4 cards (Google, OpenAI, KIE, BFL)
- [ ] Guardar key individual por card (no todas juntas)
- [ ] Marcar Google como "Requerido"

### Componente (components/settings/ApiKeyCard.tsx)
- [ ] Crear componente reutilizable
- [ ] Iconos para cada provider
- [ ] Badge "Configurada" / "No configurada"
- [ ] Link a documentación

### SQL (manual por el usuario)
- [ ] Ejecutar ALTER TABLE en Supabase

---

## 🎯 RESULTADO ESPERADO

1. Usuario va a Settings
2. Ve 4 cards (una por provider)
3. Solo Google AI es requerido
4. Puede agregar las keys que quiera
5. Al generar, el sistema usa la key del usuario o falla si no tiene

---

**Nota:** Las keys en Vercel (OPENAI_API_KEY, KIE_API_KEY, BFL_API_KEY) son FALLBACK solo para desarrollo/testing. En producción, cada usuario debe usar su propia key.
