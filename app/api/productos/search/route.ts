import { NextRequest, NextResponse } from 'next/server'
import { ProductFilters, Product, SearchResponse } from '@/lib/dropkiller/types'

export const maxDuration = 30

const BASE_URL = 'https://www.dropkiller.com'

// Build URL with filters
function buildUrl(filters: ProductFilters): string {
  const params = new URLSearchParams()

  if (filters.country) params.set('country', filters.country)
  if (filters.platform) params.set('platform', filters.platform)
  if (filters.minSales7d) params.set('s7min', filters.minSales7d.toString())
  if (filters.maxSales7d) params.set('s7max', filters.maxSales7d.toString())
  if (filters.minSales30d) params.set('s30min', filters.minSales30d.toString())
  if (filters.maxSales30d) params.set('s30max', filters.maxSales30d.toString())
  if (filters.minStock) params.set('stock-min', filters.minStock.toString())
  if (filters.maxStock) params.set('stock-max', filters.maxStock.toString())
  if (filters.minPrice) params.set('price-min', filters.minPrice.toString())
  if (filters.maxPrice) params.set('price-max', filters.maxPrice.toString())

  params.set('limit', (filters.limit || 50).toString())

  return `${BASE_URL}/dashboard/products?${params.toString()}`
}

// Parse products from HTML
function parseProducts(html: string): Product[] {
  const products: Product[] = []

  // Try to find Next.js data
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1])
      const pageProps = nextData?.props?.pageProps

      // Look for products in different possible locations
      const productList = pageProps?.products ||
                         pageProps?.initialProducts ||
                         pageProps?.data?.products ||
                         []

      if (Array.isArray(productList) && productList.length > 0) {
        return productList.map((p: any, i: number) => ({
          id: p.id || p._id || `product-${i}`,
          externalId: p.externalId || p.external_id || '',
          name: p.name || p.title || p.productName || 'Sin nombre',
          image: p.image || p.thumbnail || p.imageUrl || p.img || '',
          price: parseFloat(p.price || p.productPrice || 0),
          stock: parseInt(p.stock || p.inventory || 0),
          sales7d: parseInt(p.sales7d || p.sales_7d || p.weekSales || 0),
          sales30d: parseInt(p.sales30d || p.sales_30d || p.monthSales || 0),
          revenue7d: parseFloat(p.revenue7d || p.revenue_7d || 0),
          revenue30d: parseFloat(p.revenue30d || p.revenue_30d || 0),
          platform: p.platform || p.source || '',
          country: p.country || '',
          url: p.url || p.productUrl || p.link || '',
        }))
      }
    } catch (e) {
      console.error('[Parse] Error parsing __NEXT_DATA__:', e)
    }
  }

  return products
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filters } = body as { filters: ProductFilters }

    const cookies = process.env.PRODUCT_RESEARCH_COOKIES
    if (!cookies) {
      return NextResponse.json(
        { error: 'Servicio no configurado. Contacta al administrador.' },
        { status: 500 }
      )
    }

    const url = buildUrl(filters)
    console.log('[ProductSearch] Fetching:', url)

    const response = await fetch(url, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    })

    if (!response.ok) {
      console.error('[ProductSearch] Fetch failed:', response.status)
      return NextResponse.json(
        { error: 'Error al conectar. Las cookies pueden haber expirado.' },
        { status: 500 }
      )
    }

    const html = await response.text()

    // Check if redirected to login
    if (html.includes('sign-in') || html.includes('/login')) {
      return NextResponse.json(
        { error: 'Sesión expirada. Actualiza las cookies.' },
        { status: 401 }
      )
    }

    const products = parseProducts(html)

    const result: SearchResponse = {
      products,
      total: products.length,
      page: filters.page || 1,
      hasMore: products.length === (filters.limit || 50),
    }

    console.log(`[ProductSearch] Found ${products.length} products`)
    return NextResponse.json(result)

  } catch (error) {
    console.error('[ProductSearch] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
