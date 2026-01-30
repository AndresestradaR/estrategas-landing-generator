import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

const RTRVR_API_URL = 'https://api.rtrvr.ai/execute'

interface CompetitorData {
  url: string
  price: number | null
  priceFormatted: string | null
  combo: string | null
  gift: string | null
  angle: string | null
  headline: string | null
  cta: string | null
  error?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's rtrvr API key
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rtrvr_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.rtrvr_api_key) {
      return NextResponse.json({ 
        error: 'API key de rtrvr.ai no configurada. Ve a Configuración para agregarla.' 
      }, { status: 400 })
    }

    const rtrvrApiKey = decrypt(profile.rtrvr_api_key)
    
    const body = await request.json()
    const { urls } = body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'URLs requeridas' }, { status: 400 })
    }

    // Limit to 10 URLs max to prevent abuse
    const urlsToProcess = urls.slice(0, 10)
    
    // Process each URL with rtrvr.ai
    const results: CompetitorData[] = await Promise.all(
      urlsToProcess.map(async (url: string) => {
        try {
          const response = await fetch(RTRVR_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${rtrvrApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: `Analiza esta landing page de ecommerce/dropshipping y extrae la siguiente información en JSON:
              
1. "price": El precio principal del producto (solo el número, sin símbolo de moneda). Si hay precio tachado y precio promocional, usa el promocional.
2. "priceFormatted": El precio formateado como aparece en la página (ej: "$89.900", "COP 89,900")
3. "combo": Describe el combo u oferta si existe (ej: "2x1", "Lleva 3 paga 2", "Kit completo"). Si no hay combo, null.
4. "gift": Describe los regalos o bonos incluidos (ej: "Envío gratis", "Ebook gratis", "Accesorio incluido"). Si no hay regalos, null.
5. "angle": El ángulo de venta principal o propuesta de valor en máximo 10 palabras (ej: "Resultados en 7 días", "Tecnología alemana", "100% natural")
6. "headline": El título principal o headline de la página
7. "cta": El texto del botón de compra principal (ej: "Comprar ahora", "Agregar al carrito", "¡Lo quiero!")

Responde SOLO con el JSON, sin explicaciones adicionales. Si no puedes encontrar algún dato, usa null.`,
              urls: [url],
              response: {
                verbosity: 'final',
                inlineOutputMaxBytes: 50000
              }
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

          const data = await response.json()
          
          // Parse the result from rtrvr.ai
          let parsedResult: Partial<CompetitorData> = {}
          
          try {
            // rtrvr.ai returns result in different formats, try to extract JSON
            const resultText = data.result?.text || data.result?.json || JSON.stringify(data.result) || ''
            
            // Try to find JSON in the response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0])
            }
          } catch (parseError) {
            console.error('Error parsing rtrvr result:', parseError)
          }

          return {
            url,
            price: parsedResult.price ? Number(parsedResult.price) : null,
            priceFormatted: parsedResult.priceFormatted || null,
            combo: parsedResult.combo || null,
            gift: parsedResult.gift || null,
            angle: parsedResult.angle || null,
            headline: parsedResult.headline || null,
            cta: parsedResult.cta || null,
          }
        } catch (error: any) {
          console.error(`Error processing URL ${url}:`, error)
          return {
            url,
            price: null,
            priceFormatted: null,
            combo: null,
            gift: null,
            angle: null,
            headline: null,
            cta: null,
            error: error.message || 'Error al procesar'
          }
        }
      })
    )

    // Calculate statistics
    const validPrices = results.filter(r => r.price !== null).map(r => r.price as number)
    const stats = {
      count: results.length,
      successCount: results.filter(r => !r.error).length,
      priceMin: validPrices.length > 0 ? Math.min(...validPrices) : null,
      priceMax: validPrices.length > 0 ? Math.max(...validPrices) : null,
      priceAvg: validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : null,
    }

    return NextResponse.json({
      success: true,
      competitors: results,
      stats
    })

  } catch (error: any) {
    console.error('Competitor analysis error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}
