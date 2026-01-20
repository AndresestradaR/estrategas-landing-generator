import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      )
    }

    // Usar service role para verificar emails permitidos
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email, name, is_active')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Este correo no tiene acceso. Contacta al administrador.' },
        { status: 403 }
      )
    }

    if (!data.is_active) {
      return NextResponse.json(
        { error: 'Tu acceso ha sido desactivado. Contacta al administrador.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ 
      success: true,
      name: data.name 
    })
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Error al verificar email' },
      { status: 500 }
    )
  }
}