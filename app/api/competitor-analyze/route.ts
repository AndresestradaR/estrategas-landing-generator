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
          const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 sec timeout

          const response = await fetch(RTRVR_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${rtrvrApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              input: `Analiza esta landing page de ecommerce/dropshipping y extrae en JSON:

1. "price": Precio principal del producto (solo número, sin símbolo de moneda). Si hay precio promocional/descuento, usa ese.
2. "priceFormatted": Precio como aparece en la página (ej: "$89.900", "COP 74.900")
3. "combo": Si hay oferta combo/kit (ej: "2x1", "Kit completo", "Paquete familiar"). Si no hay, null.
4. "gift": Regalos o beneficios incluidos (ej: "Envío gratis", "Regalo sorpresa", "Garantía extendida"). Si no hay, null.
5. "angle": Propuesta de valor principal o gancho de venta en máximo 15 palabras.
6. "headline": Título principal de la página o nombre del producto.
7. "cta": Texto exacto del botón principal de compra.

Responde SOLO el JSON válido. Si no encuentras un campo, usa null.`,
              urls: [ad.landingUrl],
              response: {
                verbosity: 'final',
                inlineOutputMaxBytes: 25000
              }
            }),
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()
          
          let parsedResult: Partial<AnalyzedCompetitor> = {}
          
          try {
            const resultText = data.result?.text || data.result?.json || JSON.stringify(data.result) || ''
            const jsonMatch = resultText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0])
            }
          } catch (parseError) {
            console.error('Error parsing landing page result:', parseError)
          }

          return {
            id: ad.id,
            advertiserName: ad.advertiserName,
            landingUrl: ad.landingUrl,
            adLibraryUrl: ad.adLibraryUrl || '',
            adText: ad.adText || '',
            ctaText: ad.ctaText || '',
            price: parsedResult.price ? Number(parsedResult.price) : null,
            priceFormatted: parsedResult.priceFormatted || null,
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
