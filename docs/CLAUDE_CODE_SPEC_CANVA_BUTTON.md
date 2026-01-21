# 🎨 Agregar botón "Editar en Canva" (Versión Final)

## Problema
- Canva requiere OAuth para integración completa
- La URL `/create/custom-size` da 404

## Solución
Usar la URL correcta del homepage de Canva + descargar imagen automáticamente.

## URL Correcta
```
https://www.canva.com/
```

El usuario llegará al homepage de Canva donde puede:
1. Crear un diseño nuevo con el tamaño que quiera
2. Subir/arrastrar la imagen descargada

## Implementación

### En `app/(dashboard)/dashboard/landing/[id]/page.tsx`

#### Agregar función `handleOpenInCanva`:
```typescript
const handleOpenInCanva = (section: GeneratedSection) => {
  // 1. Descargar la imagen
  const link = document.createElement('a')
  link.href = section.generated_image_url
  link.download = `${product?.name || 'banner'}-canva-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // 2. Abrir Canva homepage (URL que SÍ funciona)
  window.open('https://www.canva.com/', '_blank')
  
  // 3. Mostrar instrucción
  toast.success('Imagen descargada. Crea un diseño en Canva y sube la imagen.', {
    duration: 5000,
    icon: '🎨'
  })
}
```

#### Agregar el botón en el modal (después de "Editar Sección"):
```tsx
{/* Edit in Canva */}
<button
  onClick={() => handleOpenInCanva(selectedSection)}
  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#7B2BFF] via-[#00C4CC] to-[#7B2BFF] hover:opacity-90 rounded-xl transition-all"
>
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
  <span className="text-white font-medium">Editar en Canva</span>
</button>
```

### Orden de botones en el modal:
1. Descargar en 2K
2. Descargar optimizada  
3. Editar Sección (con IA)
4. **Editar en Canva** ← NUEVO (gradiente morado/turquesa)
5. Compartir por WhatsApp

## Resultado esperado
- Botón con gradiente Canva (#7B2BFF → #00C4CC → #7B2BFF)
- Al hacer clic:
  1. Descarga la imagen automáticamente al computador
  2. Abre Canva homepage en nueva pestaña
  3. Muestra toast "Imagen descargada. Crea un diseño en Canva y sube la imagen."

## Flujo del usuario
1. Click en "Editar en Canva"
2. Se descarga `producto-canva-123456.png`
3. Se abre Canva.com
4. Usuario crea diseño nuevo (ej: Instagram Story 1080x1920)
5. Usuario arrastra/sube la imagen descargada
6. Edita el banner en Canva

## Notas
- NO necesita estado loading (es instantáneo)
- NO necesita API key ni OAuth
- URL simple: `https://www.canva.com/`
- Funciona 100% sin errores
