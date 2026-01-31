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

    // Usar /function endpoint con código Puppeteer para hacer click en botones
    const functionUrl = 'https://chrome.browserless.io/function'

    const puppeteerCode = `
export default async function({ page }) {
  await page.goto("${escapedUrl}", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Buscar y hacer click en botones de compra/oferta
  const buttonSelectors = [
    'button:has-text("QUIERO")',
    'button:has-text("OFERTA")',
    'button:has-text("COMPRAR")',
    'button:has-text("PEDIR")',
    'button:has-text("AGREGAR")',
    '[class*="btn"]:has-text("QUIERO")',
    '[class*="btn"]:has-text("OFERTA")',
    '[class*="button"]:has-text("COMPRAR")',
    'a:has-text("QUIERO LA OFERTA")',
    'a:has-text("COMPRAR")',
    '.add-to-cart',
    '.btn-buy',
    '[data-action="add-to-cart"]'
  ];

  for (const selector of buttonSelectors) {
    try {
      const elements = await page.$$("button, a, [role='button']");
      for (const el of elements) {
        const text = await el.evaluate(e => e.innerText || e.textContent || "");
        if (text.toUpperCase().includes("QUIERO") ||
            text.toUpperCase().includes("OFERTA") ||
            text.toUpperCase().includes("COMPRAR") ||
            text.toUpperCase().includes("PEDIR")) {
          await el.click().catch(() => {});
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      }
    } catch (e) {}
  }

  // Extraer texto
  const fullText = await page.evaluate(() => document.body.innerText);

  // Extraer precios de elementos específicos
  const priceText = await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="price"], [class*="precio"], [class*="valor"], [class*="total"], [class*="offer"]');
    return Array.from(els).map(e => e.innerText).join(" | ");
  });

  // Extraer texto de modals/popups
  const modalText = await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="drawer"], [role="dialog"], [class*="offer"]');
    return Array.from(els).map(e => e.innerText).join(" | ");
  });

  return { fullText: fullText.substring(0, 8000), priceText, modalText };
}
`;

    const response = await fetch(`${functionUrl}?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: puppeteerCode })
    })

    console.log('[Browserless] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[Browserless] ERROR response:', response.status)
      console.log('[Browserless] Error body:', errorText.substring(0, 500))
      return null
    }

    // /function devuelve JSON con los datos extraídos
    const data = await response.json()
    console.log('[Browserless] SUCCESS!')
    console.log('[Browserless] fullText length:', data.fullText?.length || 0)
    console.log('[Browserless] priceText:', data.priceText?.substring(0, 300))
    console.log('[Browserless] modalText:', data.modalText?.substring(0, 300))

    const result = parseScrapedData({
      fullText: data.fullText || '',
      prices: data.priceText || '',
      modalText: data.modalText || ''
    })
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
