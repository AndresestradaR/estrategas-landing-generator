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
│  Fotos del Producto (1-3 fotos)         Plantilla (de la galería)          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    ┌─────────────────────────┐        │
│  │         │ │    +    │ │    +    │    │                         │        │
│  │  [IMG]  │ │         │ │         │    │   Seleccionar Plantilla │        │
│  │         │ │ Imagen 2│ │ Imagen 3│    │   de la Galería         │        │
│  └─────────┘ └─────────┘ └─────────┘    └─────────────────────────┘        │
│                                         ┌─────────────────────────┐        │
│                                         │ ⬆️ Subir img referencia │        │
│                                         └─────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Características:
1. **Todo en una fila** - Fotos a la izquierda, Plantilla a la derecha
2. **3 slots de producto horizontales** - Más compactos
3. **Plantilla al lado derecho** - No debajo
4. **Botón de referencia SOLO debajo de plantilla** - Alineado con la columna derecha
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
  <CardContent>
    
    {/* Grid principal: 2 columnas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Columna Izquierda: Fotos del Producto */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Fotos del Producto <span className="text-xs">(agrega de 1 a 3 fotos de tu producto)</span>
        </label>
        <div className="flex gap-3">
          {/* 3 slots horizontales */}
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="relative w-28 h-36 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-card"
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
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </>
              ) : (
                <div className="text-center p-2">
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

      {/* Columna Derecha: Plantilla + Botón Referencia */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          Plantilla <span className="text-xs">(selecciona de la galería)</span>
        </label>
        
        {/* Selector de Plantilla */}
        <button
          onClick={() => setShowTemplateGallery(true)}
          className="w-full h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-card"
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

        {/* Botón Subir Referencia - SOLO en esta columna */}
        <button
          onClick={() => setShowReferenceUpload(true)}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all"
        >
          <Upload className="w-5 h-5" />
          Subir imagen de referencia
        </button>
      </div>
      
    </div>

  </CardContent>
</Card>
```

---

## 📏 TAMAÑOS Y ESPACIADO

| Elemento | Tamaño |
|----------|--------|
| Slot de imagen producto | w-28 h-36 (112px x 144px) |
| Selector de plantilla | w-full h-36 (100% x 144px) |
| Botón referencia | w-full (100% de la columna derecha) |
| Gap entre slots | gap-3 (12px) |
| Gap entre columnas | gap-6 (24px) |

---

## 📱 RESPONSIVE

- **Desktop (lg+):** 2 columnas - Fotos | Plantilla + Botón
- **Tablet/Mobile:** 1 columna apilada

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

---

## 🎨 ESTILO DEL BOTÓN REFERENCIA

El botón debe tener el estilo degradado morado-rosa como en Zepol:

```tsx
className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all"
```

---

## ✅ CHECKLIST

- [ ] Cambiar layout a horizontal (grid cols-2)
- [ ] Poner las 3 fotos en fila horizontal (flex gap-3)
- [ ] Selector de plantilla a la derecha (misma altura que fotos)
- [ ] Botón "Subir imagen de referencia" SOLO debajo de plantilla
- [ ] Estilo degradado morado-rosa para el botón
- [ ] Hacer responsive (1 col en mobile, 2 cols en desktop)
- [ ] Verificar que no haga scroll innecesario

---

## 🎨 RESULTADO ESPERADO

```
┌────┐┌────┐┌────┐    ┌─────────────────┐
│Img1││Img2││Img3│    │    Plantilla    │
│    ││  + ││  + │    │                 │
└────┘└────┘└────┘    └─────────────────┘
                      ┌─────────────────┐
                      │ Subir referencia│  ← Solo aquí, no todo el ancho
                      └─────────────────┘
```

---

**Archivo:** `app/(dashboard)/dashboard/landing/[id]/page.tsx`
**Prioridad:** Alta (mejora UX significativa)
