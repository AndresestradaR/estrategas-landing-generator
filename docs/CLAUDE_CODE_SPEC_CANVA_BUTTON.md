# 🎨 Agregar botón "Editar en Canva" (Versión Simple)

## Problema
La API de Canva requiere OAuth y registro como desarrollador. No se puede abrir Canva directamente con una imagen externa.

## Solución Simple
1. Descargar la imagen automáticamente
2. Abrir Canva en una nueva pestaña
3. Mostrar instrucción al usuario de arrastrar/subir la imagen

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
  
  // 2. Abrir Canva
  window.open('https://www.canva.com/create/custom-size', '_blank')
  
  // 3. Mostrar instrucción
  toast.success('Imagen descargada. Arrastra o sube la imagen en Canva para editarla.', {
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
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12h8M12 8v8"/>
  </svg>
  <span className="text-white font-medium">Editar en Canva</span>
</button>
```

### Orden de botones en el modal:
1. Descargar en 2K
2. Descargar optimizada
3. Editar Sección (con IA)
4. **Editar en Canva** ← NUEVO (gradiente morado/turquesa de Canva)
5. Compartir por WhatsApp

## Resultado esperado
- Botón con gradiente Canva (#7B2BFF → #00C4CC)
- Al hacer clic:
  1. Descarga la imagen automáticamente
  2. Abre Canva en nueva pestaña
  3. Muestra toast "Imagen descargada. Arrastra o sube la imagen en Canva para editarla."

## Notas
- NO necesita estado loading porque es instantáneo
- NO necesita API key ni OAuth
- Flujo simple y efectivo que cualquier usuario puede seguir
- El usuario solo tiene que arrastrar la imagen descargada al canvas de Canva
