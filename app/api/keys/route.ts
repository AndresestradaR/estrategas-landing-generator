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
      .select('nano_banana_key, gemini_key')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Return masked keys
    return NextResponse.json({
      nanoBananaKey: mask(profile.nano_banana_key),
      geminiKey: mask(profile.gemini_key),
      hasNanoBananaKey: !!profile.nano_banana_key,
      hasGeminiKey: !!profile.gemini_key,
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
    const { nanoBananaKey, geminiKey } = body

    // Encrypt keys before storing
    const updateData: Record<string, string | null> = {}
    
    if (nanoBananaKey !== undefined) {
      updateData.nano_banana_key = nanoBananaKey ? encrypt(nanoBananaKey) : null
    }
    
    if (geminiKey !== undefined) {
      updateData.gemini_key = geminiKey ? encrypt(geminiKey) : null
    }

    // Use service client to update (bypasses RLS for update)
    const serviceClient = await createServiceClient()
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Error al guardar keys' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}