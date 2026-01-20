# Estrategas IA - Landing Generator

SaaS profesional para generar imágenes de producto verticales (9:16) optimizadas para landings móviles de dropshipping.

## 🚀 Features

- **Modelo BYOK (Bring Your Own Key)**: Los usuarios traen sus propias API keys de Nano Banana y Google Gemini
- **Generación de imágenes 9:16**: Optimizado para landings móviles
- **Mejora automática de prompts**: Gemini transforma nombres de productos en prompts profesionales
- **Galería personal**: Historial de todas las generaciones
- **Seguridad**: API keys encriptadas con AES-256-GCM

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Auth/DB/Storage**: Supabase
- **Styling**: Tailwind CSS
- **IA Imagen**: Nano Banana API
- **IA Texto**: Google Gemini API

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone git@github.com:AndresestradaR/estrategas-landing-generator.git
cd estrategas-landing-generator
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://papfcbiswvdgalfteujm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=genera_con_openssl_rand_-hex_32
```

### 3. Configurar Supabase

El schema ya está creado. Si necesitas recrearlo, ejecuta el SQL en Supabase SQL Editor.

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🔐 Obtener API Keys

### Nano Banana
1. Ve a [nanobanana.com](https://nanobanana.com)
2. Crea una cuenta
3. Obtén tu API key

### Google Gemini
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API key
3. Es gratuita con límites generosos

## 📁 Estructura del Proyecto

```
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── generate/
│   │       ├── gallery/
│   │       └── settings/
│   ├── api/
│   │   ├── auth/callback/
│   │   ├── keys/
│   │   └── generate/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/
├── lib/
│   ├── supabase/
│   └── services/
└── middleware.ts
```

## 🎨 Diseño

- **Background**: #0A0A0F (negro profundo)
- **Surface**: #141419 (cards)
- **Accent**: #BFFF00 (verde lima neón)
- **Error**: #FF4D4D
- **Success**: #4DFF88

## 🚀 Deploy en Vercel

1. Importa el repo en [Vercel](https://vercel.com)
2. Agrega las variables de entorno
3. Deploy automático

## 📝 License

MIT

---

Hecho con 💚 para la comunidad Trucos Ecomm & Drop