import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CANVA_CONFIG } from '@/lib/canva/pkce'

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface AssetUploadResponse {
  job: {
    id: string
    status: 'in_progress' | 'success' | 'failed'
  }
}

interface AssetJobResponse {
  job: {
    id: string
    status: 'in_progress' | 'success' | 'failed'
    asset?: {
      id: string
      name: string
    }
    error?: {
      code: string
      message: string
    }
  }
}

interface CreateDesignResponse {
  design: {
    id: string
    urls: {
      edit_url: string
      view_url: string
    }
  }
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResponse> {
  const clientId = process.env.CANVA_CLIENT_ID!
  const clientSecret = process.env.CANVA_CLIENT_SECRET!

  const response = await fetch(CANVA_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

async function uploadAsset(
  accessToken: string,
  imageBase64: string,
  filename: string
): Promise<string> {
  // Convert base64 to buffer
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  // Start asset upload
  const uploadResponse = await fetch(CANVA_CONFIG.assetUploadEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Asset-Upload-Metadata': JSON.stringify({
        name_base64: Buffer.from(filename).toString('base64'),
      }),
    },
    body: imageBuffer,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`Asset upload failed: ${error}`)
  }

  const uploadData: AssetUploadResponse = await uploadResponse.json()
  const jobId = uploadData.job.id

  // Poll for job completion
  let attempts = 0
  const maxAttempts = 30 // 30 seconds max

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(
      `${CANVA_CONFIG.assetUploadEndpoint}/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!statusResponse.ok) {
      throw new Error('Failed to check upload status')
    }

    const statusData: AssetJobResponse = await statusResponse.json()

    if (statusData.job.status === 'success' && statusData.job.asset) {
      return statusData.job.asset.id
    }

    if (statusData.job.status === 'failed') {
      throw new Error(statusData.job.error?.message || 'Upload failed')
    }

    // Wait 1 second before next poll
    await new Promise((resolve) => setTimeout(resolve, 1000))
    attempts++
  }

  throw new Error('Upload timed out')
}

async function createDesignWithAsset(
  accessToken: string,
  assetId: string
): Promise<string> {
  const response = await fetch(CANVA_CONFIG.designEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_type: 'custom',
      title: 'Banner Estrategas',
      asset_id: assetId,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Design creation failed: ${error}`)
  }

  const data: CreateDesignResponse = await response.json()
  return data.design.urls.edit_url
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Canva OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/dashboard?canva_error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard?canva_error=missing_params`
    )
  }

  const cookieStore = await cookies()

  // Verify state to prevent CSRF
  const storedState = cookieStore.get('canva_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${origin}/dashboard?canva_error=invalid_state`
    )
  }

  // Get code verifier
  const codeVerifier = cookieStore.get('canva_code_verifier')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(
      `${origin}/dashboard?canva_error=missing_verifier`
    )
  }

  try {
    const redirectUri = process.env.CANVA_REDIRECT_URI || 'https://estrategas-landing-generator.vercel.app/api/canva/callback'

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri)

    // Get stored image data if any
    const imageData = cookieStore.get('canva_image_data')?.value
    const sectionId = cookieStore.get('canva_section_id')?.value

    // Clear cookies
    cookieStore.delete('canva_code_verifier')
    cookieStore.delete('canva_state')
    cookieStore.delete('canva_image_data')
    cookieStore.delete('canva_section_id')

    // Store tokens in cookies for future use
    cookieStore.set('canva_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    })

    cookieStore.set('canva_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // If we have image data, upload and create design
    if (imageData && sectionId) {
      try {
        const assetId = await uploadAsset(
          tokens.access_token,
          imageData,
          `banner-${sectionId}.png`
        )
        const editUrl = await createDesignWithAsset(tokens.access_token, assetId)

        return NextResponse.redirect(editUrl)
      } catch (uploadError: any) {
        console.error('Upload/design error:', uploadError)
        // Fall back to just opening Canva
        return NextResponse.redirect('https://www.canva.com/create/custom-size')
      }
    }

    // No image data - just redirect to success
    return NextResponse.redirect(
      `${origin}/dashboard?canva_success=true`
    )
  } catch (err: any) {
    console.error('Canva callback error:', err)
    return NextResponse.redirect(
      `${origin}/dashboard?canva_error=${encodeURIComponent(err.message)}`
    )
  }
}
