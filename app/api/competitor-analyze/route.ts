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
  debug?: string
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
        let debugInfo = ''
        
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 60000)

          const requestBody = {
            input: `Extrae información de esta página de ecommerce y responde SOLO con JSON válido:

{
  "price": 89900,
  "priceFormatted": "$89.900",
  "combo": null,
  "gift": "Envío gratis",
  "angle": "Controla el azúcar naturalmente",
  "headline": "Berberina 1500",
  "cta": "Comprar ahora"
}

INSTRUCCIONES:
- price: número sin puntos ni símbolos (89.900 → 89900)
- priceFormatted: precio exacto como aparece
- Busca el precio de VENTA (grande, destacado), no el tachado
- Si no encuentras algo, usa null

Responde SOLO el JSON:`,
            urls: [ad.landingUrl],
            response: {
              verbosity: 'final',
              inlineOutputMaxBytes: 50000
            }
          }

          debugInfo += `Request: ${JSON.stringify(requestBody).substring(0, 200)}... | `

          const response = await fetch(RTRVR_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${rtrvrApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify(requestBody),
          })

          clearTimeout(timeoutId)

          const responseText = await response.text()
          debugInfo += `Status: ${response.status} | Response: ${responseText.substring(0, 500)}`

          if (!response.ok) {
            console.error(`rtrvr.ai error for ${ad.landingUrl}:`, response.status, responseText)
            throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 100)}`)
          }

          let data: any
          try {
            data = JSON.parse(responseText)
          } catch {
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`)
          }
          
          console.log(`rtrvr.ai raw response for ${ad.advertiserName}:`, JSON.stringify(data).substring(0, 1000))
          
          let parsedResult: Partial<AnalyzedCompetitor> = {}
          
          // Try multiple ways to extract the result
          let resultText = ''
          
          if (typeof data === 'string') {
            resultText = data
          } else if (data.result?.text) {
            resultText = data.result.text
          } else if (data.result?.json) {
            resultText = typeof data.result.json === 'string' ? data.result.json : JSON.stringify(data.result.json)
          } else if (data.result) {
            resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
          } else if (data.output?.text) {
            resultText = data.output.text
          } else if (data.output) {
            resultText = typeof data.output === 'string' ? data.output : JSON.stringify(data.output)
          } else if (data.content) {
            resultText = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
          }
          
          debugInfo += ` | Extracted: ${resultText.substring(0, 300)}`
          console.log(`Extracted text for ${ad.advertiserName}:`, resultText.substring(0, 500))
          
          // Try to find JSON in the response
          const jsonMatch = resultText.match(/\{[\s\S]*?\}/g)
          if (jsonMatch) {
            // Try each JSON match until one works
            for (const match of jsonMatch) {
              try {
                const parsed = JSON.parse(match)
                if (parsed.price !== undefined || parsed.priceFormatted || parsed.headline) {
                  parsedResult = parsed
                  console.log(`Parsed result for ${ad.advertiserName}:`, parsedResult)
                  break
                }
              } catch {
                continue
              }
            }
          }

          // Extract and normalize price
          const price = extractPrice(parsedResult.price) || extractPrice(parsedResult.priceFormatted)

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
            debug: debugInfo.substring(0, 500),
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
              : (error.message || 'Error al analizar landing page'),
            debug: debugInfo.substring(0, 500),
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
