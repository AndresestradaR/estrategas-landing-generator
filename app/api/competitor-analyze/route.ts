import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeWithBrowser, type ScrapedOffer } from '@/lib/browserless'

// Jina AI Reader - GRATIS, sin API key
const JINA_READER_URL = 'https://r.jina.ai/'

interface AdToAnalyze {
  id: string
  advertiserName: string
  landingUrl: string
  adText?: string
  ctaText?: string
  adLibraryUrl?: string
}

interface PriceOffer {
  label: string
  price: number
  originalPrice?: number
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
  allPrices?: PriceOffer[]
  combo: string | null
  gift: string | null
  angle: string | null
  headline: string | null
  cta: string | null
  source?: 'browserless' | 'jina'
  error?: string
}

// Helper to clean text by removing discount/savings sections
function removeDiscountSections(text: string): string {
  // Remove sections that mention savings/discounts - these contain misleading prices
  const discountPatterns = [
    /ahorr[ao]s?\s*(?:de\s*)?\$?\s*\d{1,3}(?:[.,]\d{3})*/gi,  // "ahorra $49.100", "ahorras de $30.000"
    /descuento\s*(?:de\s*)?\$?\s*\d{1,3}(?:[.,]\d{3})*/gi,    // "descuento $49.100"
    /\d+%\s*off/gi,                                             // "50% off"
    /antes\s*\$?\s*\d{1,3}(?:[.,]\d{3})*/gi,                   // "antes $129.900"
    /precio\s*anterior\s*\$?\s*\d{1,3}(?:[.,]\d{3})*/gi,       // "precio anterior $129.900"
    /te\s*ahorras\s*\$?\s*\d{1,3}(?:[.,]\d{3})*/gi,            // "te ahorras $49.100"
  ]

  let cleaned = text
  for (const pattern of discountPatterns) {
    cleaned = cleaned.replace(pattern, ' ')
  }
  return cleaned
}

// Helper to extract price from text using regex
function extractPriceFromText(text: string): { price: number | null, priceFormatted: string | null } {
  if (!text) return { price: null, priceFormatted: null }

  // First, clean the text by removing discount/savings mentions
  const cleanedText = removeDiscountSections(text)

  // Pattern for Colombian/LATAM prices: $89.900, $149,900, COP 89900, etc.
  const patterns = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})*)/g,  // $89.900 or $89,900
    /COP\s*(\d{1,3}(?:[.,]\d{3})*)/gi, // COP 89900
    /(\d{1,3}(?:[.,]\d{3})*)\s*(?:COP|pesos)/gi, // 89.900 COP
  ]

  const prices: { num: number, formatted: string }[] = []

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(cleanedText)) !== null) {
      const fullMatch = match[0]
      const numPart = match[1]

      // Convert to number: remove dots/commas used as thousands separator
      const cleaned = numPart.replace(/[.,]/g, '')
      const num = parseInt(cleaned, 10)

      // Valid price range for LATAM dropshipping (15,000 to 500,000 COP)
      // This filters out small discount amounts and unrealistic prices
      if (num >= 15000 && num <= 500000) {
        prices.push({ num, formatted: fullMatch })
      }
    }
  }

  if (prices.length === 0) return { price: null, priceFormatted: null }

  // Sort prices from lowest to highest
  prices.sort((a, b) => a.num - b.num)

  // Smart selection: if lowest price is suspiciously low compared to next price,
  // it's probably a discount amount that slipped through - take the second one
  if (prices.length >= 2) {
    const lowest = prices[0].num
    const secondLowest = prices[1].num

    // If lowest is less than 60% of second lowest, it's likely a discount/savings amount
    if (lowest < secondLowest * 0.6) {
      return {
        price: secondLowest,
        priceFormatted: prices[1].formatted
      }
    }
  }

  // Return the lowest valid price
  return {
    price: prices[0].num,
    priceFormatted: prices[0].formatted
  }
}

// Extract info from page content
function extractInfoFromContent(content: string): Partial<AnalyzedCompetitor> {
  const result: Partial<AnalyzedCompetitor> = {}

  // Extract price
  const priceInfo = extractPriceFromText(content)
  result.price = priceInfo.price
  result.priceFormatted = priceInfo.priceFormatted

  // Gift/shipping patterns
  const giftPatterns = [
    /env[ií]o\s*gratis/gi,
    /free\s*shipping/gi,
    /regalo\s*(?:sorpresa|incluido|gratis)/gi,
    /garant[ií]a\s*(?:de\s*)?\d+\s*(?:d[ií]as|meses|a[ñn]os)/gi,
    /devoluci[oó]n\s*gratis/gi,
    /incluye\s+[^.]{5,50}/gi,
    /gratis\s+[^.]{5,30}/gi,
  ]

  const gifts: string[] = []
  for (const pattern of giftPatterns) {
    const match = content.match(pattern)
    if (match) gifts.push(match[0])
  }
  result.gift = gifts.length > 0 ? gifts.slice(0, 2).join(', ') : null

  // Combo patterns
  const comboPatterns = [
    /\d+\s*x\s*\d+/gi, // 2x1, 3x2
    /kit\s*(?:de\s*)?\d+/gi, // Kit de 3
    /pack\s*(?:de\s*)?\d+/gi, // Pack de 2
    /combo\s*(?:de\s*)?\d+/gi, // Combo de 3
    /paquete\s*(?:familiar|completo)/gi,
    /\d+\s*unidades/gi,
    /oferta\s*(?:especial|limitada)/gi,
    /\d+%\s*(?:off|descuento|dto)/gi,
  ]

  for (const pattern of comboPatterns) {
    const match = content.match(pattern)
    if (match) {
      result.combo = match[0]
      break
    }
  }

  // Try to extract headline (first significant line)
  const lines = content.split('\n').filter(l => l.trim().length > 10 && l.trim().length < 150)
  if (lines.length > 0) {
    result.headline = lines[0].trim().substring(0, 100)
  }

  // CTA patterns
  const ctaPatterns = [
    /comprar?\s*ahora/gi,
    /buy\s*now/gi,
    /agregar\s*al\s*carrito/gi,
    /add\s*to\s*cart/gi,
    /hacer\s*pedido/gi,
    /realizar\s*pedido/gi,
    /obtener\s*oferta/gi,
    /pedir\s*ahora/gi,
    /lo\s*quiero/gi,
    /ordenar/gi,
  ]

  for (const pattern of ctaPatterns) {
    const match = content.match(pattern)
    if (match) {
      result.cta = match[0]
      break
    }
  }

  // Detect sales angle from keywords
  const anglePatterns = [
    { pattern: /original|aut[eé]ntico/gi, angle: 'Autenticidad' },
    { pattern: /garant[ií]a|devoluc/gi, angle: 'Garantia' },
    { pattern: /env[ií]o\s*gratis|free\s*ship/gi, angle: 'Envio gratis' },
    { pattern: /oferta|descuento|promo/gi, angle: 'Precio/Oferta' },
    { pattern: /calidad|premium|mejor/gi, angle: 'Calidad' },
    { pattern: /r[aá]pido|inmediato|hoy/gi, angle: 'Rapidez' },
    { pattern: /resultados|funciona|efectivo/gi, angle: 'Resultados' },
  ]

  for (const { pattern, angle } of anglePatterns) {
    if (pattern.test(content)) {
      result.angle = angle
      break
    }
  }

  return result
}

// Fetch page content using Jina AI Reader (FREE)
async function fetchWithJina(url: string): Promise<string | null> {
  try {
    const jinaUrl = JINA_READER_URL + url

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('Jina error for ' + url + ': ' + response.status)
      return null
    }

    const content = await response.text()
    return content
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Timeout fetching ' + url)
    } else {
      console.error('Error fetching ' + url + ':', error.message)
    }
    return null
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
    const { ads } = body as { ads: AdToAnalyze[] }

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un competidor para analizar' }, { status: 400 })
    }

    if (ads.length > 10) {
      return NextResponse.json({ error: 'Maximo 10 competidores por analisis' }, { status: 400 })
    }

    const browserlessKey = process.env.BROWSERLESS_API_KEY
    const hasBrowserless = !!browserlessKey

    // LOG MUY VISIBLE - Este DEBE aparecer en Vercel
    console.log('🚀🚀🚀 COMPETITOR ANALYZE API CALLED 🚀🚀🚀')
    console.log('BROWSERLESS_API_KEY:', hasBrowserless ? `YES (${browserlessKey?.substring(0, 8)}...)` : '❌ NOT SET!')
    console.log('Analyzing', ads.length, 'ads with', hasBrowserless ? 'BROWSERLESS' : 'JINA ONLY')

    // Helper para delay entre requests (evitar rate limit de Browserless)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Analyze each landing page SEQUENTIALLY para evitar rate limit 429
    const results: AnalyzedCompetitor[] = []
    for (const ad of ads) {
        console.log(`\n--- Analyzing: ${ad.advertiserName} ---`)
        console.log(`URL: ${ad.landingUrl}`)

        try {
          // Try Browserless first (captures dynamic content/popups)
          console.log(`[${ad.advertiserName}] Trying Browserless...`)
          const browserData = await scrapeWithBrowser(ad.landingUrl)

          console.log(`[${ad.advertiserName}] Browserless result:`, browserData ? 'Got data' : 'NULL')
          if (browserData) {
            console.log(`[${ad.advertiserName}] Browserless prices:`, browserData.prices.length)
          }

          if (browserData && browserData.prices.length > 0) {
            console.log(`[${ad.advertiserName}] SUCCESS with Browserless: ${browserData.prices.length} prices`)
            console.log(`[${ad.advertiserName}] First price: $${browserData.prices[0].price}`)

            results.push({
              id: ad.id,
              advertiserName: ad.advertiserName,
              landingUrl: ad.landingUrl,
              adLibraryUrl: ad.adLibraryUrl || '',
              adText: ad.adText || '',
              ctaText: ad.ctaText || '',
              price: browserData.prices[0].price,
              priceFormatted: '$' + browserData.prices[0].price.toLocaleString('es-CO'),
              allPrices: browserData.prices,
              combo: browserData.hasCombo ? 'Si' : null,
              gift: browserData.giftDescription,
              angle: null,
              headline: null,
              cta: browserData.cta,
              source: 'browserless' as const,
            })
            // Delay para evitar rate limit de Browserless
            await delay(1500)
            continue
          }

          // Fallback to Jina AI (static content)
          console.log(`[${ad.advertiserName}] Browserless failed/no prices, trying Jina...`)
          const content = await fetchWithJina(ad.landingUrl)

          if (!content) {
            results.push({
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
              error: 'No se pudo extraer el contenido',
            })
            continue
          }

          // Extract info from Jina content
          const extractedInfo = extractInfoFromContent(content)

          console.log('Jina OK for ' + ad.advertiserName + ': price=' + extractedInfo.price)

          results.push({
            id: ad.id,
            advertiserName: ad.advertiserName,
            landingUrl: ad.landingUrl,
            adLibraryUrl: ad.adLibraryUrl || '',
            adText: ad.adText || '',
            ctaText: ad.ctaText || '',
            price: extractedInfo.price || null,
            priceFormatted: extractedInfo.priceFormatted || null,
            combo: extractedInfo.combo || null,
            gift: extractedInfo.gift || null,
            angle: extractedInfo.angle || null,
            headline: extractedInfo.headline || null,
            cta: extractedInfo.cta || null,
            source: 'jina' as const,
          })
        } catch (error: any) {
          console.error('Error analyzing ' + ad.landingUrl + ':', error)
          results.push({
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
            error: error.message || 'Error al analizar landing page',
          })
        }

        // Delay entre requests para evitar rate limit
        await delay(1000)
      }

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
