// IDs de países para DropKiller
export const COUNTRY_IDS = {
  colombia: '65c75a5f-0c4a-45fb-8c90-5b538805a15a',
  ecuador: '82811e8b-d17d-4ab9-847a-fa925785d566',
  mexico: '98993bd0-955a-4fa3-9612-c9d4389c44d0',
  chile: 'ad63080c-908d-4757-9548-30decb082b7e',
  spain: '3f18ae66-2f98-4af1-860e-53ed93e5cde0',
  peru: '6acfee32-9c25-4f95-b030-a005e488f3fb',
  panama: 'c1f01c6a-99c7-4253-b67f-4e2607efae9e',
  paraguay: 'f2594db9-caee-4221-b4a6-9b6267730a2d',
  argentina: 'de93b0dd-d9d3-468d-8c44-e9780799a29f',
  guatemala: '77c15189-b3b9-4f55-9226-e56c231f87ac',
} as const

export const COUNTRIES = [
  { id: 'colombia', name: 'Colombia', flag: '🇨🇴', uuid: COUNTRY_IDS.colombia },
  { id: 'mexico', name: 'México', flag: '🇲🇽', uuid: COUNTRY_IDS.mexico },
  { id: 'ecuador', name: 'Ecuador', flag: '🇪🇨', uuid: COUNTRY_IDS.ecuador },
  { id: 'peru', name: 'Perú', flag: '🇵🇪', uuid: COUNTRY_IDS.peru },
  { id: 'chile', name: 'Chile', flag: '🇨🇱', uuid: COUNTRY_IDS.chile },
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', uuid: COUNTRY_IDS.argentina },
  { id: 'guatemala', name: 'Guatemala', flag: '🇬🇹', uuid: COUNTRY_IDS.guatemala },
  { id: 'panama', name: 'Panamá', flag: '🇵🇦', uuid: COUNTRY_IDS.panama },
  { id: 'paraguay', name: 'Paraguay', flag: '🇵🇾', uuid: COUNTRY_IDS.paraguay },
  { id: 'spain', name: 'España', flag: '🇪🇸', uuid: COUNTRY_IDS.spain },
] as const

export const PLATFORMS = [
  { id: 'dropi', name: 'Dropi', countries: ['AR', 'CL', 'CO', 'EC', 'ES', 'GT', 'MX', 'PA', 'PY', 'PE'] },
  { id: 'easydrop', name: 'Easydrop', countries: ['CL', 'EC', 'MX', 'PE'] },
  { id: 'aliclick', name: 'Aliclick', countries: ['PE'] },
  { id: 'dropea', name: 'Dropea', countries: ['ES'] },
  { id: 'droplatam', name: 'Droplatam', countries: ['CL', 'CO', 'EC', 'ES', 'MX', 'PA', 'PY', 'PE'] },
  { id: 'seventy block', name: 'Seventy Block', countries: ['CO'] },
  { id: 'wimpy', name: 'Wimpy', countries: ['CO', 'MX'] },
  { id: 'mastershop', name: 'Mastershop', countries: ['CO'] },
] as const

export const DROPKILLER_BASE_URL = 'https://app.dropkiller.com'
