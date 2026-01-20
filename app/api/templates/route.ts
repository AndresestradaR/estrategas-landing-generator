import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List all templates
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Templates API error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
