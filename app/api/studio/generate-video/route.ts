import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Video generation is not yet implemented
    // This is a placeholder for future implementation
    return NextResponse.json(
      {
        error: 'La generacion de video esta en desarrollo. Proximamente estara disponible.',
        status: 'coming_soon'
      },
      { status: 503 }
    )

  } catch (error) {
    console.error('Studio generate-video error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
