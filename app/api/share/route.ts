import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sectionId, imageBase64 } = body

    if (!sectionId || !imageBase64) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Convert base64 to buffer
    let imageBuffer: Buffer
    let mimeType = 'image/png'
    
    if (imageBase64.startsWith('data:')) {
      const parts = imageBase64.split(',')
      mimeType = parts[0].split(':')[1]?.split(';')[0] || 'image/png'
      imageBuffer = Buffer.from(parts[1], 'base64')
    } else {
      imageBuffer = Buffer.from(imageBase64, 'base64')
    }

    // Generate unique filename
    const extension = mimeType.split('/')[1] || 'png'
    const fileName = `shared/${user.id}/${sectionId}-${Date.now()}.${extension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceClient
      .storage
      .from('landing-images')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        error: `Error subiendo imagen: ${uploadError.message}` 
      }, { status: 500 })
    }

    // Get public URL
    const { data: publicUrlData } = serviceClient
      .storage
      .from('landing-images')
      .getPublicUrl(fileName)

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ 
        error: 'No se pudo obtener URL pública' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error: any) {
    console.error('Share API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al compartir' 
    }, { status: 500 })
  }
}
