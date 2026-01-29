// Product scraper with automatic login
import { Page } from 'puppeteer-core'
import { getNewPage } from './browser'
import { Product, ProductFilters } from '../dropkiller/types'
import { PRODUCT_API_BASE_URL } from '../dropkiller/constants'

const LOGIN_URL = 'https://www.dropkiller.com/sign-in'
const DASHBOARD_URL = 'https://www.dropkiller.com/dashboard'

// Session cache
let cachedCookies: string | null = null
let cookiesExpiry: number = 0

export interface ScrapeResult {
  success: boolean
  products?: Product[]
  error?: string
}

/**
 * Build the products URL with filters
 */
function buildProductsUrl(filters: ProductFilters): string {
  const params = new URLSearchParams()

  if (filters.platform) params.set('platform', filters.platform)
  if (filters.country) params.set('country', filters.country)
  if (filters.minSales7d) params.set('s7min', filters.minSales7d.toString())
  if (filters.maxSales7d) params.set('s7max', filters.maxSales7d.toString())
  if (filters.minSales30d) params.set('s30min', filters.minSales30d.toString())
  if (filters.maxSales30d) params.set('s30max', filters.maxSales30d.toString())
  if (filters.minStock) params.set('stock-min', filters.minStock.toString())
  if (filters.maxStock) params.set('stock-max', filters.maxStock.toString())
  if (filters.minPrice) params.set('price-min', filters.minPrice.toString())
  if (filters.maxPrice) params.set('price-max', filters.maxPrice.toString())

  const limit = filters.limit || 50
  params.set('limit', limit.toString())

  return `https://www.dropkiller.com/dashboard/products?${params.toString()}`
}

/**
 * Login to the platform
 */
async function login(page: Page): Promise<boolean> {
  const email = process.env.PRODUCT_RESEARCH_EMAIL
  const password = process.env.PRODUCT_RESEARCH_PASSWORD

  if (!email || !password) {
    console.error('[Scraper] Missing credentials')
    return false
  }

  console.log('[Scraper] Navigating to login page...')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 })

  // Wait for Clerk's login form
  await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 })

  console.log('[Scraper] Filling email...')
  // Clerk uses 'identifier' for the email field
  const emailInput = await page.$('input[name="identifier"]') || await page.$('input[type="email"]')
  if (emailInput) {
    await emailInput.type(email, { delay: 50 })
  }

  // Click continue button
  const continueButton = await page.$('button[type="submit"]')
  if (continueButton) {
    await continueButton.click()
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
  }

  // Wait for password field
  await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 10000 })

  console.log('[Scraper] Filling password...')
  const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]')
  if (passwordInput) {
    await passwordInput.type(password, { delay: 50 })
  }

  // Click submit
  const submitButton = await page.$('button[type="submit"]')
  if (submitButton) {
    await submitButton.click()
  }

  // Wait for redirect to dashboard
  console.log('[Scraper] Waiting for dashboard redirect...')
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })

    // Check if we're on the dashboard
    const currentUrl = page.url()
    if (currentUrl.includes('/dashboard')) {
      console.log('[Scraper] Login successful!')
      return true
    }
  } catch (e) {
    console.error('[Scraper] Navigation timeout after login')
  }

  // Check for error messages
  const errorElement = await page.$('.cl-formFieldError, .error-message, [data-localization-key*="error"]')
  if (errorElement) {
    const errorText = await page.evaluate(el => el.textContent, errorElement)
    console.error('[Scraper] Login error:', errorText)
  }

  return false
}

/**
 * Extract products from the page
 */
async function extractProducts(page: Page): Promise<Product[]> {
  console.log('[Scraper] Extracting products from page...')

  // Wait for the product grid/table to load
  await page.waitForSelector('[data-testid="product-card"], .product-card, table tbody tr, [class*="ProductCard"]', {
    timeout: 15000,
  }).catch(() => console.log('[Scraper] Product selector timeout, trying to extract anyway...'))

  // Give React time to render
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Extract products using page evaluation
  const products = await page.evaluate(() => {
    const items: any[] = []

    // Try to find products in different possible structures

    // Method 1: Look for Next.js hydration data
    const nextDataScript = document.querySelector('#__NEXT_DATA__')
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript.textContent || '{}')
        const pageProps = nextData?.props?.pageProps
        if (pageProps?.products) {
          return pageProps.products
        }
        if (pageProps?.initialData?.products) {
          return pageProps.initialData.products
        }
      } catch (e) {
        console.log('Failed to parse __NEXT_DATA__')
      }
    }

    // Method 2: Look for product cards in the DOM
    const productCards = document.querySelectorAll('[data-testid="product-card"], .product-card, [class*="ProductCard"]')
    productCards.forEach((card, index) => {
      const nameEl = card.querySelector('[class*="name"], [class*="title"], h3, h4')
      const priceEl = card.querySelector('[class*="price"]')
      const imageEl = card.querySelector('img')
      const salesEl = card.querySelector('[class*="sales"], [class*="ventas"]')

      items.push({
        id: `product-${index}`,
        name: nameEl?.textContent?.trim() || 'Producto sin nombre',
        price: parseFloat(priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0'),
        image: imageEl?.src || '',
        sales7d: parseInt(salesEl?.textContent?.replace(/[^0-9]/g, '') || '0'),
        sales30d: 0,
        revenue7d: 0,
        revenue30d: 0,
        stock: 0,
        platform: '',
        country: '',
        url: '',
      })
    })

    // Method 3: Look for table rows
    if (items.length === 0) {
      const rows = document.querySelectorAll('table tbody tr')
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 3) {
          const imageEl = row.querySelector('img')
          items.push({
            id: `product-${index}`,
            name: cells[1]?.textContent?.trim() || 'Producto',
            price: parseFloat(cells[2]?.textContent?.replace(/[^0-9.]/g, '') || '0'),
            image: imageEl?.src || '',
            sales7d: parseInt(cells[3]?.textContent?.replace(/[^0-9]/g, '') || '0'),
            sales30d: parseInt(cells[4]?.textContent?.replace(/[^0-9]/g, '') || '0'),
            revenue7d: 0,
            revenue30d: 0,
            stock: parseInt(cells[5]?.textContent?.replace(/[^0-9]/g, '') || '0'),
            platform: cells[6]?.textContent?.trim() || '',
            country: '',
            url: '',
          })
        }
      })
    }

    return items
  })

  console.log(`[Scraper] Extracted ${products.length} products`)
  return products
}

/**
 * Main scrape function
 */
export async function scrapeProducts(filters: ProductFilters): Promise<ScrapeResult> {
  let page: Page | null = null

  try {
    console.log('[Scraper] Starting product scrape...')
    page = await getNewPage()

    // Try to go directly to products page (in case cookies work)
    const productsUrl = buildProductsUrl(filters)
    console.log('[Scraper] Navigating to:', productsUrl)

    await page.goto(productsUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // Check if we need to login
    const currentUrl = page.url()
    if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
      console.log('[Scraper] Session expired, need to login...')

      const loginSuccess = await login(page)
      if (!loginSuccess) {
        return { success: false, error: 'No se pudo iniciar sesión. Verifica las credenciales.' }
      }

      // Navigate back to products page
      await page.goto(productsUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    }

    // Extract products
    const products = await extractProducts(page)

    if (products.length === 0) {
      // Take screenshot for debugging
      console.log('[Scraper] No products found, page URL:', page.url())
      return { success: true, products: [] }
    }

    return { success: true, products }

  } catch (error: any) {
    console.error('[Scraper] Error:', error.message)
    return { success: false, error: error.message || 'Error al buscar productos' }
  } finally {
    if (page) {
      await page.close()
    }
  }
}
