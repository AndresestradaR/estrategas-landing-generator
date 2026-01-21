# 🎨 Integración Canva Connect API - Spec Completo

## Credenciales (agregar a Vercel Environment Variables)

```env
CANVA_CLIENT_ID=OC-AZvgv75ZIdlp
CANVA_CLIENT_SECRET=<pedir al usuario>
CANVA_REDIRECT_URI=https://estrategas-landing-generator.vercel.app/api/canva/callback
```

## Flujo OAuth con PKCE

Canva usa OAuth 2.0 con PKCE (Proof Key for Code Exchange). El flujo es:

1. Usuario hace clic en "Editar en Canva"
2. Frontend llama a `/api/canva/auth?sectionId=xxx`
3. Backend genera `code_verifier` y `code_challenge`, guarda en cookie, redirige a Canva
4. Usuario autoriza en Canva
5. Canva redirige a `/api/canva/callback?code=xxx`
6. Backend intercambia code por access_token
7. Backend sube imagen como asset a Canva
8. Backend crea diseño con el asset
9. Redirige al usuario al editor de Canva con el diseño

## Archivos a crear

### 1. `/lib/canva/pkce.ts` - Utilidades PKCE

```typescript
import crypto from 'crypto'

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}
```

### 2. `/app/api/canva/auth/route.ts` - Iniciar OAuth

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/canva/pkce'

const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID!
const CANVA_REDIRECT_URI = process.env.CANVA_REDIRECT_URI!

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sectionId = searchParams.get('sectionId')
  const imageUrl = searchParams.get('imageUrl')
  
  if (!sectionId || !imageUrl) {
    return NextResponse.json({ error: 'Missing sectionId or imageUrl' }, { status: 400 })
  }

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Store in cookies (encrypted in production)
  const cookieStore = cookies()
  cookieStore.set('canva_code_verifier', codeVerifier, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })
  cookieStore.set('canva_state', state, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'lax',
    maxAge: 600 
  })
  cookieStore.set('canva_section_id', sectionId, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'lax',
    maxAge: 600 
  })
  cookieStore.set('canva_image_url', imageUrl, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'lax',
    maxAge: 600 
  })

  // Build Canva authorization URL
  const scopes = [
    'design:content:read',
    'design:content:write', 
    'asset:read',
    'asset:write'
  ].join(' ')

  const authUrl = new URL('https://www.canva.com/api/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', CANVA_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', CANVA_REDIRECT_URI)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
```

### 3. `/app/api/canva/callback/route.ts` - Callback OAuth

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID!
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET!
const CANVA_REDIRECT_URI = process.env.CANVA_REDIRECT_URI!

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Canva OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard/landing?canva_error=auth_failed', request.url))
  }

  const cookieStore = cookies()
  const storedState = cookieStore.get('canva_state')?.value
  const codeVerifier = cookieStore.get('canva_code_verifier')?.value
  const sectionId = cookieStore.get('canva_section_id')?.value
  const imageUrl = cookieStore.get('canva_image_url')?.value

  // Validate state
  if (!state || state !== storedState) {
    console.error('State mismatch')
    return NextResponse.redirect(new URL('/dashboard/landing?canva_error=invalid_state', request.url))
  }

  if (!code || !codeVerifier || !imageUrl) {
    console.error('Missing required values')
    return NextResponse.redirect(new URL('/dashboard/landing?canva_error=missing_data', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CANVA_CLIENT_ID}:${CANVA_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: CANVA_REDIRECT_URI
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard/landing?canva_error=token_failed', request.url))
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Upload image as asset to Canva
    // First, we need to get the image as base64 or buffer
    const imageResponse = await fetch(imageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    // Start asset upload job
    const uploadJobResponse = await fetch('https://api.canva.com/rest/v1/asset-uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Asset-Upload-Metadata': JSON.stringify({
          name_base64: Buffer.from('Estrategas Banner').toString('base64')
        })
      },
      body: Buffer.from(imageBuffer)
    })

    if (!uploadJobResponse.ok) {
      const errorData = await uploadJobResponse.text()
      console.error('Asset upload failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard/landing?canva_error=upload_failed', request.url))
    }

    const uploadJob = await uploadJobResponse.json()
    
    // Poll for upload completion
    let assetId: string | null = null
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const jobStatusResponse = await fetch(`https://api.canva.com/rest/v1/asset-uploads/${uploadJob.job.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      const jobStatus = await jobStatusResponse.json()
      
      if (jobStatus.job.status === 'success') {
        assetId = jobStatus.job.asset.id
        break
      } else if (jobStatus.job.status === 'failed') {
        console.error('Asset upload job failed:', jobStatus)
        return NextResponse.redirect(new URL('/dashboard/landing?canva_error=upload_job_failed', request.url))
      }
    }

    if (!assetId) {
      return NextResponse.redirect(new URL('/dashboard/landing?canva_error=upload_timeout', request.url))
    }

    // Create a new design with the uploaded asset
    const createDesignResponse = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        design_type: {
          type: 'preset',
          name: 'InstagramStory' // 1080x1920 - matches our default
        },
        asset_id: assetId,
        title: 'Banner Estrategas IA'
      })
    })

    if (!createDesignResponse.ok) {
      const errorData = await createDesignResponse.text()
      console.error('Create design failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard/landing?canva_error=design_failed', request.url))
    }

    const designData = await createDesignResponse.json()
    const editUrl = designData.design.urls.edit_url

    // Clear cookies
    cookieStore.delete('canva_code_verifier')
    cookieStore.delete('canva_state')
    cookieStore.delete('canva_section_id')
    cookieStore.delete('canva_image_url')

    // Redirect to Canva editor
    return NextResponse.redirect(editUrl)

  } catch (error) {
    console.error('Canva callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/landing?canva_error=unknown', request.url))
  }
}
```

### 4. Modificar el botón en `page.tsx`

Cambiar la función `handleOpenInCanva` de:

```typescript
const handleOpenInCanva = (section: GeneratedSection) => {
  // 1. Download the image
  const link = document.createElement('a')
  link.href = section.generated_image_url
  link.download = `${product?.name || 'banner'}-canva-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // 2. Open Canva homepage (this URL works!)
  window.open('https://www.canva.com', '_blank')

  // 3. Show toast with instructions
  toast.success('Imagen descargada. Crea un diseño en Canva y sube la imagen.', {
    duration: 5000,
    icon: '🎨'
  })
}
```

A:

```typescript
const handleOpenInCanva = (section: GeneratedSection) => {
  // Redirect to Canva OAuth flow
  const authUrl = `/api/canva/auth?sectionId=${section.id}&imageUrl=${encodeURIComponent(section.generated_image_url)}`
  window.location.href = authUrl
}
```

## Variables de entorno para Vercel

Agregar en Vercel Dashboard → Settings → Environment Variables:

- `CANVA_CLIENT_ID` = `OC-AZvgv75ZIdlp`
- `CANVA_CLIENT_SECRET` = (el que guardaste al generar)
- `CANVA_REDIRECT_URI` = `https://estrategas-landing-generator.vercel.app/api/canva/callback`

## Notas importantes

1. **PKCE es obligatorio** - Canva requiere code_challenge con S256
2. **Asset upload es async** - Hay que hacer polling del job status
3. **Design types disponibles**: 
   - `InstagramStory` (1080x1920)
   - `InstagramPost` (1080x1080)
   - `Presentation` (1920x1080)
4. **El access_token expira** - Para un MVP no guardamos refresh_token, el usuario re-autoriza cada vez

## Testing

1. Hacer clic en "Editar en Canva" en una sección generada
2. Debería redirigir a Canva OAuth
3. Autorizar la app
4. Debería crear el diseño y abrir el editor de Canva con la imagen

## Flujo visual

```
[Usuario] → Click "Editar en Canva"
    ↓
[Frontend] → Redirect a /api/canva/auth?sectionId=X&imageUrl=Y
    ↓
[Backend] → Genera PKCE, guarda en cookies, redirect a Canva OAuth
    ↓
[Canva] → Usuario autoriza "Estrategas IA quiere acceder..."
    ↓
[Canva] → Redirect a /api/canva/callback?code=Z
    ↓
[Backend] → Intercambia code por access_token
    ↓
[Backend] → Sube imagen como asset
    ↓
[Backend] → Crea diseño con el asset
    ↓
[Backend] → Redirect al edit_url de Canva
    ↓
[Canva Editor] → Usuario edita el banner con todas las herramientas de Canva
    ↓
[Canva Editor] → Botón "Volver a Estrategas IA" → /dashboard/landing
```
