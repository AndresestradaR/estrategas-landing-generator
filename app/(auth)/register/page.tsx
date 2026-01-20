'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Registro deshabilitado - solo acceso por OTP para emails permitidos
export default function RegisterPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/login')
  }, [router])

  return null
}