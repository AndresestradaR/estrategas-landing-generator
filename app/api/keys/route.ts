import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encrypt, decrypt, mask } from '@/lib/services/encryption'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_api_key')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Return masked key
    return NextResponse.json({
      maskedGoogleApiKey: mask(profile.google_api_key),
      hasGoogleApiKey: !!profile.google_api_key,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { googleApiKey } = body

    if (!googleApiKey) {
      return NextResponse.json({ error: 'API key requerida' }, { status: 400 })
    }

    // Encrypt key before storing
    const encryptedKey = encrypt(googleApiKey)

    // Use service client to update (bypasses RLS for update)
    const serviceClient = await createServiceClient()
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({ google_api_key: encryptedKey })
      .eq('id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Error al guardar key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
