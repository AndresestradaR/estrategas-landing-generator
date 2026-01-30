import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

const RTRVR_API_URL = 'https://api.rtrvr.ai/execute'

interface AdToAnalyze {
  id: string
  advertiserName: string
  landingUrl: string
  adText?: string
  ctaText?: string
  adLibraryUrl?: string
}

interface AnalyzedCompetitor {
  id: string
  advertiserName: string
  landingUrl: string
  adLibraryUrl: string
  adText: string
  ctaText: string
  price: number | null
  priceFormatted: string | null
  combo: string | null
  gift: string | null
  angle: string | null
  headline: string | null
  cta: string | null
  error?: string
  rawResponse?: string
}

// Helper to extract price from various formats
function extractPrice(priceValue: any): number | null {
  if (priceValue === null || priceValue === undefined) return null
  
  // If already a number
  if (typeof priceValue === 'number') return priceValue
  
  // If string, try to extract number
  if (typeof priceValue === 'string') {
    // Remove currency symbols, dots as thousands separator, keep comma as decimal
    const cleaned = priceValue
      .replace(/[^\d.,]/g, '') // Remove non-numeric except . and ,
      .replace(/\.(?=\d{3})/g, '') // Remove dots used as thousands separator
      .replace(',', '.') // Replace comma with dot for decimal
    
    const num = parseFloat(cleaned)
    if (!isNaN(num) && num > 0) return Math.round(num)
  }
  
  return null
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
    const { ads } = body as { ads: AdToAnalyze[] }

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un competidor para analizar' }, { status: 400 })
    }

    if (ads.length > 10) {
      return NextResponse.json({ error: 'Máximo 10 competidores por análisis' }, { status: 400 })
    }

    console.log(`Analyzing ${ads.length} competitors with rtrvr.ai`)

    // Analyze each landing page in parallel
    const results: AnalyzedCompetitor[] = await Promise.all(
      ads.map(async (ad) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 sec timeout

          const response = await fetch(RTRVR_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${rtrvrApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              input: `Eres un experto analizando landing pages de ecommerce en Latinoamérica (Colombia, México, etc).

Analiza esta página y extrae la siguiente información en formato JSON:

{
  "price": <número del precio de venta actual, sin símbolos ni puntos de miles. Ej: si dice "$89.900" escribe 89900>,
  "priceFormatted": "<precio exacto como aparece en la página, ej: '$89.900'>",
  "combo": "<oferta combo si existe, ej: '2x1', 'Kit 3 unidades'. Si no hay, null>",
  "gift": "<regalos o beneficios, ej: 'Envío gratis', 'Regalo sorpresa'. Si no hay, null>",
  "angle": "<gancho de venta principal en max 15 palabras>",
  "headline": "<título del producto>",
  "cta": "<texto del botón de compra>"
}

IMPORTANTE:
- Busca el precio grande/destacado que es el precio de VENTA (no el tachado)
- En Colombia usan puntos como separador de miles (89.900 = 89900)
- Responde ÚNICAMENTE el JSON, sin explicaciones adicionales`,
              urls: [ad.landingUrl],
              response: {
                verbosity: 'final',
                inlineOutputMaxBytes: 50000
              },
              browser: {
                waitForSelector: 'body',
                waitTime: 5000 // Wait 5 seconds for JS to render
              }
            }),
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`rtrvr.ai error for ${ad.landingUrl}:`, response.status, errorText)
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()
          
          // Log raw response for debugging
          const rawResponse = JSON.stringify(data).substring(0, 1000)
          console.log(`rtrvr.ai response for ${ad.advertiserName}:`, rawResponse)
          
          let parsedResult: Partial<AnalyzedCompetitor> = {}
          
          try {
            // Try multiple ways to extract the result
            let resultText = ''
            
            if (data.result?.text) {
              resultText = data.result.text
            } else if (data.result?.json) {
              resultText = typeof data.result.json === 'string' ? data.result.json : JSON.stringify(data.result.json)
            } else if (data.result) {
              resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
            } else if (data.output) {
              resultText = typeof data.output === 'string' ? data.output : JSON.stringify(data.output)
            }
            
            console.log(`Extracted text for ${ad.advertiserName}:`, resultText.substring(0, 500))
            
            // Try to find JSON in the response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0])
              console.log(`Parsed result for ${ad.advertiserName}:`, parsedResult)
            }
          } catch (parseError) {
            console.error(`Error parsing result for ${ad.advertiserName}:`, parseError)
          }

          // Extract and normalize price
          const price = extractPrice(parsedResult.price)

          return {
            id: ad.id,
            advertiserName: ad.advertiserName,
            landingUrl: ad.landingUrl,
            adLibraryUrl: ad.adLibraryUrl || '',
            adText: ad.adText || '',
            ctaText: ad.ctaText || '',
            price: price,
            priceFormatted: parsedResult.priceFormatted || (price ? `$${price.toLocaleString()}` : null),
            combo: parsedResult.combo || null,
            gift: parsedResult.gift || null,
            angle: parsedResult.angle || null,
            headline: parsedResult.headline || null,
            cta: parsedResult.cta || null,
          }
        } catch (error: any) {
          console.error(`Error analyzing ${ad.landingUrl}:`, error)
          return {
            id: ad.id,
            advertiserName: ad.advertiserName,
            landingUrl: ad.landingUrl,
            adLibraryUrl: ad.adLibraryUrl || '',
            adText: ad.adText || '',
            ctaText: ad.ctaText || '',
            price: null,
            priceFormatted: null,
            combo: null,
            gift: null,
            angle: null,
            headline: null,
            cta: null,
            error: error.name === 'AbortError' 
              ? 'Timeout al analizar landing' 
              : (error.message || 'Error al analizar landing page')
          }
        }
      })
    )

    // Calculate statistics
    const validPrices = results.filter(r => r.price !== null && r.price > 0).map(r => r.price as number)
    const stats = {
      total: results.length,
      analyzed: results.filter(r => !r.error).length,
      withPrice: results.filter(r => r.price !== null).length,
      withGift: results.filter(r => r.gift !== null).length,
      withCombo: results.filter(r => r.combo !== null).length,
      priceMin: validPrices.length > 0 ? Math.min(...validPrices) : null,
      priceMax: validPrices.length > 0 ? Math.max(...validPrices) : null,
      priceAvg: validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : null,
    }

    return NextResponse.json({
      success: true,
      competitors: results,
      stats,
    })

  } catch (error: any) {
    console.error('Competitor analyze error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}
