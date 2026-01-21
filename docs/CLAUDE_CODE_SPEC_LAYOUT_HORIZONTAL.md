# 🎨 ESPECIFICACIÓN: Layout Horizontal - Fotos + Plantilla

## Problema Actual
La sección de "Seleccionar Plantilla" y "Fotos del Producto" ocupa demasiado espacio vertical y requiere scroll innecesario. El layout actual es vertical y poco eficiente.

## Solución
Reorganizar en un **layout horizontal compacto** donde todo quede en un solo renglón, similar a Zepol.

---

## 📐 DISEÑO OBJETIVO (Estilo Zepol)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✨ Generar Sección de Landing                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Fotos del Producto (1-3 fotos)              Plantilla (de la galería)     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐         ┌─────────────────────────┐   │
│  │         │ │    +    │ │    +    │         │                         │   │
│  │  [IMG]  │ │         │ │         │         │   Seleccionar Plantilla │   │
│  │         │ │ Imagen 2│ │ Imagen 3│         │   de la Galería         │   │
│  └─────────┘ └─────────┘ └─────────┘         └─────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⬆️  Subir imagen de referencia (opcional)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Características:
1. **Todo en una fila** - Fotos a la izquierda, Plantilla a la derecha
2. **3 slots de producto horizontales** - Más compactos (no tan grandes)
3. **Plantilla al lado** - No debajo
4. **Botón de referencia abajo** - Ocupa todo el ancho
5. **Sin scroll** - Todo visible de una vez

---

## 🔧 IMPLEMENTACIÓN

### Archivo a modificar:
`app/(dashboard)/dashboard/landing/[id]/page.tsx`

### Estructura JSX sugerida:

```tsx
{/* Sección: Fotos + Plantilla (HORIZONTAL) */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="w-5 h-5" />
      Generar Sección de Landing
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    
    {/* Row 1: Fotos + Plantilla en horizontal */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Columna Izquierda: Fotos del Producto */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Fotos del Producto <span className="text-xs">(1-3 fotos)</span>
        </label>
        <div className="flex gap-3">
          {/* 3 slots horizontales, más pequeños */}
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="relative w-28 h-28 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
            >
              {productImages[index] ? (
                <>
                  <img 
                    src={productImages[index]} 
                    alt={`Producto ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button 
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-xs"
                  >
                    ×
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <Plus className="w-6 h-6 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Imagen {index + 1}
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, index)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Selector de Plantilla */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Plantilla <span className="text-xs">(de la galería)</span>
        </label>
        <button
          onClick={() => setShowTemplateGallery(true)}
          className="w-full h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
        >
          {selectedTemplate ? (
            <img 
              src={selectedTemplate.thumbnail} 
              alt="Plantilla"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <>
              <LayoutGrid className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Seleccionar Plantilla</span>
              <span className="text-xs text-muted-foreground">de la Galería</span>
            </>
          )}
        </button>
      </div>
    </div>

    {/* Row 2: Botón subir imagen de referencia (ancho completo) */}
    <button
      onClick={() => setShowReferenceUpload(true)}
      className="w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Upload className="w-5 h-5" />
      Subir imagen de referencia (opcional)
    </button>

  </CardContent>
</Card>
```

---

## 📏 TAMAÑOS Y ESPACIADO

| Elemento | Tamaño actual | Tamaño nuevo |
|----------|---------------|--------------|
| Slot de imagen producto | Grande (~200px) | Compacto (112px / w-28) |
| Selector de plantilla | Muy grande | Igual altura que slots (112px) |
| Gap entre elementos | Variable | 12px (gap-3) |
| Layout | Vertical | Horizontal (grid cols-2) |

---

## 📱 RESPONSIVE

- **Desktop (lg+):** 2 columnas - Fotos | Plantilla
- **Tablet/Mobile:** 1 columna - Fotos arriba, Plantilla abajo

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

---

## ✅ CHECKLIST

- [ ] Cambiar layout a horizontal (grid cols-2)
- [ ] Reducir tamaño de slots de imagen (w-28 h-28)
- [ ] Poner las 3 fotos en fila horizontal (flex gap-3)
- [ ] Mover selector de plantilla al lado derecho
- [ ] Agregar botón "Subir imagen de referencia" abajo (ancho completo)
- [ ] Hacer responsive (1 col en mobile, 2 cols en desktop)
- [ ] Verificar que no haga scroll innecesario

---

## 🎨 RESULTADO ESPERADO

Antes:
```
┌──────────────────┐
│   [Plantilla]    │  ← Grande, ocupa mucho
│                  │
└──────────────────┘
┌────┐ ┌────┐
│Img1│ │Img2│         ← Vertical, hay que scrollear
└────┘ └────┘
```

Después:
```
┌────┐┌────┐┌────┐  ┌─────────────┐
│Img1││Img2││Img3│  │  Plantilla  │  ← Todo horizontal, compacto
└────┘└────┘└────┘  └─────────────┘
┌─────────────────────────────────┐
│  Subir imagen de referencia     │
└─────────────────────────────────┘
```

---

**Archivo:** `app/(dashboard)/dashboard/landing/[id]/page.tsx`
**Prioridad:** Alta (mejora UX significativa)
