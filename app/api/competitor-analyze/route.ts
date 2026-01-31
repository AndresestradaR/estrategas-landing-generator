import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

// Helper to extract price from text using regex
function extractPriceFromText(text: string): { price: number | null, priceFormatted: string | null } {
  if (!text) return { price: null, priceFormatted: null }

  // Pattern for Colombian/LATAM prices: $89.900, $149,900, COP 89900, etc.
  const patterns = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})*)/g,  // $89.900 or $89,900
    /COP\s*(\d{1,3}(?:[.,]\d{3})*)/gi, // COP 89900
    /(\d{1,3}(?:[.,]\d{3})*)\s*(?:COP|pesos)/gi, // 89.900 COP
  ]

  const prices: number[] = []
  const formattedPrices: string[] = []

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0]
      const numPart = match[1]

      // Convert to number: remove dots/commas used as thousands separator
      const cleaned = numPart.replace(/[.,]/g, '')
      const num = parseInt(cleaned, 10)

      // Valid price range for LATAM ecommerce (5,000 to 5,000,000)
      if (num >= 5000 && num <= 5000000) {
        prices.push(num)
        formattedPrices.push(fullMatch)
      }
    }
  }

  if (prices.length === 0) return { price: null, priceFormatted: null }

  // Return the lowest price (usually the sale price)
  const minIndex = prices.indexOf(Math.min(...prices))
  return {
    price: prices[minIndex],
    priceFormatted: formattedPrices[minIndex]
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

    console.log('Analyzing ' + ads.length + ' competitors with Jina AI Reader (FREE)')

    // Analyze each landing page in parallel
    const results: AnalyzedCompetitor[] = await Promise.all(
      ads.map(async (ad) => {
        try {
          // Fetch content using Jina AI (FREE)
          const content = await fetchWithJina(ad.landingUrl)

          if (!content) {
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
              error: 'No se pudo extraer el contenido',
            }
          }

          // Extract info from content
          const extractedInfo = extractInfoFromContent(content)

          console.log('Analyzed ' + ad.advertiserName + ': price=' + extractedInfo.price)

          return {
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
          }
        } catch (error: any) {
          console.error('Error analyzing ' + ad.landingUrl + ':', error)
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
            error: error.message || 'Error al analizar landing page',
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
