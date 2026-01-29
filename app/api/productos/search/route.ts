import { NextRequest, NextResponse } from 'next/server'
import { ProductFilters, SearchResponse } from '@/lib/dropkiller/types'
import { scrapeProducts } from '@/lib/product-scraper/scraper'

export const maxDuration = 60 // Allow up to 60 seconds for scraping

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filters } = body as { filters: ProductFilters }

    // Check credentials are configured
    if (!process.env.PRODUCT_RESEARCH_EMAIL || !process.env.PRODUCT_RESEARCH_PASSWORD) {
      console.error('[ProductSearch] Missing PRODUCT_RESEARCH credentials')
      return NextResponse.json(
        { error: 'Servicio no configurado. Contacta al administrador.' },
        { status: 500 }
      )
    }

    console.log('[ProductSearch] Starting search with filters:', JSON.stringify(filters))

    // Use Puppeteer scraper
    const result = await scrapeProducts({
      ...filters,
      limit: filters.limit || 50,
      page: filters.page || 1,
    })

    if (!result.success) {
      console.error('[ProductSearch] Scrape failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Error al buscar productos' },
        { status: 500 }
      )
    }

    const response: SearchResponse = {
      products: result.products || [],
      total: result.products?.length || 0,
      page: filters.page || 1,
      hasMore: (result.products?.length || 0) === (filters.limit || 50),
    }

    console.log(`[ProductSearch] Returning ${response.total} products`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('[ProductSearch] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
