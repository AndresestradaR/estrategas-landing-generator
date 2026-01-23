import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

type ToolType = 'variations' | 'upscale' | 'remove-bg' | 'camera-angle' | 'mockup'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    const tool = formData.get('tool') as ToolType

    if (!image || !tool) {
      return NextResponse.json(
        { error: 'Imagen y herramienta son requeridas' },
        { status: 400 }
      )
    }

    // Get user's API keys
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_api_key, openai_api_key, kie_api_key, bfl_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const mimeType = image.type

    // For now, we'll use the available APIs based on the tool
    // Each tool may use different providers or endpoints

    switch (tool) {
      case 'remove-bg': {
        // Use KIE.ai or BFL for background removal
        if (!profile.bfl_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Black Forest Labs para esta herramienta' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.bfl_api_key)

        // Call BFL API for background removal
        const response = await fetch('https://api.bfl.ml/v1/flux-kontext-pro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Key': apiKey,
          },
          body: JSON.stringify({
            prompt: 'Remove the background completely, keep only the main subject with transparent background',
            image: imageBase64,
            output_format: 'png',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return NextResponse.json(
            { error: errorData.detail || 'Error al procesar imagen' },
            { status: 500 }
          )
        }

        const data = await response.json()

        // BFL returns a task ID, need to poll
        if (data.id) {
          // Poll for result
          let result = null
          for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000))

            const statusResponse = await fetch(`https://api.bfl.ml/v1/get_result?id=${data.id}`, {
              headers: { 'X-Key': apiKey },
            })

            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              if (statusData.status === 'Ready' && statusData.result?.sample) {
                // Download the image
                const imageResponse = await fetch(statusData.result.sample)
                const imageBlob = await imageResponse.arrayBuffer()
                result = Buffer.from(imageBlob).toString('base64')
                break
              }
            }
          }

          if (result) {
            return NextResponse.json({
              success: true,
              imageBase64: result,
              mimeType: 'image/png',
            })
          }
        }

        return NextResponse.json(
          { error: 'Tiempo de espera agotado' },
          { status: 500 }
        )
      }

      case 'upscale': {
        // For upscaling, we can use various APIs
        // Using Gemini for now as it supports image enhancement
        if (!profile.google_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Google para esta herramienta' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.google_api_key)

        // Use Gemini to enhance/upscale the image
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: 'Enhance this image to higher resolution and quality. Improve sharpness and details while maintaining the original composition and style.',
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              }],
              generationConfig: {
                responseModalities: ['image', 'text'],
                responseMimeType: 'image/png',
              },
            }),
          }
        )

        if (!response.ok) {
          return NextResponse.json(
            { error: 'Error al mejorar imagen' },
            { status: 500 }
          )
        }

        const data = await response.json()
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
          (p: { inlineData?: { data: string } }) => p.inlineData?.data
        )

        if (imagePart?.inlineData?.data) {
          return NextResponse.json({
            success: true,
            imageBase64: imagePart.inlineData.data,
            mimeType: 'image/png',
          })
        }

        return NextResponse.json(
          { error: 'No se pudo mejorar la imagen' },
          { status: 500 }
        )
      }

      case 'variations': {
        // Generate variations using available image models
        if (!profile.google_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Google para esta herramienta' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.google_api_key)

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: 'Create a variation of this image. Keep the same subject and general composition but vary the style, lighting, or perspective slightly to create an interesting alternative version.',
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              }],
              generationConfig: {
                responseModalities: ['image', 'text'],
                responseMimeType: 'image/png',
              },
            }),
          }
        )

        if (!response.ok) {
          return NextResponse.json(
            { error: 'Error al generar variacion' },
            { status: 500 }
          )
        }

        const data = await response.json()
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
          (p: { inlineData?: { data: string } }) => p.inlineData?.data
        )

        if (imagePart?.inlineData?.data) {
          return NextResponse.json({
            success: true,
            imageBase64: imagePart.inlineData.data,
            mimeType: 'image/png',
          })
        }

        return NextResponse.json(
          { error: 'No se pudo generar variacion' },
          { status: 500 }
        )
      }

      case 'camera-angle': {
        // Change camera angle using image-to-image
        if (!profile.google_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Google para esta herramienta' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.google_api_key)

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: 'Reimagine this image from a different camera angle. Create a new perspective as if the camera was positioned differently - try a dramatic angle like from above, below, or from the side.',
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              }],
              generationConfig: {
                responseModalities: ['image', 'text'],
                responseMimeType: 'image/png',
              },
            }),
          }
        )

        if (!response.ok) {
          return NextResponse.json(
            { error: 'Error al cambiar angulo' },
            { status: 500 }
          )
        }

        const data = await response.json()
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
          (p: { inlineData?: { data: string } }) => p.inlineData?.data
        )

        if (imagePart?.inlineData?.data) {
          return NextResponse.json({
            success: true,
            imageBase64: imagePart.inlineData.data,
            mimeType: 'image/png',
          })
        }

        return NextResponse.json(
          { error: 'No se pudo cambiar el angulo' },
          { status: 500 }
        )
      }

      case 'mockup': {
        // Generate product mockup
        if (!profile.google_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Google para esta herramienta' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.google_api_key)

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: 'Create a professional product mockup. Place this product in a clean, minimalist studio setting with professional lighting. The background should be neutral (white or light gray) with soft shadows. Make it look like a high-end e-commerce product photo.',
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              }],
              generationConfig: {
                responseModalities: ['image', 'text'],
                responseMimeType: 'image/png',
              },
            }),
          }
        )

        if (!response.ok) {
          return NextResponse.json(
            { error: 'Error al crear mockup' },
            { status: 500 }
          )
        }

        const data = await response.json()
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
          (p: { inlineData?: { data: string } }) => p.inlineData?.data
        )

        if (imagePart?.inlineData?.data) {
          return NextResponse.json({
            success: true,
            imageBase64: imagePart.inlineData.data,
            mimeType: 'image/png',
          })
        }

        return NextResponse.json(
          { error: 'No se pudo crear el mockup' },
          { status: 500 }
        )
      }

      default:
        return NextResponse.json(
          { error: 'Herramienta no soportada' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Studio tools error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
