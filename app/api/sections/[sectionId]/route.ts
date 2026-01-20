import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params in Next.js 14+
    const { sectionId } = await params

    // Use service client for delete to bypass RLS issues
    const serviceClient = await createServiceClient()
    
    // First verify the section belongs to the user
    const { data: section } = await serviceClient
      .from('landing_sections')
      .select('id, user_id')
      .eq('id', sectionId)
      .single()

    if (!section || section.user_id !== user.id) {
      return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
    }

    // Delete the section
    const { error } = await serviceClient
      .from('landing_sections')
      .delete()
      .eq('id', sectionId)

    if (error) {
      console.error('Error deleting section:', error)
      return NextResponse.json({ error: 'Error al eliminar sección' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: sectionId })
  } catch (error: any) {
    console.error('Delete section API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params in Next.js 14+
    const { sectionId } = await params

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
