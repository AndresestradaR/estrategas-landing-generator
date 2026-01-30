'use client'

import { useState, useMemo } from 'react'
import { ProductFilters } from '@/components/productos/ProductFilters'
import { ProductTable } from '@/components/productos/ProductTable'
import { CookieInput } from '@/components/productos/CookieInput'
import { Product, ProductFilters as Filters } from '@/lib/dropkiller/types'
import { Target, AlertCircle, Search, Users, TrendingUp, DollarSign, ExternalLink, Loader2, CheckCircle, XCircle, BarChart3, Calculator, Truck, Package, Megaphone, PiggyBank, Flame, Sparkles, TrendingDown, Link2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

type TabType = 'search' | 'competitor'

interface CompetitorResult {
  url: string
  price: number | null
  priceFormatted: string | null
  combo: string | null
  gift: string | null
  angle: string | null
  headline: string | null
  cta: string | null
  error?: string
}

interface AnalysisStats {
  count: number
  successCount: number
  priceMin: number | null
  priceMax: number | null
  priceAvg: number | null
}

export default function ProductResearchPage() {
  const [activeTab, setActiveTab] = useState<TabType>('search')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [cookies, setCookies] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // State para análisis de competencia
  const [landingUrls, setLandingUrls] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<CompetitorResult[] | null>(null)
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // State para calculadora de márgenes
  const [costProduct, setCostProduct] = useState<number | ''>('')
  const [costShipping, setCostShipping] = useState<number | ''>('')
  const [costCPA, setCostCPA] = useState<number | ''>('')
  const [effectiveRate, setEffectiveRate] = useState<number>(65) // % de efectividad

  const handleSearch = async (filters: Filters) => {
    if (!cookies) {
      toast.error('Primero ingresa tus cookies de DropKiller')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/productos/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, cookies }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar productos')
      }

      setProducts(data.products)
      
      if (data.products.length === 0) {
        toast('No se encontraron productos con esos filtros', { icon: '🔍' })
      } else {
        toast.success(`Se encontraron ${data.products.length} productos`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Análisis de competencia REAL con rtrvr.ai
  const handleAnalyzeCompetitors = async () => {
    const urls = landingUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')))

    if (urls.length === 0) {
      toast.error('Ingresa al menos una URL válida de landing page')
      return
    }

    if (urls.length > 10) {
      toast.error('Máximo 10 URLs por análisis')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResults(null)
    setAnalysisStats(null)
    setAnalysisError(null)

    try {
      const response = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar competencia')
      }

      setAnalysisResults(data.competitors)
      setAnalysisStats(data.stats)
      toast.success(`Se analizaron ${data.stats.successCount} de ${data.stats.count} landing pages`)
    } catch (err: any) {
      const message = err.message || 'Error desconocido'
      setAnalysisError(message)
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Cálculos de margen
  const marginCalc = useMemo(() => {
    if (!analysisStats || analysisStats.priceMin === null || analysisStats.priceAvg === null || costProduct === '' || costShipping === '' || costCPA === '') {
      return null
    }

    const minCompetitorPrice = analysisStats.priceMin
    const avgCompetitorPrice = analysisStats.priceAvg
    
    const totalCost = Number(costProduct) + Number(costShipping)
    const totalCostWithCPA = totalCost + Number(costCPA)
    
    // Margen si vendemos al precio mínimo de competencia
    const marginAtMinPrice = minCompetitorPrice - totalCostWithCPA
    const marginPercentAtMin = ((marginAtMinPrice / minCompetitorPrice) * 100)
    
    // Margen si vendemos al precio promedio
    const marginAtAvgPrice = avgCompetitorPrice - totalCostWithCPA
    const marginPercentAtAvg = ((marginAtAvgPrice / avgCompetitorPrice) * 100)
    
    // Margen REAL considerando efectividad (devoluciones)
    const realMarginAtMin = marginAtMinPrice * (effectiveRate / 100) - (totalCost * ((100 - effectiveRate) / 100))
    const realMarginAtAvg = marginAtAvgPrice * (effectiveRate / 100) - (totalCost * ((100 - effectiveRate) / 100))
    
    // Precio mínimo viable (para tener al menos 20% de margen real)
    const minViablePrice = Math.ceil((totalCostWithCPA / (1 - 0.20)) / 100) * 100
    
    // Veredicto con mensajes más cercanos
    let verdict: 'go' | 'maybe' | 'nogo' = 'nogo'
    let verdictTitle = ''
    let verdictText = ''
    let verdictTip = ''
    
    if (realMarginAtMin >= 15000) {
      verdict = 'go'
      verdictTitle = '🔥 ¡Está pa\' darle!'
      verdictText = 'Parcero, los números cuadran bien. Hay buen margen incluso si te toca competir al precio más bajo. A meterle que este tiene potencial.'
      verdictTip = '🚀 Arranca con el precio promedio y vas ajustando según cómo responda el mercado.'
    } else if (realMarginAtAvg >= 15000) {
      verdict = 'maybe'
      verdictTitle = '🤔 Puede funcionar, pero ojo...'
      verdictText = 'El margen es justo si vendes al precio del montón. La clave acá es diferenciarte: mejor landing, mejor regalo, mejor ángulo. No te vayas a la guerra de precios que ahí perdemos todos.'
      verdictTip = `💡 Si lo vas a montar, véndelo mínimo a $${minViablePrice.toLocaleString()} para que te quede algo decente.`
    } else {
      verdict = 'nogo'
      verdictTitle = '😬 Este está difícil...'
      verdictText = 'Nea, con estos números el margen queda muy apretado. O consigues mejor precio con el proveedor, o mejor busca otro producto. No vale la pena quemarse por tan poquito.'
      verdictTip = `💸 Para que valga la pena tendrías que venderlo a $${minViablePrice.toLocaleString()} y la competencia está más abajo.`
    }

    return {
      totalCost,
      totalCostWithCPA,
      marginAtMinPrice,
      marginPercentAtMin,
      marginAtAvgPrice,
      marginPercentAtAvg,
      realMarginAtMin,
      realMarginAtAvg,
      minViablePrice,
      verdict,
      verdictTitle,
      verdictText,
      verdictTip
    }
  }, [analysisStats, costProduct, costShipping, costCPA, effectiveRate])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
          <Target className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Encuentra tu Producto Ganador
          </h1>
          <p className="text-text-secondary">
            Busca productos con buenos números y analiza la competencia
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'search'
              ? 'bg-accent text-background'
              : 'text-text-secondary hover:text-text-primary hover:bg-background'
          }`}
        >
          <Search className="w-4 h-4" />
          Buscar Productos
        </button>
        <button
          onClick={() => setActiveTab('competitor')}
          className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'competitor'
              ? 'bg-accent text-background'
              : 'text-text-secondary hover:text-text-primary hover:bg-background'
          }`}
        >
          <Users className="w-4 h-4" />
          Analizar Competencia
        </button>
      </div>

      {/* Tab Content: Buscar Productos */}
      {activeTab === 'search' && (
        <>
          {/* Cookie Input */}
          <CookieInput onCookiesChange={setCookies} />

          {/* Filters */}
          <ProductFilters onSearch={handleSearch} isLoading={isLoading} />

          {/* Error Alert */}
          {error && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-error">Error en la búsqueda</p>
                <p className="text-sm text-error/80">{error}</p>
              </div>
            </div>
          )}

          {/* Results Table */}
          <ProductTable products={products} isLoading={isLoading} />

          {/* Info Footer */}
          <div className="text-center text-sm text-text-secondary/70 py-4">
            <p>Los datos provienen de DropKiller. Necesitas una suscripción activa para usar esta herramienta.</p>
          </div>
        </>
      )}

      {/* Tab Content: Analizar Competencia */}
      {activeTab === 'competitor' && (
        <div className="space-y-6">
          {/* Search Form */}
          <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Análisis de Competencia</h2>
            </div>
            
            <p className="text-text-secondary text-sm">
              Pega las URLs de las landing pages de tu competencia (una por línea). Extraeremos precios, combos, regalos y ángulos de venta.
            </p>

            {/* URLs Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                <Link2 className="w-4 h-4" />
                URLs de Landing Pages (máx. 10)
              </label>
              <textarea
                value={landingUrls}
                onChange={(e) => setLandingUrls(e.target.value)}
                placeholder={`https://tiendaejemplo1.com/producto
https://ofertascolombia.co/sarten
https://megapromos.shop/producto-ganador`}
                rows={5}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm resize-none"
              />
              <p className="text-xs text-text-secondary mt-1">
                💡 Tip: Busca en Meta Ads Library con keywords de tu producto y copia las URLs de las landing pages
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleAnalyzeCompetitors}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-background font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Analizar Landing Pages
                  </>
                )}
              </button>

              <Link 
                href="/dashboard/settings"
                className="text-sm text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                Configurar API Key
              </Link>
            </div>
          </div>

          {/* Error Alert */}
          {analysisError && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-error">Error en el análisis</p>
                <p className="text-sm text-error/80">{analysisError}</p>
                {analysisError.includes('API key') && (
                  <Link 
                    href="/dashboard/settings" 
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-2"
                  >
                    <Settings className="w-4 h-4" />
                    Ir a Configuración
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Analizando landing pages...</h3>
                  <p className="text-sm text-text-secondary">Esto puede tomar unos segundos por cada URL</p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResults && analysisStats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-text-secondary mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Analizados</span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {analysisStats.successCount}/{analysisStats.count}
                  </p>
                </div>

                {analysisStats.priceMin && (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-text-secondary mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Precio Mínimo</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">${analysisStats.priceMin.toLocaleString()}</p>
                  </div>
                )}

                {analysisStats.priceAvg && (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-text-secondary mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Precio Promedio</span>
                    </div>
                    <p className="text-2xl font-bold text-accent">${analysisStats.priceAvg.toLocaleString()}</p>
                  </div>
                )}

                {analysisStats.priceMax && (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-text-secondary mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Precio Máximo</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-500">${analysisStats.priceMax.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Competitors Table */}
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-lg font-semibold text-text-primary">Detalle de Competidores</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Landing Page</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Precio</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Combo/Oferta</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Regalo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Ángulo de Venta</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">CTA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {analysisResults.map((competitor, index) => (
                        <tr key={index} className="hover:bg-background/50 transition-colors">
                          <td className="px-4 py-3">
                            {competitor.error ? (
                              <span className="text-red-500 text-sm flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                Error
                              </span>
                            ) : (
                              <a 
                                href={competitor.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-accent hover:underline flex items-center gap-1 text-sm"
                              >
                                {(() => {
                                  try {
                                    return new URL(competitor.url).hostname
                                  } catch {
                                    return competitor.url.slice(0, 30)
                                  }
                                })()}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {competitor.price ? (
                              <span className="font-semibold text-text-primary">
                                {competitor.priceFormatted || `$${competitor.price.toLocaleString()}`}
                              </span>
                            ) : (
                              <span className="text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-left text-sm">
                            {competitor.combo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs">
                                {competitor.combo}
                              </span>
                            ) : (
                              <span className="text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-left text-sm">
                            {competitor.gift ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-xs">
                                <CheckCircle className="w-3 h-3" />
                                {competitor.gift.length > 30 ? competitor.gift.slice(0, 30) + '...' : competitor.gift}
                              </span>
                            ) : (
                              <span className="text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-left text-sm text-text-secondary max-w-[200px]">
                            <span className="line-clamp-2">{competitor.angle || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-left text-sm">
                            {competitor.cta ? (
                              <span className="text-accent">{competitor.cta}</span>
                            ) : (
                              <span className="text-text-secondary">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculadora de Márgenes */}
              {analysisStats.priceMin && analysisStats.priceAvg && (
                <div className="bg-surface rounded-xl border border-border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-accent" />
                    <h2 className="text-lg font-semibold text-text-primary">Calculadora de Márgenes</h2>
                  </div>
                  
                  <p className="text-text-secondary text-sm mb-6">
                    Mete tus costos acá y miramos si los números dan o si toca buscar otro producto 👇
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Costo Producto */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                        <Package className="w-4 h-4" />
                        Costo Proveedor
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                        <input
                          type="number"
                          value={costProduct}
                          onChange={(e) => setCostProduct(e.target.value ? Number(e.target.value) : '')}
                          placeholder="25000"
                          className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                    </div>

                    {/* Costo Envío */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                        <Truck className="w-4 h-4" />
                        Costo Flete
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                        <input
                          type="number"
                          value={costShipping}
                          onChange={(e) => setCostShipping(e.target.value ? Number(e.target.value) : '')}
                          placeholder="12000"
                          className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                    </div>

                    {/* CPA */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                        <Megaphone className="w-4 h-4" />
                        CPA (Publicidad)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                        <input
                          type="number"
                          value={costCPA}
                          onChange={(e) => setCostCPA(e.target.value ? Number(e.target.value) : '')}
                          placeholder="15000"
                          className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                    </div>

                    {/* Efectividad */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                        <PiggyBank className="w-4 h-4" />
                        % Efectividad
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={effectiveRate}
                          onChange={(e) => setEffectiveRate(Number(e.target.value) || 65)}
                          placeholder="65"
                          min={0}
                          max={100}
                          className="w-full pl-4 pr-8 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Resultados de la calculadora */}
                  {marginCalc && (
                    <div className="space-y-4">
                      {/* Desglose de costos */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-background rounded-lg">
                        <div>
                          <p className="text-xs text-text-secondary mb-1">Costo Total (Producto + Flete)</p>
                          <p className="text-lg font-semibold text-text-primary">${marginCalc.totalCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary mb-1">Costo Total + CPA</p>
                          <p className="text-lg font-semibold text-text-primary">${marginCalc.totalCostWithCPA.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary mb-1">Precio Mín. pa&apos; que cuadre</p>
                          <p className="text-lg font-semibold text-accent">${marginCalc.minViablePrice.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Comparación con competencia */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Al precio mínimo */}
                        <div className={`p-4 rounded-lg border ${marginCalc.realMarginAtMin >= 15000 ? 'bg-green-500/5 border-green-500/30' : marginCalc.realMarginAtMin >= 0 ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                          <p className="text-sm text-text-secondary mb-2">Si te toca pelear al precio mínimo (${analysisStats.priceMin?.toLocaleString()})</p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-text-secondary">Margen bruto</p>
                              <p className={`text-2xl font-bold ${marginCalc.marginAtMinPrice >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${marginCalc.marginAtMinPrice.toLocaleString()}
                              </p>
                              <p className="text-xs text-text-secondary">({marginCalc.marginPercentAtMin.toFixed(1)}%)</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-text-secondary">Lo que realmente queda ({effectiveRate}% efect.)</p>
                              <p className={`text-xl font-bold ${marginCalc.realMarginAtMin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${Math.round(marginCalc.realMarginAtMin).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Al precio promedio */}
                        <div className={`p-4 rounded-lg border ${marginCalc.realMarginAtAvg >= 15000 ? 'bg-green-500/5 border-green-500/30' : marginCalc.realMarginAtAvg >= 0 ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                          <p className="text-sm text-text-secondary mb-2">Si vendes al precio promedio (${analysisStats.priceAvg?.toLocaleString()})</p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-text-secondary">Margen bruto</p>
                              <p className={`text-2xl font-bold ${marginCalc.marginAtAvgPrice >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${marginCalc.marginAtAvgPrice.toLocaleString()}
                              </p>
                              <p className="text-xs text-text-secondary">({marginCalc.marginPercentAtAvg.toFixed(1)}%)</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-text-secondary">Lo que realmente queda ({effectiveRate}% efect.)</p>
                              <p className={`text-xl font-bold ${marginCalc.realMarginAtAvg >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${Math.round(marginCalc.realMarginAtAvg).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Veredicto Final */}
                      <div className={`p-6 rounded-xl border ${
                        marginCalc.verdict === 'go' 
                          ? 'bg-gradient-to-r from-green-500/10 to-accent/10 border-green-500/30' 
                          : marginCalc.verdict === 'maybe'
                          ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                          : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30'
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            marginCalc.verdict === 'go' 
                              ? 'bg-green-500/20' 
                              : marginCalc.verdict === 'maybe'
                              ? 'bg-yellow-500/20'
                              : 'bg-red-500/20'
                          }`}>
                            {marginCalc.verdict === 'go' ? (
                              <Flame className="w-6 h-6 text-green-500" />
                            ) : marginCalc.verdict === 'maybe' ? (
                              <Sparkles className="w-6 h-6 text-yellow-500" />
                            ) : (
                              <TrendingDown className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold mb-2 ${
                              marginCalc.verdict === 'go' 
                                ? 'text-green-500' 
                                : marginCalc.verdict === 'maybe'
                                ? 'text-yellow-500'
                                : 'text-red-500'
                            }`}>
                              {marginCalc.verdictTitle}
                            </h3>
                            <p className="text-text-secondary mb-3">
                              {marginCalc.verdictText}
                            </p>
                            <p className="text-sm text-text-secondary/80 bg-background/50 rounded-lg px-3 py-2">
                              {marginCalc.verdictTip}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state para calculadora */}
                  {!marginCalc && (
                    <div className="text-center py-6 text-text-secondary">
                      <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Llena todos los campos pa&apos; ver si los números dan 📊</p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Note */}
              <div className="text-center text-sm text-text-secondary/70 py-4">
                <p>Los datos se extraen usando rtrvr.ai (~$0.12 por landing page analizada)</p>
              </div>
            </>
          )}

          {/* Empty State */}
          {!isAnalyzing && !analysisResults && !analysisError && (
            <div className="bg-surface rounded-xl border border-border p-12 text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Analiza tu competencia
              </h3>
              <p className="text-text-secondary max-w-md mx-auto mb-4">
                Pega las URLs de las landing pages de tu competencia. Extraeremos precios, combos, regalos y ángulos de venta automáticamente.
              </p>
              <div className="text-sm text-text-secondary/70">
                <p>💡 ¿Cómo encontrar landing pages?</p>
                <p className="mt-1">
                  Busca en{' '}
                  <a 
                    href="https://www.facebook.com/ads/library" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Meta Ads Library
                  </a>
                  {' '}con keywords de tu producto
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
