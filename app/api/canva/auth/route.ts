import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateCodeVerifier, generateCodeChallenge, generateState, CANVA_CONFIG } from '@/lib/canva/pkce'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageData = searchParams.get('imageData')
  const sectionId = searchParams.get('sectionId')

  // Check for Canva credentials
  const clientId = process.env.CANVA_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Canva client ID not configured' },
      { status: 500 }
    )
  }

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Store PKCE verifier and state in cookies (httpOnly for security)
  const cookieStore = await cookies()

  cookieStore.set('canva_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  cookieStore.set('canva_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  // Store image data for after callback (if provided)
  if (imageData && sectionId) {
    cookieStore.set('canva_image_data', imageData.substring(0, 4000), { // Limit size
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })
    cookieStore.set('canva_section_id', sectionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })
  }

  // Build authorization URL
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/canva/callback`

  const authUrl = new URL(CANVA_CONFIG.authorizationEndpoint)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', CANVA_CONFIG.scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return NextResponse.redirect(authUrl.toString())
}
