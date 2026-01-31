const BROWSERLESS_URL = 'https://chrome.browserless.io/function'

interface PriceOffer {
  label: string
  quantity: number
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
  clickedButton: string
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

    const escapedUrl = url.replace(/'/g, "\\'").replace(/"/g, '\\"')

    const puppeteerCode = `
export default async function({ page }) {
  let clickedButton = "none";
  let clickSuccess = false;

  await page.goto("${escapedUrl}", { waitUntil: "networkidle2", timeout: 25000 });
  await new Promise(r => setTimeout(r, 2000));

  // PASO 1: Buscar y hacer click en botones de compra
  const buttonKeywords = ["QUIERO", "OFERTA", "COMPRAR", "PEDIR", "AGREGAR", "AÑADIR", "VER PRECIO", "VER OFERTA", "OBTENER", "ORDENAR"];

  try {
    // Selectores específicos para botones de compra
    const buttonSelectors = [
      "button",
      "a[href*='cart']",
      "a[href*='checkout']",
      "[role='button']",
      "[class*='btn']",
      "[class*='button']",
      "[class*='cta']",
      "[class*='buy']",
      "[class*='comprar']",
      "[class*='pedir']",
      "[class*='add-to-cart']",
      "[data-action='buy']",
      "[data-action='add-to-cart']",
      "form[action*='cart'] button",
      ".product-form button"
    ];

    for (const selector of buttonSelectors) {
      if (clickSuccess) break;

      try {
        const elements = await page.$$(selector);

        for (const el of elements) {
          try {
            const text = await el.evaluate(e => (e.innerText || e.textContent || "").toUpperCase().trim());

            for (const keyword of buttonKeywords) {
              if (text.includes(keyword) && text.length < 100) {
                const isVisible = await el.evaluate(e => {
                  const style = window.getComputedStyle(e);
                  return style.display !== 'none' && style.visibility !== 'hidden' && e.offsetParent !== null;
                });

                if (isVisible) {
                  await el.click();
                  clickedButton = text.substring(0, 50);
                  clickSuccess = true;
                  // Esperar 4 segundos para que cargue el modal/popup
                  await new Promise(r => setTimeout(r, 4000));
                  break;
                }
              }
            }
            if (clickSuccess) break;
          } catch (e) {}
        }
      } catch (e) {}
    }
  } catch (e) {}

  // PASO 2: Remover precios tachados del DOM antes de extraer texto
  await page.evaluate(() => {
    // Tags HTML de tachado
    document.querySelectorAll('del, s, strike, ins').forEach(el => el.remove());

    // Clases comunes de precio anterior/tachado
    const oldPriceSelectors = [
      '[class*="old"]', '[class*="was"]', '[class*="before"]',
      '[class*="compare"]', '[class*="regular"]', '[class*="original"]',
      '[class*="tachado"]', '[class*="crossed"]', '[class*="scratch"]',
      '[class*="previous"]', '[class*="retail"]', '[class*="msrp"]',
      '[class*="list-price"]', '[class*="sale-price"]:not([class*="current"])',
      '[data-price-type="old"]', '[data-compare]'
    ];
    document.querySelectorAll(oldPriceSelectors.join(',')).forEach(el => el.remove());

    // Estilo line-through en cualquier elemento
    document.querySelectorAll('*').forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        if (style.textDecoration.includes('line-through')) {
          el.remove();
        }
      } catch (e) {}
    });
  });

  // PASO 3: Extraer ofertas estructuradas (cantidad + precio)
  const structuredOffers = await page.evaluate(() => {
    const offers = [];

    // Buscar contenedores de opciones de producto
    const optionSelectors = [
      '[class*="offer"]', '[class*="option"]', '[class*="variant"]',
      '[class*="package"]', '[class*="bundle"]', '[class*="quantity-option"]',
      '[class*="product-option"]', '[class*="price-option"]',
      '[role="radio"]', '[role="option"]', 'label:has(input[type="radio"])',
      '[class*="card"]:has([class*="price"])', '[class*="plan"]',
      '[class*="frasco"]', '[class*="unidad"]'
    ];

    document.querySelectorAll(optionSelectors.join(',')).forEach(el => {
      const text = el.innerText || "";

      // Múltiples patrones para detectar ofertas
      const patterns = [
        /(\\d+)\\s*(frasco|unidad|mes|paquete|caja|kit)[es]?.*?\\$\\s*([\\d.,]+)/i,
        /lleva\\s*(\\d+).*?\\$\\s*([\\d.,]+)/i,
        /(\\d+)\\s*x.*?\\$\\s*([\\d.,]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const priceStr = match[match.length - 1];
          const price = parseInt(priceStr.replace(/\\./g, '').replace(/,/g, ''));
          if (price >= 15000 && price <= 500000) {
            offers.push({
              quantity: parseInt(match[1]) || 1,
              unit: match[2] || 'unidad',
              price: price,
              text: text.substring(0, 100)
            });
          }
          break;
        }
      }
    });

    // Deduplicar por precio
    const unique = [];
    const seen = new Set();
    offers.forEach(o => {
      if (!seen.has(o.price)) {
        seen.add(o.price);
        unique.push(o);
      }
    });

    return unique.sort((a, b) => a.price - b.price);
  });

  // PASO 3: Extraer todos los precios visibles (excluyendo tachados)
  const allPrices = await page.evaluate(() => {
    const prices = [];

    // Selectores de precio
    const priceSelectors = '[class*="price"]:not([class*="old"]):not([class*="before"]):not([class*="compare"]), [class*="precio"]:not([class*="anterior"]), [class*="valor"], [class*="total"], [class*="amount"], [class*="cost"]';

    document.querySelectorAll(priceSelectors).forEach(el => {
      // Ignorar elementos tachados
      const style = window.getComputedStyle(el);
      if (style.textDecoration.includes('line-through')) return;

      // Ignorar si está dentro de del, s, o tiene clase de precio viejo
      if (el.closest('del, s, strike, [class*="old"], [class*="before"], [class*="tachado"], [class*="compare"], [class*="was"]')) return;

      const text = el.innerText || "";

      // Ignorar si contiene palabras de descuento
      if (/ahorra|descuento|antes|era|was|save/i.test(text)) return;

      // Extraer precios
      const matches = text.matchAll(/\\$\\s*([\\d]{1,3}(?:[.,]\\d{3})*)/g);
      for (const match of matches) {
        const price = parseInt(match[1].replace(/\\./g, '').replace(/,/g, ''));
        if (price >= 15000 && price <= 500000) {
          prices.push(price);
        }
      }
    });

    return [...new Set(prices)].sort((a, b) => a - b);
  });

  // PASO 4: Extraer texto completo
  const fullText = await page.evaluate(() => document.body.innerText);

  // PASO 5: Extraer texto de modals/popups
  const modalText = await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="drawer"], [role="dialog"], [class*="overlay"][style*="visible"], [class*="lightbox"]');
    return Array.from(els).map(e => e.innerText).join(" | ");
  });

  // PASO 6: Extraer texto de elementos de precio
  const priceText = await page.evaluate(() => {
    const els = document.querySelectorAll('[class*="price"], [class*="precio"], [class*="offer"], [class*="total"]');
    return Array.from(els).map(e => e.innerText).join(" | ");
  });

  return {
    fullText: fullText.substring(0, 10000),
    priceText,
    modalText,
    structuredOffers,
    allPrices,
    clickedButton,
    clickSuccess
  };
}
`;

    const response = await fetch(`${BROWSERLESS_URL}?token=${apiKey}`, {
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

    const data = await response.json()
    console.log('[Browserless] SUCCESS!')
    console.log('[Browserless] Clicked button:', data.clickedButton || 'none')
    console.log('[Browserless] Click success:', data.clickSuccess)
    console.log('[Browserless] Structured offers:', JSON.stringify(data.structuredOffers || []))
    console.log('[Browserless] All prices:', JSON.stringify(data.allPrices || []))
    console.log('[Browserless] fullText length:', data.fullText?.length || 0)
    console.log('[Browserless] priceText:', data.priceText?.substring(0, 300))
    console.log('[Browserless] modalText:', data.modalText?.substring(0, 300))

    const result = parseScrapedData(data)
    console.log('[Browserless] Final parsed prices:', result.prices.length, 'main price:', result.price)

    return result

  } catch (error: any) {
    console.error('[Browserless] EXCEPTION:', error.message)
    console.error('[Browserless] Stack:', error.stack?.substring(0, 300))
    return null
  }
}

function parseScrapedData(data: any): ScrapedOffer {
  const allText = [data.fullText, data.priceText, data.modalText].filter(Boolean).join(' ')
  const prices: PriceOffer[] = []

  // PRIORIDAD 1: Si hay 2+ ofertas estructuradas, usarlas directamente (mejor calidad)
  if (data.structuredOffers && data.structuredOffers.length >= 2) {
    console.log('[parseScrapedData] Usando', data.structuredOffers.length, 'ofertas estructuradas')
    for (const offer of data.structuredOffers) {
      prices.push({
        label: `${offer.quantity} ${offer.unit || 'unidad'}`,
        quantity: offer.quantity || 1,
        price: offer.price
      })
    }
    // Si tenemos ofertas estructuradas, no necesitamos más
    prices.sort((a, b) => a.price - b.price)
    return buildResult(prices, allText, data)
  }

  // PRIORIDAD 2: Usar ofertas estructuradas + complementar con allPrices
  if (data.structuredOffers && data.structuredOffers.length > 0) {
    for (const offer of data.structuredOffers) {
      prices.push({
        label: `${offer.quantity} ${offer.unit || 'unidad'}`,
        quantity: offer.quantity || 1,
        price: offer.price
      })
    }
  }

  // Agregar precios del DOM que no estén ya incluidos
  if (data.allPrices && data.allPrices.length > 0) {
    for (const price of data.allPrices) {
      if (!prices.find(p => p.price === price)) {
        prices.push({
          label: 'Precio',
          quantity: 1,
          price: price
        })
      }
    }
  }

  // PRIORIDAD 3: Extraer del texto con regex (última opción)
  if (prices.length === 0) {
    // Limpiar texto de descuentos y precios anteriores
    const cleanText = allText
      .replace(/ahorra[s]?\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/descuento[s]?\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/antes\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/era\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/precio\s*anterior\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/precio\s*regular\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/precio\s*original\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/regular\s*:?\s*\$?\s*[\d.,]+/gi, '')
      .replace(/\$[\d.,]+\s*(?:antes|tachado|regular|original)/gi, '')
      .replace(/-\s*\$[\d.,]+/g, '')

    // Buscar ofertas estructuradas en el texto
    const offerPattern = /(\d+)\s*(frasco|unidad|mes|paquete|caja)[s]?[^\$]*\$\s*([\d.,]+)/gi
    let match
    while ((match = offerPattern.exec(cleanText)) !== null) {
      const price = parseInt(match[3].replace(/\./g, '').replace(/,/g, ''))
      if (price >= 15000 && price <= 500000) {
        prices.push({
          label: `${match[1]} ${match[2]}`,
          quantity: parseInt(match[1]),
          price: price
        })
      }
    }

    // Si aún no hay precios, buscar precios sueltos
    if (prices.length === 0) {
      const pricePattern = /\$\s*([\d]{1,3}(?:[.,]\d{3})*)/g
      while ((match = pricePattern.exec(cleanText)) !== null) {
        const price = parseInt(match[1].replace(/\./g, '').replace(/,/g, ''))
        if (price >= 15000 && price <= 500000) {
          if (!prices.find(p => p.price === price)) {
            prices.push({
              label: 'Precio',
              quantity: 1,
              price: price
            })
          }
        }
      }
    }
  }

  // Ordenar por precio
  prices.sort((a, b) => a.price - b.price)

  return buildResult(prices, allText, data)
}

function buildResult(prices: PriceOffer[], allText: string, data: any): ScrapedOffer {
  // Detectar combos
  const hasCombo = /combo|2x1|3x2|\d+\s*frasco|\d+\s*unidad|\d+\s*mes/i.test(allText)

  // Detectar regalos
  const giftMatch = allText.match(/regalo[:\s]*([^,.\n]{3,40})|gratis[:\s]*([^,.\n]{3,40})|incluye[:\s]*([^,.\n]{3,40})/i)
  const hasGift = /regalo|gratis|incluye|bonus|env[ií]o\s*gratis/i.test(allText)
  const giftDescription = giftMatch ? (giftMatch[1] || giftMatch[2] || giftMatch[3])?.trim() || null : null

  // Detectar CTA
  const ctaMatch = allText.match(/pedir\s*ahora|comprar\s*ahora|agregar\s*al\s*carrito|pagar\s*ahora|lo\s*quiero/i)

  return {
    price: prices.length > 0 ? prices[0].price : null,
    prices: prices,
    hasCombo,
    hasGift,
    giftDescription,
    cta: ctaMatch ? ctaMatch[0] : null,
    fullText: allText.substring(0, 2000),
    clickedButton: data.clickedButton || 'none'
  }
}
