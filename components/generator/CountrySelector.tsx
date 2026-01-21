'use client'

import { Globe } from 'lucide-react'
import { COUNTRIES, Country } from '@/lib/constants/countries'

interface CountrySelectorProps {
  value: string // country code
  onChange: (country: Country) => void
  disabled?: boolean
}

export default function CountrySelector({ value, onChange, disabled }: CountrySelectorProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <Globe className="w-4 h-4 text-accent" />
        País destino del anuncio
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {COUNTRIES.map((country) => (
          <button
            key={country.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(country)}
            className={`
              flex items-center gap-2 p-3 rounded-xl border transition-all
              ${
                value === country.code
                  ? 'border-accent bg-accent/10 ring-2 ring-accent/50'
                  : 'border-border hover:border-accent/50 bg-background'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-xl">{country.flag}</span>
            <div className="text-left">
              <p className="text-sm font-medium text-text-primary">{country.name}</p>
              <p className="text-xs text-text-secondary">{country.currencySymbol}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function CountrySelectorCompact({
  value,
  onChange,
  disabled,
}: CountrySelectorProps) {
  const selectedCountry = COUNTRIES.find((c) => c.code === value)

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <Globe className="w-4 h-4 text-accent" />
        País
      </label>
      <select
        value={value}
        onChange={(e) => {
          const country = COUNTRIES.find((c) => c.code === e.target.value)
          if (country) onChange(country)
        }}
        disabled={disabled}
        className={`
          w-full px-4 py-3 bg-background border border-border rounded-xl
          text-text-primary appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.name} ({country.currencySymbol})
          </option>
        ))}
      </select>
    </div>
  )
}
