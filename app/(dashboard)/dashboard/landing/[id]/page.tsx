'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { 
  LayoutTemplate, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic,
  ArrowLeft,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

const TEMPLATE_CATEGORIES = [
  { id: 'hero', name: 'Hero' },
  { id: 'oferta', name: 'Oferta' },
  { id: 'antes-despues', name: 'Antes/Después' },
  { id: 'beneficios', name: 'Beneficios' },
  { id: 'tabla-comparativa', name: 'Tabla Comparativa' },
  { id: 'autoridad', name: 'Prueba de Autoridad' },
  { id: 'testimonios', name: 'Testimonios' },
  { id: 'modo-uso', name: 'Modo de Uso' },
  { id: 'logistica', name: 'Logística' },
  { id: 'faq', name: 'Preguntas Frecuentes' },
]

const OUTPUT_SIZES = [
  { id: 'original', name: 'Tamaño Original', dimensions: 'Según plantilla' },
  { id: 'horizontal', name: 'Horizontal (16:9)', dimensions: '1920 x 1080 px' },
  { id: 'vertical', name: 'Vertical (9:16)', dimensions: '1080 x 1920 px' },
  { id: 'square', name: 'Cuadrada (1:1)', dimensions: '1080 x 1080 px' },
  { id: 'portrait', name: 'Retrato (4:5)', dimensions: '1080 x 1350 px' },
]

interface Product {
  id: string
  name: string
  description?: string
}

interface Template {
  id: string
  name: string
  image_url: string
  category: string
  dimensions?: string
}

export default function ProductGeneratePage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [uploadedTemplate, setUploadedTemplate] = useState<string | null>(null)
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeCategory, setActiveCategory] = useState('hero')
  const [selectedInGallery, setSelectedInGallery] = useState<Template | null>(null)
  
  // Product photos
  const [productPhotos, setProductPhotos] = useState<(string | null)[]>([null, null, null])
  
  // Output settings
  const [selectedSize, setSelectedSize] = useState(OUTPUT_SIZES[0])
  
  // Creative controls
  const [showCreativeControls, setShowCreativeControls] = useState(false)
  const [creativeControls, setCreativeControls] = useState({
    productDetails: '',
    salesAngle: '',
    targetAvatar: '',
    additionalInstructions: '',
  })

  // Generated result
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const templateInputRef = useRef<HTMLInputElement>(null)
  const photoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProduct()
    fetchTemplates()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()
      if (data.product) {
        setProduct(data.product)
      } else {
        toast.error('Producto no encontrado')
        router.push('/dashboard/landing')
      }
    } catch (error) {
      toast.error('Error al cargar producto')
      router.push('/dashboard/landing')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()
      if (data.templates) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedTemplate(reader.result as string)
        setSelectedTemplate(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoUpload = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhotos = [...productPhotos]
        newPhotos[index] = reader.result as string
        setProductPhotos(newPhotos)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = [...productPhotos]
    newPhotos[index] = null
    setProductPhotos(newPhotos)
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const filteredTemplates = templates.filter(t => t.category === activeCategory)

  const handleGenerate = async () => {
    if (!selectedTemplate && !uploadedTemplate) {
      toast.error('Selecciona o sube una plantilla')
      return
    }

    if (!productPhotos.some(p => p !== null)) {
      toast.error('Sube al menos una foto del producto')
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)
    
    try {
      const response = await fetch('/api/generate-landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName: product?.name,
          templateId: selectedTemplate?.id,
          templateUrl: selectedTemplate?.image_url || uploadedTemplate,
          productPhotos: productPhotos.filter(p => p !== null),
          outputSize: selectedSize.id,
          creativeControls: showCreativeControls ? creativeControls : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar')
      }

      setGeneratedImage(data.imageUrl)
      toast.success('¡Sección generada!')
    } catch (error: any) {
      toast.error(error.message || 'Error al generar sección')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard/landing')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-sm text-text-secondary flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Generador de Landings
          </p>
          <h1 className="text-xl font-bold text-text-primary">{product?.name}</h1>
        </div>
      </div>

      {/* Main Content */}
      <Card className="p-6 mb-6">
        {/* Template and Product Photos Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Template Preview - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="relative aspect-[16/10] bg-gradient-to-br from-surface to-background rounded-xl border border-border overflow-hidden">
              {selectedTemplate || uploadedTemplate ? (
                <>
                  {/* Dimensions badge */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                    📐 {selectedTemplate?.dimensions || 'Custom'}
                  </div>
                  
                  <img
                    src={uploadedTemplate || selectedTemplate?.image_url}
                    alt="Template"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Change template button */}
                  <button
                    onClick={() => setShowTemplateGallery(true)}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-accent hover:bg-accent-hover text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cambiar plantilla
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowTemplateGallery(true)}
                  className="w-full h-full flex flex-col items-center justify-center hover:bg-accent/5 transition-colors"
                >
                  <LayoutTemplate className="w-12 h-12 text-accent/40 mb-3" />
                  <p className="text-text-primary font-medium">Seleccionar Plantilla</p>
                  <p className="text-sm text-text-secondary">de la Galería de Diseños</p>
                </button>
              )}
            </div>
          </div>

          {/* Product Photos - Takes 1 column */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-text-primary">
                Fotos del Producto
              </label>
              <span className="text-xs text-text-secondary">(1-3 fotos)</span>
            </div>

            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="aspect-square relative">
                  {productPhotos[index] ? (
                    <div className="w-full h-full rounded-xl overflow-hidden border border-border bg-surface">
                      <img
                        src={productPhotos[index]!}
                        alt={`Producto ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-lg hover:bg-error/20 hover:text-error transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => photoInputRefs[index].current?.click()}
                      className="w-full h-full rounded-xl border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center"
                    >
                      <ImageIcon className="w-8 h-8 text-text-secondary/40 mb-2" />
                      <span className="text-sm text-text-secondary">Imagen {index + 1}</span>
                    </button>
                  )}
                  <input
                    ref={photoInputRefs[index]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload(index)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Output Size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              📐 Tamaño de Salida
            </label>
            <div className="relative">
              <select
                value={selectedSize.id}
                onChange={(e) => setSelectedSize(OUTPUT_SIZES.find(s => s.id === e.target.value) || OUTPUT_SIZES[0])}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                {OUTPUT_SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{selectedSize.dimensions}</p>
          </div>

          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              🌐 Idioma de Salida
            </label>
            <div className="relative">
              <select
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                defaultValue="es"
              >
                <option value="es">Español</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Creative Controls */}
        <div className="border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-text-primary">
                Controles Creativos <span className="text-text-secondary font-normal">(Opcional)</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Personaliza tu sección</span>
              <button
                onClick={() => setShowCreativeControls(!showCreativeControls)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showCreativeControls ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  showCreativeControls ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {showCreativeControls && (
            <div className="mt-6 space-y-4">
              {/* Product Details */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    📄 Detalles del Producto
                  </label>
                  <span className="text-xs text-text-secondary">Máx. 500 caracteres</span>
                </div>
                <div className="relative">
                  <textarea
                    placeholder="Describe las características, beneficios y detalles importantes del producto..."
                    value={creativeControls.productDetails}
                    onChange={(e) => setCreativeControls({ ...creativeControls, productDetails: e.target.value.slice(0, 500) })}
                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                    rows={2}
                  />
                  <button className="absolute right-3 top-3 p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Incluye información sobre beneficios, ingredientes, usos, resultados, etc.
                </p>
              </div>

              {/* Sales Angle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    📈 Ángulo de Venta
                  </label>
                  <span className="text-xs text-text-secondary">Máx. 500 caracteres</span>
                </div>
                <div className="relative">
                  <textarea
                    placeholder="Ejemplo: Mujeres en transición de menopausia buscando alivio natural"
                    value={creativeControls.salesAngle}
                    onChange={(e) => setCreativeControls({ ...creativeControls, salesAngle: e.target.value.slice(0, 500) })}
                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                    rows={2}
                  />
                  <button className="absolute right-3 top-3 p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Target Avatar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    🎯 Avatar de Cliente Ideal
                  </label>
                  <span className="text-xs text-text-secondary">Máx. 500 caracteres</span>
                </div>
                <div className="relative">
                  <textarea
                    placeholder="Ejemplo: Mujeres 45-55 años, preocupadas por su salud"
                    value={creativeControls.targetAvatar}
                    onChange={(e) => setCreativeControls({ ...creativeControls, targetAvatar: e.target.value.slice(0, 500) })}
                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                    rows={2}
                  />
                  <button className="absolute right-3 top-3 p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Additional Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                    💬 Instrucciones Adicionales
                  </label>
                  <span className="text-xs text-text-secondary">Máx. 500 caracteres</span>
                </div>
                <div className="relative">
                  <textarea
                    placeholder="Cualquier instrucción específica para la generación..."
                    value={creativeControls.additionalInstructions}
                    onChange={(e) => setCreativeControls({ ...creativeControls, additionalInstructions: e.target.value.slice(0, 500) })}
                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                    rows={2}
                  />
                  <button className="absolute right-3 top-3 p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          className="w-full gap-2 py-4 text-base"
          onClick={handleGenerate}
          isLoading={isGenerating}
        >
          <Sparkles className="w-5 h-5" />
          Generar Sección
        </Button>

        <p className="text-center text-sm text-text-secondary mt-3">
          1 de 5 secciones utilizadas este periodo
        </p>
      </Card>

      {/* Generated Result */}
      {generatedImage && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Resultado Generado</h3>
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={generatedImage} alt="Generado" className="w-full" />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" className="flex-1">
              Regenerar
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                const link = document.createElement('a')
                link.href = generatedImage
                link.download = `${product?.name}-landing.png`
                link.click()
              }}
            >
              Descargar
            </Button>
          </div>
        </Card>
      )}

      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTemplateGallery(false)}
          />
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden z-10 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <LayoutTemplate className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-text-primary">Galería de Diseños</h2>
              </div>
              <button
                onClick={() => setShowTemplateGallery(false)}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="relative border-b border-border shrink-0">
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-surface text-text-secondary hover:text-text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div 
                ref={categoryScrollRef}
                className="flex gap-1 overflow-x-auto scrollbar-hide px-10 py-2"
              >
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-accent text-background'
                        : 'text-text-secondary hover:text-text-primary hover:bg-border/50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-surface text-text-secondary hover:text-text-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <LayoutTemplate className="w-12 h-12 text-accent/30 mx-auto mb-3" />
                  <p className="text-text-secondary">No hay plantillas en esta categoría aún</p>
                  <p className="text-sm text-text-secondary/70 mt-1">Pronto agregaremos más diseños</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedInGallery(template)}
                      className={`group relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${
                        selectedInGallery?.id === template.id
                          ? 'border-accent ring-2 ring-accent/30'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <img
                        src={template.image_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedInGallery?.id === template.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-background" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between shrink-0">
              <p className="text-sm text-text-secondary">
                Haz clic en un template para seleccionarlo
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowTemplateGallery(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedInGallery) {
                      setSelectedTemplate(selectedInGallery)
                      setUploadedTemplate(null)
                      setShowTemplateGallery(false)
                    }
                  }}
                  disabled={!selectedInGallery}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Usar Este Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
