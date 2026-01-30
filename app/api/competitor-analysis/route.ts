import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

const RTRVR_API_URL = 'https://api.rtrvr.ai/execute'

interface CompetitorData {
  adUrl: string
  landingUrl: string
  advertiserName: string
  price: number | null
  priceFormatted: string | null
  combo: string | null
  gift: string | null
  angle: string | null
  headline: string | null
  cta: string | null
  adStatus: string
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
    const { keyword, country = 'CO' } = body

    if (!keyword || keyword.trim().length < 2) {
      return NextResponse.json({ error: 'Palabra clave requerida (mínimo 2 caracteres)' }, { status: 400 })
    }

    // Country code mapping for Meta Ads Library
    const countryMap: Record<string, string> = {
      'CO': 'Colombia',
      'MX': 'Mexico',
      'PE': 'Peru',
      'EC': 'Ecuador',
      'CL': 'Chile',
      'AR': 'Argentina',
      'GT': 'Guatemala',
    }

    const countryName = countryMap[country] || 'Colombia'

    // Step 1: Search Meta Ads Library and get landing page URLs
    const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(keyword)}&search_type=keyword_unordered&media_type=all`

    const searchResponse = await fetch(RTRVR_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rtrvrApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: `Estás en la Biblioteca de Anuncios de Meta (Facebook Ads Library).

TAREA: Buscar anuncios activos relacionados con "${keyword}" en ${countryName}.

PASOS:
1. Espera a que carguen los anuncios (máximo 10 segundos)
2. Si aparece un popup de cookies o términos, acéptalo
3. Haz scroll hacia abajo 2-3 veces para cargar más anuncios
4. Identifica hasta 8 anuncios diferentes de DIFERENTES anunciantes (no repitas el mismo anunciante)
5. Para cada anuncio, extrae:
   - El nombre del anunciante/página
   - La URL de la landing page (el link "Ver sitio web" o el dominio que aparece)
   - Si el anuncio está activo

IMPORTANTE:
- Solo anuncios que claramente venden el producto "${keyword}" o similar
- Ignora anuncios de marcas muy grandes (Amazon, MercadoLibre, etc)
- Busca tiendas pequeñas/medianas de dropshipping o ecommerce
- Si no hay botón de "Ver sitio web", busca el dominio en el texto del anuncio

Responde SOLO con un JSON array así:
[
  {
    "advertiserName": "Nombre de la tienda",
    "landingUrl": "https://ejemplo.com/producto",
    "adStatus": "active"
  }
]

Si no encuentras anuncios relevantes, responde con un array vacío: []`,
        urls: [metaAdsUrl],
        response: {
          verbosity: 'final',
          inlineOutputMaxBytes: 100000
        }
      }),
    })

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}))
      console.error('rtrvr.ai search error:', errorData)
      throw new Error(errorData.error || `Error buscando en Meta Ads Library: HTTP ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    
    // Parse the ads found
    let adsFound: Array<{ advertiserName: string; landingUrl: string; adStatus: string }> = []
    
    try {
      const resultText = searchData.result?.text || searchData.result?.json || JSON.stringify(searchData.result) || '[]'
      const jsonMatch = resultText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        adsFound = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Error parsing Meta Ads results:', parseError)
    }

    if (adsFound.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron anuncios activos para esta keyword',
        competitors: [],
        stats: {
          count: 0,
          successCount: 0,
          priceMin: null,
          priceMax: null,
          priceAvg: null,
        }
      })
    }

    // Filter out invalid URLs and limit to 8
    const validAds = adsFound
      .filter(ad => ad.landingUrl && (ad.landingUrl.startsWith('http://') || ad.landingUrl.startsWith('https://')))
      .slice(0, 8)

    if (validAds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Se encontraron anuncios pero no se pudieron extraer las URLs de landing pages',
        competitors: [],
        stats: {
          count: 0,
          successCount: 0,
          priceMin: null,
          priceMax: null,
          priceAvg: null,
        }
      })
    }

    // Step 2: Scrape each landing page for pricing and offer details
    const results: CompetitorData[] = await Promise.all(
      validAds.map(async (ad) => {
        try {
          const response = await fetch(RTRVR_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${rtrvrApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: `Analiza esta landing page de ecommerce/dropshipping y extrae la siguiente información en JSON:
              
1. "price": El precio principal del producto (solo el número, sin símbolo de moneda). Si hay precio tachado y precio promocional, usa el promocional. El precio debe estar en la moneda local (COP para Colombia, MXN para México, etc).
2. "priceFormatted": El precio formateado como aparece en la página (ej: "$89.900", "COP 89,900")
3. "combo": Describe el combo u oferta si existe (ej: "2x1", "Lleva 3 paga 2", "Kit completo", "Compra 2 con descuento"). Si no hay combo, null.
4. "gift": Describe los regalos o bonos incluidos (ej: "Envío gratis", "Ebook gratis", "Accesorio incluido", "Garantía extendida"). Si no hay regalos, null.
5. "angle": El ángulo de venta principal o propuesta de valor en máximo 15 palabras (ej: "Resultados en 7 días", "Tecnología alemana", "100% natural", "El secreto de las famosas")
6. "headline": El título principal o headline de la página
7. "cta": El texto del botón de compra principal (ej: "Comprar ahora", "Agregar al carrito", "¡Lo quiero!", "Pedir ahora")

IMPORTANTE:
- Busca el precio MÁS VISIBLE, generalmente el precio promocional/con descuento
- Si hay múltiples productos, enfócate en el producto principal o el más destacado
- Los precios en Colombia suelen ser números grandes (ej: 89900, 129000)
- Busca ofertas tipo "2x1", "3x2", "combo", "kit", "pack"

Responde SOLO con el JSON, sin explicaciones adicionales. Si no puedes encontrar algún dato, usa null.`,
              urls: [ad.landingUrl],
              response: {
                verbosity: 'final',
                inlineOutputMaxBytes: 50000
              }
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()
          
          let parsedResult: Partial<CompetitorData> = {}
          
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
            adUrl: metaAdsUrl,
            landingUrl: ad.landingUrl,
            advertiserName: ad.advertiserName || 'Desconocido',
            adStatus: ad.adStatus || 'active',
            price: parsedResult.price ? Number(parsedResult.price) : null,
            priceFormatted: parsedResult.priceFormatted || null,
            combo: parsedResult.combo || null,
            gift: parsedResult.gift || null,
            angle: parsedResult.angle || null,
            headline: parsedResult.headline || null,
            cta: parsedResult.cta || null,
          }
        } catch (error: any) {
          console.error(`Error processing landing ${ad.landingUrl}:`, error)
          return {
            adUrl: metaAdsUrl,
            landingUrl: ad.landingUrl,
            advertiserName: ad.advertiserName || 'Desconocido',
            adStatus: ad.adStatus || 'active',
            price: null,
            priceFormatted: null,
            combo: null,
            gift: null,
            angle: null,
            headline: null,
            cta: null,
            error: error.message || 'Error al procesar landing page'
          }
        }
      })
    )

    // Calculate statistics
    const validPrices = results.filter(r => r.price !== null && r.price > 0).map(r => r.price as number)
    const stats = {
      count: results.length,
      successCount: results.filter(r => !r.error && r.price !== null).length,
      priceMin: validPrices.length > 0 ? Math.min(...validPrices) : null,
      priceMax: validPrices.length > 0 ? Math.max(...validPrices) : null,
      priceAvg: validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : null,
      withGift: results.filter(r => r.gift !== null).length,
      withCombo: results.filter(r => r.combo !== null).length,
    }

    return NextResponse.json({
      success: true,
      keyword,
      country,
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
