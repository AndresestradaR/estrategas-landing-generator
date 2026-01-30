import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

const APIFY_API_URL = 'https://api.apify.com/v2/acts/curious_coder~facebook-ads-library-scraper/run-sync-get-dataset-items'
const RTRVR_API_URL = 'https://api.rtrvr.ai/execute'

// Keywords que indican dropshipping/COD en LATAM
const DROPSHIPPING_KEYWORDS = [
  'envío gratis', 'envio gratis',
  'pago contra entrega', 'pago contraentrega', 'contraentrega',
  'paga en casa', 'paga cuando recibas',
  'pago contra reembolso', 'contrareembolso',
  'cod', 'cash on delivery',
  'oferta especial', 'oferta limitada',
  'últimas unidades', 'ultimas unidades',
  'compra ahora', 'pídelo ahora', 'pidelo ahora',
  'garantía de satisfacción', 'garantia de satisfaccion',
  'devolución gratis', 'devolucion gratis',
  '50% de descuento', '50% off', '70% off',
  'precio especial', 'promoción', 'promocion',
]

// Dominios a excluir (no son landing pages de ecommerce)
const EXCLUDED_DOMAINS = [
  'facebook.com',
  'fb.com', 
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'wa.me',
  'whatsapp.com',
  'bit.ly',
  't.me',
  'telegram.me',
]

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
  adText: string | null
  dropshippingScore: number
  error?: string
}

function calculateDropshippingScore(adText: string, ctaText: string, linkUrl: string): number {
  const textToAnalyze = `${adText} ${ctaText} ${linkUrl}`.toLowerCase()
  let score = 0
  
  for (const keyword of DROPSHIPPING_KEYWORDS) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      score += 1
    }
  }
  
  // Bonus si tiene dominio propio (no redes sociales)
  try {
    const domain = new URL(linkUrl).hostname.toLowerCase()
    if (!EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded))) {
      score += 2
    }
    // Bonus extra si parece tienda (shopify, tiendanube, etc)
    if (domain.includes('myshopify') || domain.includes('tiendanube') || 
        domain.includes('vnda') || domain.includes('loja')) {
      score += 1
    }
  } catch {
    // URL inválida
  }
  
  return score
}

function isValidLandingUrl(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    return !EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get Apify API key from environment
    const apifyApiKey = process.env.APIFY_API_TOKEN
    if (!apifyApiKey) {
      return NextResponse.json({ 
        error: 'API key de Apify no configurada en el servidor.' 
      }, { status: 500 })
    }

    // Get user's rtrvr API key for landing page scraping
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

    // Step 1: Search Meta Ads Library using Apify
    const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(keyword)}&search_type=keyword_unordered&media_type=all`

    console.log('Searching Meta Ads Library with Apify:', metaAdsUrl)

    const apifyResponse = await fetch(`${APIFY_API_URL}?token=${apifyApiKey}&timeout=90`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [
          {
            url: metaAdsUrl,
            method: 'GET'
          }
        ],
        count: 20, // Pedir más para tener suficientes después de filtrar
        limitPerSource: 20,
        scrapeAdDetails: true,
      }),
    })

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text()
      console.error('Apify error:', apifyResponse.status, errorText)
      
      if (apifyResponse.status === 408 || errorText.includes('timeout')) {
        throw new Error('La búsqueda tardó demasiado. Intenta con una keyword más específica.')
      }
      throw new Error(`Error buscando en Meta Ads Library: HTTP ${apifyResponse.status}`)
    }

    const apifyData = await apifyResponse.json()
    
    console.log('Apify response received, items:', Array.isArray(apifyData) ? apifyData.length : 'not array')
    
    // Parse and score ads from Apify response
    let adsFound: Array<{ 
      advertiserName: string
      landingUrl: string
      adStatus: string
      adText: string
      adLibraryUrl: string
      ctaText: string
      dropshippingScore: number
    }> = []
    
    if (Array.isArray(apifyData) && apifyData.length > 0) {
      adsFound = apifyData
        .filter((ad: any) => {
          // Must have link_url and be active
          if (!ad.snapshot?.link_url || !ad.is_active) return false
          // Must be a valid landing page (not social media)
          if (!isValidLandingUrl(ad.snapshot.link_url)) return false
          return true
        })
        .map((ad: any) => {
          const adText = ad.snapshot?.body?.text || ''
          const ctaText = ad.snapshot?.cta_text || ''
          const linkUrl = ad.snapshot.link_url
          
          return {
            advertiserName: ad.page_name || ad.snapshot?.page_name || 'Desconocido',
            landingUrl: linkUrl,
            adStatus: ad.is_active ? 'active' : 'inactive',
            adText: adText,
            adLibraryUrl: ad.ad_library_url || '',
            ctaText: ctaText,
            dropshippingScore: calculateDropshippingScore(adText, ctaText, linkUrl),
          }
        })
        // Sort by dropshipping score (highest first)
        .sort((a, b) => b.dropshippingScore - a.dropshippingScore)
    }

    console.log(`Found ${adsFound.length} valid ads after filtering`)

    if (adsFound.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron anuncios de ecommerce/dropshipping para esta keyword. Prueba con palabras más específicas del producto.',
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

    // Remove duplicates by landing URL domain, keeping highest scored
    const seenDomains = new Set<string>()
    const uniqueAds = adsFound.filter(ad => {
      try {
        const domain = new URL(ad.landingUrl).hostname
        if (seenDomains.has(domain)) return false
        seenDomains.add(domain)
        return true
      } catch {
        return false
      }
    }).slice(0, 8) // Limit to 8 unique competitors

    console.log(`Processing ${uniqueAds.length} unique landing pages with rtrvr.ai`)

    // Step 2: Scrape each landing page for pricing using rtrvr.ai (in parallel)
    const results: CompetitorData[] = await Promise.all(
      uniqueAds.map(async (ad) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000)

          const response = await fetch(RTRVR_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${rtrvrApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              input: `Analiza esta landing page de ecommerce y extrae en JSON:

1. "price": Precio principal (solo número, sin símbolo). Usa el precio promocional si hay descuento.
2. "priceFormatted": Precio como aparece (ej: "$89.900")
3. "combo": Oferta/combo si existe (ej: "2x1", "Kit completo"). Si no hay, null.
4. "gift": Regalos incluidos (ej: "Envío gratis"). Si no hay, null.
5. "angle": Propuesta de valor principal en máximo 10 palabras.
6. "headline": Título principal de la página.
7. "cta": Texto del botón de compra.

Responde SOLO el JSON. Si no encuentras algo, usa null.`,
              urls: [ad.landingUrl],
              response: {
                verbosity: 'final',
                inlineOutputMaxBytes: 20000
              }
            }),
          })

          clearTimeout(timeoutId)

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
            adUrl: ad.adLibraryUrl || metaAdsUrl,
            landingUrl: ad.landingUrl,
            advertiserName: ad.advertiserName,
            adStatus: ad.adStatus,
            adText: ad.adText,
            dropshippingScore: ad.dropshippingScore,
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
            adUrl: ad.adLibraryUrl || metaAdsUrl,
            landingUrl: ad.landingUrl,
            advertiserName: ad.advertiserName,
            adStatus: ad.adStatus,
            adText: ad.adText,
            dropshippingScore: ad.dropshippingScore,
            price: null,
            priceFormatted: null,
            combo: null,
            gift: null,
            angle: null,
            headline: null,
            cta: null,
            error: error.name === 'AbortError' ? 'Timeout al procesar landing' : (error.message || 'Error al procesar landing page')
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
