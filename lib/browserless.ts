const BROWSERLESS_URL = 'https://chrome.browserless.io/scrape'

interface PriceOffer {
  label: string
  price: number
  originalPrice?: number
}

export interface ScrapedOffer {
  prices: PriceOffer[]
  hasCombo: boolean
  hasGift: boolean
  giftDescription: string | null
  cta: string | null
  fullText: string
}

export async function scrapeWithBrowser(url: string): Promise<ScrapedOffer | null> {
  const apiKey = process.env.BROWSERLESS_API_KEY

  if (!apiKey) {
    console.log('BROWSERLESS_API_KEY not configured, skipping browser scrape')
    return null
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    const response = await fetch(`${BROWSERLESS_URL}?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        url,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 15000
        },
        waitForSelector: {
          selector: 'body',
          timeout: 5000
        },
        // Intentar click en botones de comprar para revelar precios
        click: {
          selector: [
            'button[class*="comprar"]',
            'button[class*="buy"]',
            'button[class*="pedir"]',
            'button[class*="agregar"]',
            '.add-to-cart',
            '.btn-buy',
            '[data-action="add-to-cart"]'
          ].join(', '),
          timeout: 3000
        },
        waitForTimeout: 2000,
        elements: [
          {
            selector: '[class*="price"], [class*="precio"], [class*="cost"], [class*="valor"], [class*="total"]',
            properties: ['innerText', 'className']
          },
          {
            selector: '[class*="option"], [class*="variant"], [class*="quantity"], [class*="combo"], [class*="frasco"]',
            properties: ['innerText']
          },
          {
            selector: '[class*="modal"], [class*="popup"], [class*="drawer"], [class*="sidebar"], [role="dialog"]',
            properties: ['innerText']
          },
          {
            selector: 'button[class*="submit"], button[class*="checkout"], button[class*="pagar"], button[type="submit"]',
            properties: ['innerText']
          },
          {
            selector: '[class*="gift"], [class*="regalo"], [class*="bonus"], [class*="gratis"]',
            properties: ['innerText']
          }
        ],
        html: true
      })
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('Browserless error:', response.status)
      return null
    }

    const data = await response.json()
    return parseScrapedData(data)

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Browserless timeout for:', url)
    } else {
      console.error('Browserless scrape failed:', error.message)
    }
    return null
  }
}

function parseScrapedData(data: any): ScrapedOffer {
  const allText = extractAllText(data)

  const prices = extractAllPrices(allText)

  // Detectar combos (1 frasco, 2 frascos, etc.)
  const comboPattern = /(\d+)\s*(frasco|unidad|paquete|caja|mes)/gi
  const hasCombo = comboPattern.test(allText)

  // Detectar regalos
  const giftPatterns = [
    /regalo[:\s]*([^,.\n]+)/i,
    /gratis[:\s]*([^,.\n]+)/i,
    /incluye[:\s]*([^,.\n]+)/i,
    /bonus[:\s]*([^,.\n]+)/i,
    /env[ií]o\s*gratis/i,
    /entrega\s*gratis/i
  ]

  let giftDescription: string | null = null
  for (const pattern of giftPatterns) {
    const match = allText.match(pattern)
    if (match) {
      giftDescription = match[1] || match[0]
      break
    }
  }

  // Detectar CTA
  const ctaPatterns = [
    /pedir\s*ahora/i,
    /comprar\s*ahora/i,
    /agregar\s*al\s*carrito/i,
    /pagar\s*ahora/i,
    /finalizar\s*compra/i,
    /lo\s*quiero/i
  ]

  let cta: string | null = null
  for (const pattern of ctaPatterns) {
    const match = allText.match(pattern)
    if (match) {
      cta = match[0]
      break
    }
  }

  return {
    prices,
    hasCombo,
    hasGift: giftDescription !== null,
    giftDescription,
    cta,
    fullText: allText.substring(0, 2000)
  }
}

function extractAllText(data: any): string {
  let text = ''

  if (data.data) {
    for (const element of data.data) {
      if (element.results) {
        for (const result of element.results) {
          if (result.innerText) {
            text += result.innerText + '\n'
          }
        }
      }
    }
  }

  if (data.html) {
    const stripped = data.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    text += stripped
  }

  return text
}

function extractAllPrices(text: string): PriceOffer[] {
  const prices: PriceOffer[] = []

  // Patron para ofertas tipo "1 Frasco $79.900 (antes $129.000)"
  const offerPattern = /(\d+\s*(?:frasco|unidad|mes|paquete|caja)[s]?)[^$]*\$\s*([\d.,]+)(?:[^$]*(?:antes|era)\s*\$?\s*([\d.,]+))?/gi

  let match
  while ((match = offerPattern.exec(text)) !== null) {
    const label = match[1].trim()
    const price = parsePrice(match[2])
    const originalPrice = match[3] ? parsePrice(match[3]) : undefined

    if (price >= 15000 && price <= 500000) {
      prices.push({ label, price, originalPrice })
    }
  }

  // Si no encontro ofertas estructuradas, buscar precios sueltos
  if (prices.length === 0) {
    const simplePattern = /\$\s*([\d]{1,3}(?:[.,]\d{3})*)/g
    while ((match = simplePattern.exec(text)) !== null) {
      const price = parsePrice(match[1])
      if (price >= 15000 && price <= 500000) {
        if (!prices.find(p => p.price === price)) {
          prices.push({ label: 'Precio', price })
        }
      }
    }
  }

  return prices.sort((a, b) => a.price - b.price)
}

function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/\./g, '').replace(/,/g, ''))
}
