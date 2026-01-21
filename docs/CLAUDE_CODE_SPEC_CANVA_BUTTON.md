# 🎨 Agregar botón "Editar en Canva"

## Objetivo
Agregar un botón en el modal de sección generada que permita abrir la imagen en Canva para editarla.

## Implementación

### 1. En `app/(dashboard)/dashboard/landing/[id]/page.tsx`

#### A) Agregar estado para el loading de Canva:
```typescript
const [isOpeningCanva, setIsOpeningCanva] = useState(false)
```

#### B) Agregar función `handleOpenInCanva`:
```typescript
const handleOpenInCanva = async (section: GeneratedSection) => {
  setIsOpeningCanva(true)
  toast.loading('Preparando imagen para Canva...', { id: 'canva' })
  
  try {
    // Subir imagen para obtener URL pública (reusar lógica de WhatsApp)
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId: section.id,
        imageBase64: section.generated_image_url,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al subir imagen')
    }

    // Abrir Canva con la imagen
    // Canva permite importar imágenes desde URL pública
    const canvaUrl = `https://www.canva.com/design/new?imageUrl=${encodeURIComponent(data.publicUrl)}`
    window.open(canvaUrl, '_blank')
    
    toast.success('¡Abriendo Canva!', { id: 'canva' })
  } catch (error: any) {
    console.error('Canva error:', error)
    // Si falla la subida, abrir Canva vacío y mostrar instrucciones
    toast.error('No se pudo cargar la imagen automáticamente. Descárgala y súbela manualmente a Canva.', { id: 'canva' })
    window.open('https://www.canva.com/design/new', '_blank')
  } finally {
    setIsOpeningCanva(false)
  }
}
```

#### C) Agregar el botón en el modal (después de "Editar Sección"):
```tsx
{/* Edit in Canva */}
<button
  onClick={() => handleOpenInCanva(selectedSection)}
  disabled={isOpeningCanva}
  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-all disabled:opacity-50"
>
  {isOpeningCanva ? (
    <Loader2 className="w-5 h-5 text-white animate-spin" />
  ) : (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  )}
  <span className="text-white font-medium">Editar en Canva</span>
</button>
```

### 2. Orden de botones en el modal:
1. Descargar en 2K
2. Descargar optimizada
3. Editar Sección (con IA)
4. **Editar en Canva** ← NUEVO
5. Compartir por WhatsApp

### 3. Alternativa más simple (si Canva no acepta URL):
Si Canva no importa la imagen automáticamente, cambiar a:
```typescript
const handleOpenInCanva = async (section: GeneratedSection) => {
  // Primero descargar la imagen
  const link = document.createElement('a')
  link.href = section.generated_image_url
  link.download = `${product?.name}-canva-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Luego abrir Canva
  toast.success('Imagen descargada. Súbela a Canva para editarla.')
  window.open('https://www.canva.com/design/new', '_blank')
}
```

## Resultado esperado
- Botón morado/rosa con gradiente "Editar en Canva"
- Al hacer clic: sube imagen → abre Canva con la imagen
- Si falla: descarga imagen y abre Canva vacío

## Notas
- Canva puede o no aceptar el parámetro `imageUrl` dependiendo de la configuración
- Si no funciona automáticamente, usar la alternativa de descargar + abrir
- El botón debe verse atractivo (gradiente morado/rosa como branding de Canva)
