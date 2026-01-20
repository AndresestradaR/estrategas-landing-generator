import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { enhancePrompt, buildBasePrompt } from '@/lib/services/gemini'
import { generateImage } from '@/lib/services/nanoBanana'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { productName, notes } = body

    if (!productName) {
      return NextResponse.json({ error: 'Nombre del producto requerido' }, { status: 400 })
    }

    // Get user's encrypted keys
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nano_banana_key, gemini_key, credits_used, credits_limit')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Check credits
    if (profile.credits_used >= profile.credits_limit) {
      return NextResponse.json({ error: 'Has alcanzado tu límite de generaciones' }, { status: 403 })
    }

    // Check if user has Nano Banana key
    if (!profile.nano_banana_key) {
      return NextResponse.json({ error: 'Configura tu API key de Nano Banana en Settings' }, { status: 400 })
    }

    // Decrypt keys
    const nanoBananaKey = decrypt(profile.nano_banana_key)
    const geminiKey = profile.gemini_key ? decrypt(profile.gemini_key) : null

    // Build or enhance prompt
    let finalPrompt: string
    let originalPrompt = buildBasePrompt(productName, notes)

    if (geminiKey) {
      try {
        finalPrompt = await enhancePrompt(geminiKey, productName, notes)
      } catch (error) {
        console.error('Gemini error, using base prompt:', error)
        finalPrompt = originalPrompt
      }
    } else {
      finalPrompt = originalPrompt
    }

    // Create generation record
    const serviceClient = await createServiceClient()
    const { data: generation, error: insertError } = await serviceClient
      .from('generations')
      .insert({
        user_id: user.id,
        product_name: productName,
        original_prompt: originalPrompt,
        enhanced_prompt: finalPrompt,
        status: 'processing',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Error al crear generación' }, { status: 500 })
    }

    // Generate image with Nano Banana
    const result = await generateImage(nanoBananaKey, { prompt: finalPrompt })

    if (!result.success || !result.imageUrl) {
      // Update generation as failed
      await serviceClient
        .from('generations')
        .update({ 
          status: 'failed',
          error_message: result.error || 'Error al generar imagen'
        })
        .eq('id', generation.id)

      return NextResponse.json({ error: result.error || 'Error al generar imagen' }, { status: 500 })
    }

    // Update generation with result
    await serviceClient
      .from('generations')
      .update({ 
        status: 'completed',
        generated_image_url: result.imageUrl 
      })
      .eq('id', generation.id)

    // Increment credits used
    await serviceClient
      .from('profiles')
      .update({ credits_used: profile.credits_used + 1 })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      imageUrl: result.imageUrl,
      prompt: finalPrompt,
    })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: generations, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Error al obtener generaciones' }, { status: 500 })
    }

    return NextResponse.json({ generations })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}