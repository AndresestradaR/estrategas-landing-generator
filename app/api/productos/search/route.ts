import { NextRequest, NextResponse } from 'next/server'
import { ProductFilters, Product, SearchResponse } from '@/lib/dropkiller/types'
import { buildDropKillerUrl } from '@/lib/dropkiller/url-builder'

// Cookies de la cuenta premium - se configura en Vercel env vars
const PRODUCT_RESEARCH_COOKIES = process.env.PRODUCT_RESEARCH_COOKIES || ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filters } = body as { filters: ProductFilters }

    if (!PRODUCT_RESEARCH_COOKIES) {
      console.error('[ProductSearch] PRODUCT_RESEARCH_COOKIES env var not configured')
      return NextResponse.json(
        { error: 'Servicio no configurado. Contacta al administrador.' },
        { status: 500 }
      )
    }
    
    const url = buildDropKillerUrl({
      ...filters,
      limit: filters.limit || 50,
      page: filters.page || 1,
    })
    
    // Fetch con cookies de la cuenta premium
    const response = await fetch(url, {
      headers: {
        'Cookie': PRODUCT_RESEARCH_COOKIES,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://app.dropkiller.com/dashboard',
      },
    })

    if (!response.ok) {
      console.error('[ProductSearch] Fetch failed:', response.status)
      return NextResponse.json(
        { error: 'Error al buscar productos. Intenta de nuevo.' },
        { status: response.status }
      )
    }
    
    const html = await response.text()
    
    // Parsear el HTML para extraer productos
    // Esto es una aproximación - el parsing real depende de la estructura del HTML
    const products = parseProductsFromHtml(html)
    
    const result: SearchResponse = {
      products,
      total: products.length,
      page: filters.page || 1,
      hasMore: products.length === (filters.limit || 50),
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error en búsqueda de productos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Parser básico - ajustar según la estructura del HTML
function parseProductsFromHtml(html: string): Product[] {
  const products: Product[] = []
  
  // Buscar datos JSON embebidos en el HTML (común en apps React/Next)
  const jsonMatch = html.match(/<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/)
  
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      // Extraer productos del estado inicial
      if (data.products) {
        return data.products.map((p: any) => ({
          id: p.id || p.uuid,
          externalId: p.externalId || p.external_id || '',
          name: p.name || p.title || '',
          image: p.image || p.thumbnail || '',
          price: p.price || 0,
          stock: p.stock || 0,
          sales7d: p.sales7d || p.sales_7d || 0,
          sales30d: p.sales30d || p.sales_30d || 0,
          revenue7d: p.revenue7d || p.revenue_7d || 0,
          revenue30d: p.revenue30d || p.revenue_30d || 0,
          platform: p.platform || '',
          country: p.country || '',
          url: p.url || '',
        }))
      }
    } catch (e) {
      console.error('Error parsing JSON from HTML:', e)
    }
  }
  
  // Fallback: intentar extraer de tablas HTML
  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match
  
  while ((match = tableRegex.exec(html)) !== null) {
    const row = match[1]
    // Extraer celdas y construir producto
    // Este parsing es muy básico y necesita ajustarse
  }
  
  return products
}
