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

    const response = await fetch(`${BROWSERLESS_URL}?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `
          module.exports = async ({ page }) => {
            await page.goto('${escapedUrl}', { waitUntil: 'networkidle2', timeout: 15000 });

            // Esperar a que cargue
            await page.waitForTimeout(2000);

            // Intentar hacer click en botón de comprar
            const buyButtons = [
              'button[class*="comprar"]',
              'button[class*="buy"]',
              'button[class*="pedir"]',
              'button[class*="agregar"]',
              '.add-to-cart',
              '.btn-buy',
              '[class*="product-button"]',
              'button[class*="cart"]'
            ];

            for (const selector of buyButtons) {
              try {
                const btn = await page.$(selector);
                if (btn) {
                  await btn.click();
                  await page.waitForTimeout(2000);
                  break;
                }
              } catch (e) {}
            }

            // Extraer todo el texto visible
            const text = await page.evaluate(() => document.body.innerText);

            // Extraer precios específicamente
            const prices = await page.evaluate(() => {
              const priceElements = document.querySelectorAll('[class*="price"], [class*="precio"], [class*="valor"], [class*="total"]');
              return Array.from(priceElements).map(el => el.innerText).join(' | ');
            });

            // Buscar modal/popup
            const modalText = await page.evaluate(() => {
              const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="drawer"], [role="dialog"]');
              return Array.from(modals).map(el => el.innerText).join(' | ');
            });

            return {
              fullText: text.substring(0, 5000),
              prices,
              modalText,
              url: page.url()
            };
          };
        `
      })
    })

    console.log('[Browserless] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[Browserless] ERROR response:', response.status)
      console.log('[Browserless] Error body:', errorText.substring(0, 500))
      return null
    }

    const data = await response.json()
    console.log('[Browserless] SUCCESS! Response keys:', Object.keys(data))
    console.log('[Browserless] fullText length:', data.fullText?.length || 0)
    console.log('[Browserless] prices:', data.prices?.substring(0, 300))
    console.log('[Browserless] modalText:', data.modalText?.substring(0, 300))

    const result = parseScrapedData(data)
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
