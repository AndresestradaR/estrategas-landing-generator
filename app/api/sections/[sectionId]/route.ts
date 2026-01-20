import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { sectionId } = params

    // Delete the section (only if it belongs to the user)
    const { error } = await supabase
      .from('landing_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting section:', error)
      return NextResponse.json({ error: 'Error al eliminar sección' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete section API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { sectionId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { sectionId } = params

    const { data: section, error } = await supabase
      .from('landing_sections')
      .select(`
        *,
        template:templates(id, name, image_url, category, dimensions)
      `)
      .eq('id', sectionId)
      .eq('user_id', user.id)
      .single()

    if (error || !section) {
      return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ section })
  } catch (error: any) {
    console.error('Get section API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
