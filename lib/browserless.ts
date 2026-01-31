const BROWSERLESS_URL = 'https://chrome.browserless.io/function'

interface PriceOffer {
  label: string
  price: number
  originalPrice?: number
}

export interface ScrapedOffer {
  prices: PriceOffer[]
  price: number | null
  hasCombo: boolean
  hasGift: boolean
  giftDescription: string | null
  cta: string | null
  fullText: string
}

export async function scrapeWithBrowser(url: string): Promise<ScrapedOffer | null> {
  const apiKey = process.env.BROWSERLESS_API_KEY

  console.log('========== BROWSERLESS DEBUG ==========')
  console.log('[Browserless] API Key exists:', !!apiKey)
  console.log('[Browserless] API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE')
  console.log('[Browserless] Target URL:', url)

  if (!apiKey) {
    console.log('[Browserless] SKIPPING - No API key!')
    return null
  }

  try {
    console.log('[Browserless] Making request to /function endpoint...')

    // Escapar la URL para usarla dentro del código
    const escapedUrl = url.replace(/'/g, "\\'").replace(/"/g, '\\"')

    // Usar /content endpoint que es más simple y confiable
    const contentUrl = 'https://chrome.browserless.io/content'

    const response = await fetch(`${contentUrl}?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: escapedUrl,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 20000
        },
        waitForSelector: {
          selector: 'body',
          timeout: 10000
        },
        // Esperar para que cargue contenido dinámico
        waitForTimeout: 3000
      })
    })

    console.log('[Browserless] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[Browserless] ERROR response:', response.status)
      console.log('[Browserless] Error body:', errorText.substring(0, 500))
      return null
    }

    // /content devuelve HTML directamente
    const html = await response.text()
    console.log('[Browserless] SUCCESS! HTML length:', html.length)

    // Extraer texto del HTML
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('[Browserless] Text content length:', textContent.length)
    console.log('[Browserless] Text preview:', textContent.substring(0, 500))

    const result = parseScrapedData({ fullText: textContent, prices: '', modalText: '' })
    console.log('[Browserless] Parsed result - prices:', result.prices.length, 'price:', result.price)

    return result

  } catch (error: any) {
    console.error('[Browserless] EXCEPTION:', error.message)
    console.error('[Browserless] Stack:', error.stack?.substring(0, 300))
    return null
  }
}

function parseScrapedData(data: any): ScrapedOffer {
  const allText = [data.fullText, data.prices, data.modalText].filter(Boolean).join(' ')

  // Limpiar texto de descuentos antes de buscar precios
  const cleanText = allText
    .replace(/ahorra[s]?\s*\$?\s*[\d.,]+/gi, '')
    .replace(/descuento[s]?\s*\$?\s*[\d.,]+/gi, '')
    .replace(/-\s*\$[\d.,]+/g, '')
    .replace(/antes\s*\$?\s*[\d.,]+/gi, '')
    .replace(/te\s*ahorras\s*\$?\s*[\d.,]+/gi, '')

  // Extraer precios
  const priceRegex = /\$\s*([\d]{1,3}(?:[.,]\d{3})*)/g
  const prices: number[] = []
  let match

  while ((match = priceRegex.exec(cleanText)) !== null) {
    const price = parseInt(match[1].replace(/\./g, '').replace(/,/g, ''))
    if (price >= 15000 && price <= 500000) {
      if (!prices.includes(price)) {
        prices.push(price)
      }
    }
  }

  prices.sort((a, b) => a - b)

  console.log('[Browserless] Parsed prices:', prices)

  // Detectar combos
  const hasCombo = /combo|2x1|3x2|\d+\s*frasco|\d+\s*unidad|\d+\s*mes/i.test(allText)

  // Detectar regalos
  const giftMatch = allText.match(/regalo[:\s]*([^,.\n]{3,30})|gratis[:\s]*([^,.\n]{3,30})|incluye[:\s]*([^,.\n]{3,30})/i)
  const hasGift = /regalo|gratis|incluye|bonus|env[ií]o\s*gratis/i.test(allText)
  const giftDescription = giftMatch ? (giftMatch[1] || giftMatch[2] || giftMatch[3])?.trim() || null : null

  // Detectar CTA
  const ctaMatch = allText.match(/pedir\s*ahora|comprar\s*ahora|agregar\s*al\s*carrito|pagar\s*ahora|lo\s*quiero/i)

  return {
    price: prices[0] || null,
    prices: prices.map(p => ({ label: 'Precio', price: p })),
    hasCombo,
    hasGift,
    giftDescription,
    cta: ctaMatch ? ctaMatch[0] : null,
    fullText: allText.substring(0, 2000)
  }
}
