import sharp from 'sharp';

export interface BannerConfig {
  baseImage: Buffer; // La imagen de Gemini (foto sin texto)
  productName: string;
  headline: string;
  subheadline: string;
  benefits: { icon: string; label: string }[];
  price?: string;
  footer?: {
    badges: string[]; // ['Envío Gratis', 'Pago Contraentrega', 'Garantía']
  };
  aspectRatio: '9:16' | '1:1' | '4:5' | '16:9';
  colorScheme?: {
    primary: string;    // Color principal (ej: '#FF1493')
    secondary: string;  // Color secundario
    text: string;       // Color de texto (ej: '#FFFFFF')
    accent: string;     // Color de acento
  };
}

// Dimensiones según aspect ratio
const DIMENSIONS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '16:9': { width: 1920, height: 1080 },
};

// Crear SVG para texto con estilo
function createTextSVG(
  text: string,
  fontSize: number,
  color: string,
  width: number,
  height: number,
  options: {
    fontWeight?: string;
    textAnchor?: 'start' | 'middle' | 'end';
    x?: string;
    y?: string;
    shadow?: boolean;
  } = {}
): Buffer {
  const {
    fontWeight = 'bold',
    textAnchor = 'middle',
    x = '50%',
    y = '50%',
    shadow = true,
  } = options;

  const shadowFilter = shadow
    ? `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
         <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
       </filter>`
    : '';

  const filterAttr = shadow ? 'filter="url(#shadow)"' : '';

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowFilter}</defs>
    <text
      x="${x}"
      y="${y}"
      font-family="Arial Black, Helvetica, sans-serif"
      font-size="${fontSize}"
      font-weight="${fontWeight}"
      fill="${color}"
      text-anchor="${textAnchor}"
      dominant-baseline="middle"
      ${filterAttr}
    >${escapeXml(text)}</text>
  </svg>`;

  return Buffer.from(svg);
}

// Crear SVG para ícono circular con texto
function createBenefitIconSVG(
  icon: string,
  label: string,
  size: number,
  colors: { bg: string; icon: string; text: string }
): Buffer {
  const svg = `<svg width="${size}" height="${size + 40}" xmlns="http://www.w3.org/2000/svg">
    <!-- Círculo de fondo con gradiente -->
    <defs>
      <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${adjustColor(colors.bg, -30)};stop-opacity:1" />
      </linearGradient>
      <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Círculo -->
    <circle
      cx="${size / 2}"
      cy="${size / 2}"
      r="${size / 2 - 5}"
      fill="url(#iconGrad)"
      filter="url(#iconShadow)"
    />

    <!-- Ícono emoji o símbolo -->
    <text
      x="${size / 2}"
      y="${size / 2}"
      font-size="${size * 0.4}"
      text-anchor="middle"
      dominant-baseline="middle"
    >${icon}</text>

    <!-- Label debajo -->
    <text
      x="${size / 2}"
      y="${size + 25}"
      font-family="Arial, sans-serif"
      font-size="14"
      font-weight="bold"
      fill="${colors.text}"
      text-anchor="middle"
    >${escapeXml(label)}</text>
  </svg>`;

  return Buffer.from(svg);
}

// Crear badge de precio
function createPriceBadgeSVG(
  price: string,
  width: number,
  height: number,
  colors: { bg: string; text: string }
): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="priceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${adjustColor(colors.bg, -20)};stop-opacity:1" />
      </linearGradient>
      <filter id="priceShadow">
        <feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity="0.4"/>
      </filter>
    </defs>

    <!-- Badge shape -->
    <rect
      x="5" y="5"
      width="${width - 10}" height="${height - 10}"
      rx="15" ry="15"
      fill="url(#priceGrad)"
      filter="url(#priceShadow)"
    />

    <!-- Price text -->
    <text
      x="${width / 2}"
      y="${height / 2}"
      font-family="Arial Black, sans-serif"
      font-size="${height * 0.4}"
      font-weight="bold"
      fill="${colors.text}"
      text-anchor="middle"
      dominant-baseline="middle"
    >${escapeXml(price)}</text>
  </svg>`;

  return Buffer.from(svg);
}

// Crear footer con badges
function createFooterSVG(
  badges: string[],
  width: number,
  height: number,
  colors: { bg: string; text: string }
): Buffer {
  const badgeWidth = width / badges.length;

  const badgesSvg = badges.map((badge, i) => {
    const x = badgeWidth * i + badgeWidth / 2;
    return `<text
      x="${x}"
      y="${height / 2}"
      font-family="Arial, sans-serif"
      font-size="16"
      font-weight="bold"
      fill="${colors.text}"
      text-anchor="middle"
      dominant-baseline="middle"
    >✓ ${escapeXml(badge)}</text>`;
  }).join('');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Footer background -->
    <rect x="0" y="0" width="${width}" height="${height}" fill="${colors.bg}" opacity="0.9"/>
    ${badgesSvg}
  </svg>`;

  return Buffer.from(svg);
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Adjust color brightness
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Compone el banner final combinando la foto de Gemini con capas de texto/íconos
 */
export async function composeBanner(config: BannerConfig): Promise<Buffer> {
  const dimensions = DIMENSIONS[config.aspectRatio] || DIMENSIONS['9:16'];
  const { width, height } = dimensions;

  // Colores por defecto
  const colors = config.colorScheme || {
    primary: '#FF1493',   // Rosa fuerte
    secondary: '#8B5CF6', // Púrpura
    text: '#FFFFFF',      // Blanco
    accent: '#FFD700',    // Dorado
  };

  // 1. Redimensionar imagen base de Gemini
  const baseResized = await sharp(config.baseImage)
    .resize(width, height, { fit: 'cover' })
    .toBuffer();

  // 2. Crear capas de composición
  const composites: sharp.OverlayOptions[] = [];

  // 3. Headline (arriba izquierda)
  if (config.headline) {
    const headlineSvg = createTextSVG(
      config.headline.toUpperCase(),
      width * 0.07, // Tamaño relativo
      colors.text,
      width * 0.6,
      height * 0.1,
      { textAnchor: 'start', x: '5%', shadow: true }
    );
    composites.push({
      input: headlineSvg,
      top: Math.round(height * 0.05),
      left: Math.round(width * 0.05),
    });
  }

  // 4. Subheadline (debajo del headline)
  if (config.subheadline) {
    const subheadlineSvg = createTextSVG(
      config.subheadline.toUpperCase(),
      width * 0.04,
      colors.text,
      width * 0.5,
      height * 0.06,
      { textAnchor: 'start', x: '5%', fontWeight: 'normal', shadow: true }
    );
    composites.push({
      input: subheadlineSvg,
      top: Math.round(height * 0.12),
      left: Math.round(width * 0.05),
    });
  }

  // 5. Benefit icons (columna izquierda)
  if (config.benefits && config.benefits.length > 0) {
    const iconSize = Math.round(width * 0.15);
    const startY = Math.round(height * 0.25);
    const spacing = Math.round(height * 0.12);

    for (let i = 0; i < Math.min(config.benefits.length, 4); i++) {
      const benefit = config.benefits[i];
      const iconSvg = createBenefitIconSVG(
        benefit.icon,
        benefit.label,
        iconSize,
        { bg: colors.primary, icon: colors.text, text: colors.text }
      );
      composites.push({
        input: iconSvg,
        top: startY + i * spacing,
        left: Math.round(width * 0.05),
      });
    }
  }

  // 6. Price badge (si existe)
  if (config.price) {
    const badgeWidth = Math.round(width * 0.25);
    const badgeHeight = Math.round(height * 0.06);
    const priceSvg = createPriceBadgeSVG(
      config.price,
      badgeWidth,
      badgeHeight,
      { bg: colors.accent, text: '#000000' }
    );
    composites.push({
      input: priceSvg,
      top: Math.round(height * 0.75),
      left: Math.round(width * 0.05),
    });
  }

  // 7. Footer (abajo)
  if (config.footer && config.footer.badges.length > 0) {
    const footerHeight = Math.round(height * 0.05);
    const footerSvg = createFooterSVG(
      config.footer.badges,
      width,
      footerHeight,
      { bg: 'rgba(0,0,0,0.7)', text: colors.text }
    );
    composites.push({
      input: footerSvg,
      top: height - footerHeight,
      left: 0,
    });
  }

  // 8. Componer todas las capas
  const finalImage = await sharp(baseResized)
    .composite(composites)
    .png({ quality: 90 })
    .toBuffer();

  return finalImage;
}

/**
 * Genera textos de marketing con Gemini para usar en el compositor
 */
export interface GeneratedCopy {
  headline: string;
  subheadline: string;
  benefits: { icon: string; label: string }[];
  price?: string;
}

export function getDefaultBenefits(productType: string): { icon: string; label: string }[] {
  const benefitSets: Record<string, { icon: string; label: string }[]> = {
    fitness: [
      { icon: '⚡', label: 'MÁS ENERGÍA' },
      { icon: '💪', label: 'MÁS FUERZA' },
      { icon: '🔥', label: 'QUEMA GRASA' },
      { icon: '🎯', label: 'RESULTADOS' },
    ],
    beauty: [
      { icon: '✨', label: 'MÁS BRILLO' },
      { icon: '💎', label: 'PIEL PERFECTA' },
      { icon: '🌸', label: 'NATURAL' },
      { icon: '💖', label: 'REJUVENECE' },
    ],
    health: [
      { icon: '🛡️', label: 'PROTECCIÓN' },
      { icon: '💚', label: 'NATURAL' },
      { icon: '⭐', label: 'PREMIUM' },
      { icon: '✅', label: 'EFECTIVO' },
    ],
    default: [
      { icon: '⭐', label: 'PREMIUM' },
      { icon: '✅', label: 'GARANTIZADO' },
      { icon: '🚀', label: 'RESULTADOS' },
      { icon: '💯', label: 'CALIDAD' },
    ],
  };

  return benefitSets[productType] || benefitSets.default;
}
