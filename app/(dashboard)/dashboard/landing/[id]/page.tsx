'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, Input } from '@/components/ui'
import { 
  LayoutTemplate, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Sparkles,
  ChevronDown,
  Mic,
  ArrowLeft
} from 'lucide-react'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

const OUTPUT_SIZES = [
  { id: 'horizontal', name: 'Horizontal', dimensions: '1920 x 1080 px', ratio: '16:9' },
  { id: 'vertical', name: 'Vertical', dimensions: '1080 x 1920 px', ratio: '9:16' },
  { id: 'square', name: 'Cuadrada', dimensions: '1080 x 1080 px', ratio: '1:1' },
  { id: 'portrait', name: 'Retrato 4:5', dimensions: '1080 x 1350 px', ratio: '4:5' },
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
  
  // Product photos
  const [productPhotos, setProductPhotos] = useState<(string | null)[]>([null, null, null])
  
  // Output settings
  const [selectedSize, setSelectedSize] = useState(OUTPUT_SIZES[2]) // Default to square
  
  // Creative controls
  const [showCreativeControls, setShowCreativeControls] = useState(false)
  const [creativeControls, setCreativeControls] = useState({
    productDetails: '',
    salesAngle: '',
    targetAvatar: '',
    additionalInstructions: '',
  })

  const templateInputRef = useRef<HTMLInputElement>(null)
  const photoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

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
    try {
      const response = await fetch('/api/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          templateId: selectedTemplate?.id,
          uploadedTemplate,
          productPhotos: productPhotos.filter(p => p !== null),
          outputSize: selectedSize.id,
          ...creativeControls,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar')
      }

      toast.success('¡Sección generada!')
      // TODO: mostrar resultado
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
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
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
          <h1 className="text-2xl font-bold text-text-primary">{product?.name}</h1>
        </div>
      </div>

      {/* Main Generation Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Generar Sección de Landing</h2>
            <p className="text-sm text-text-secondary">
              Selecciona una plantilla de referencia y sube de 1 a 3 fotos de tu producto.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Template */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Plantilla
            </label>
            
            <div className="flex gap-2 mb-3">
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                onClick={() => setShowTemplateGallery(true)}
              >
                <LayoutTemplate className="w-4 h-4" />
                Seleccionar Plantilla
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => templateInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Subir desde PC
              </Button>
              <input
                ref={templateInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTemplateUpload}
              />
            </div>

            {/* Template Preview */}
            <div className="aspect-[4/3] bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
              {selectedTemplate || uploadedTemplate ? (
                <div className="relative w-full h-full">
                  <img
                    src={uploadedTemplate || selectedTemplate?.image_url}
                    alt="Template"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setSelectedTemplate(null)
                      setUploadedTemplate(null)
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-lg hover:bg-error/10 hover:text-error transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center p-6">
                  <LayoutTemplate className="w-10 h-10 text-accent/30 mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">Seleccionar Plantilla</p>
                  <p className="text-xs text-text-secondary/70">de la Galería Estrategas IA</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Photos */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Fotos del Producto
            </label>
            <p className="text-xs text-text-secondary mb-3">
              (agrega de 1 a 3 fotos de tu producto)
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="aspect-square relative">
                  {productPhotos[index] ? (
                    <div className="w-full h-full rounded-xl overflow-hidden border border-border">
                      <img
                        src={productPhotos[index]!}
                        alt={`Producto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-background/80 rounded-lg hover:bg-error/10 hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => photoInputRefs[index].current?.click()}
                      className="w-full h-full rounded-xl border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center"
                    >
                      <ImageIcon className="w-6 h-6 text-text-secondary/50 mb-1" />
                      <span className="text-xs text-text-secondary">Imagen {index + 1}</span>
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
      </Card>

      {/* Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Output Size */}
        <Card className="p-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Tamaño de Salida
          </label>
          <div className="relative">
            <select
              value={selectedSize.id}
              onChange={(e) => setSelectedSize(OUTPUT_SIZES.find(s => s.id === e.target.value) || OUTPUT_SIZES[2])}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            >
              {OUTPUT_SIZES.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name} ({size.ratio})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
          </div>
          <p className="text-xs text-text-secondary mt-2">{selectedSize.dimensions}</p>
        </Card>

        {/* Language */}
        <Card className="p-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Idioma de Salida
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
        </Card>
      </div>

      {/* Creative Controls */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-text-primary">
              Controles Creativos <span className="text-text-secondary font-normal">(Opcional)</span>
            </span>
          </div>
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

        {showCreativeControls && (
          <div className="mt-6 space-y-4">
            {/* Product Details */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <span className="text-text-secondary">📄</span>
                  Detalles del Producto
                </label>
                <span className="text-xs text-text-secondary">Máx. 500 caracteres</span>
              </div>
              <div className="relative">
                <textarea
                  placeholder="Describe las características, beneficios y detalles importantes del producto..."
                  value={creativeControls.productDetails}
                  onChange={(e) => setCreativeControls({ ...creativeControls, productDetails: e.target.value.slice(0, 500) })}
                  className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                  rows={3}
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
                  <span className="text-text-secondary">📈</span>
                  Ángulo de Venta
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
                  <span className="text-text-secondary">🎯</span>
                  Avatar de Cliente Ideal
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
                  <span className="text-text-secondary">💬</span>
                  Instrucciones Adicionales
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
      </Card>

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

      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTemplateGallery(false)}
          />
          <Card className="relative w-full max-w-4xl max-h-[80vh] overflow-hidden z-10">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Galería de Plantillas</h2>
              <button
                onClick={() => setShowTemplateGallery(false)}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <LayoutTemplate className="w-12 h-12 text-accent/30 mx-auto mb-3" />
                  <p className="text-text-secondary">No hay plantillas disponibles aún</p>
                  <p className="text-sm text-text-secondary/70 mt-1">Pronto agregaremos plantillas profesionales</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template)
                        setUploadedTemplate(null)
                        setShowTemplateGallery(false)
                      }}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-border hover:border-accent transition-colors"
                    >
                      <img
                        src={template.image_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-sm font-medium text-white">{template.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
