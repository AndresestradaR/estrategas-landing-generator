import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

// Firecrawl API - más confiable para ecommerce
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape'

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
      
      // Valid price range for LATAM ecommerce (1,000 to 10,000,000)
      if (num >= 1000 && num <= 10000000) {
        prices.push(num)
        formattedPrices.push(fullMatch)
      }
    }
  }
  
  if (prices.length === 0) return { price: null, priceFormatted: null }
  
  // Return the most common price or the first one found
  // Usually the sale price appears first or most frequently
  const priceIndex = 0 // Take first price found (usually the sale price)
  return { 
    price: prices[priceIndex], 
    priceFormatted: formattedPrices[priceIndex] 
  }
}

// Extract info from markdown content
function extractInfoFromMarkdown(markdown: string): Partial<AnalyzedCompetitor> {
  const result: Partial<AnalyzedCompetitor> = {}
  
  // Extract price
  const priceInfo = extractPriceFromText(markdown)
  result.price = priceInfo.price
  result.priceFormatted = priceInfo.priceFormatted
  
  // Look for common ecommerce patterns
  const lowerMarkdown = markdown.toLowerCase()
  
  // Gift/shipping patterns
  const giftPatterns = [
    /env[ií]o\s*gratis/gi,
    /free\s*shipping/gi,
    /regalo\s*(?:sorpresa|incluido|gratis)/gi,
    /garant[ií]a\s*(?:de\s*)?\d+\s*(?:d[ií]as|meses|a[ñn]os)/gi,
    /devoluci[oó]n\s*gratis/gi,
  ]
  
  const gifts: string[] = []
  for (const pattern of giftPatterns) {
    const match = markdown.match(pattern)
    if (match) gifts.push(match[0])
  }
  result.gift = gifts.length > 0 ? gifts.join(', ') : null
  
  // Combo patterns
  const comboPatterns = [
    /\d+\s*x\s*\d+/gi, // 2x1, 3x2
    /kit\s*(?:de\s*)?\d+/gi, // Kit de 3
    /pack\s*(?:de\s*)?\d+/gi, // Pack de 2
    /combo\s*(?:de\s*)?\d+/gi, // Combo de 3
    /paquete\s*(?:familiar|completo)/gi,
  ]
  
  for (const pattern of comboPatterns) {
    const match = markdown.match(pattern)
    if (match) {
      result.combo = match[0]
      break
    }
  }
  
  // Try to extract headline (first H1 or strong text)
  const h1Match = markdown.match(/^#\s+(.+)$/m)
  if (h1Match) result.headline = h1Match[1].substring(0, 100)
  
  // CTA patterns
  const ctaPatterns = [
    /(?:comprar|buy)\s*(?:ahora|now)/gi,
    /(?:agregar|add)\s*(?:al\s*carrito|to\s*cart)/gi,
    /(?:hacer|realizar)\s*pedido/gi,
    /(?:obtener|get)\s*(?:oferta|offer)/gi,
  ]
  
  for (const pattern of ctaPatterns) {
    const match = markdown.match(pattern)
    if (match) {
      result.cta = match[0]
      break
    }
  }
  
  return result
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's Firecrawl API key (stored in same field as rtrvr for now)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rtrvr_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.rtrvr_api_key) {
      return NextResponse.json({ 
        error: 'API key no configurada. Ve a Configuración para agregarla.' 
      }, { status: 400 })
    }

    const apiKey = decrypt(profile.rtrvr_api_key)
    
    const body = await request.json()
    const { ads } = body as { ads: AdToAnalyze[] }

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un competidor para analizar' }, { status: 400 })
    }

    if (ads.length > 10) {
      return NextResponse.json({ error: 'Máximo 10 competidores por análisis' }, { status: 400 })
    }

    console.log(`Analyzing ${ads.length} competitors with Firecrawl`)

    // Analyze each landing page in parallel
    const results: AnalyzedCompetitor[] = await Promise.all(
      ads.map(async (ad) => {
        let debugInfo = ''
        
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 45000)

          debugInfo += `URL: ${ad.landingUrl} | `

          const response = await fetch(FIRECRAWL_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              url: ad.landingUrl,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 3000, // Wait 3s for JS to render
            }),
          })

          clearTimeout(timeoutId)

          const responseText = await response.text()
          debugInfo += `Status: ${response.status} | `

          if (!response.ok) {
            // If Firecrawl fails, try with rtrvr.ai as fallback
            debugInfo += `Firecrawl error: ${responseText.substring(0, 200)}`
            console.error(`Firecrawl error for ${ad.landingUrl}:`, response.status, responseText.substring(0, 500))
            throw new Error(`API error: ${response.status}`)
          }

          let data: any
          try {
            data = JSON.parse(responseText)
          } catch {
            throw new Error(`Invalid JSON: ${responseText.substring(0, 100)}`)
          }

          // Firecrawl returns { success: true, data: { markdown: "..." } }
          const markdown = data.data?.markdown || data.markdown || ''
          debugInfo += `Markdown length: ${markdown.length} | `
          
          console.log(`Firecrawl response for ${ad.advertiserName}:`, markdown.substring(0, 500))

          // Extract info from markdown
          const extractedInfo = extractInfoFromMarkdown(markdown)
          
          debugInfo += `Price: ${extractedInfo.price}`

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
            debug: debugInfo,
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
            debug: debugInfo,
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
