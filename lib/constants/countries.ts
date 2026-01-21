// Countries supported for banner generation
// ONLY THESE 10 COUNTRIES - DO NOT ADD MORE

export interface Country {
  code: string
  name: string
  currency: string
  currencySymbol: string
  flag: string
}

// SOLO ESTOS 10 PAÍSES - NO AGREGAR MÁS
export const COUNTRIES: Country[] = [
  { code: 'CO', name: 'Colombia', currency: 'COP', currencySymbol: '$', flag: '🇨🇴' },
  { code: 'MX', name: 'México', currency: 'MXN', currencySymbol: '$', flag: '🇲🇽' },
  { code: 'PA', name: 'Panamá', currency: 'USD', currencySymbol: '$', flag: '🇵🇦' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', currencySymbol: '$', flag: '🇪🇨' },
  { code: 'PE', name: 'Perú', currency: 'PEN', currencySymbol: 'S/', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', currency: 'CLP', currencySymbol: '$', flag: '🇨🇱' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', currencySymbol: '₲', flag: '🇵🇾' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', currencySymbol: '$', flag: '🇦🇷' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', currencySymbol: 'Q', flag: '🇬🇹' },
  { code: 'ES', name: 'España', currency: 'EUR', currencySymbol: '€', flag: '🇪🇸' },
]

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

export function getDefaultCountry(): Country {
  return COUNTRIES[0] // Colombia
}
