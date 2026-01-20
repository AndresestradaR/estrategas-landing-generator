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

    const { sectionId } = await params
    console.log('[DELETE] Starting delete for sectionId:', sectionId, 'userId:', user.id)

    // Use service client for delete to bypass RLS issues
    const serviceClient = await createServiceClient()

    // First verify the section exists and belongs to the user
    const { data: section, error: selectError } = await serviceClient
      .from('landing_sections')
      .select('id, user_id')
      .eq('id', sectionId)
      .single()

    console.log('[DELETE] Section found:', section, 'selectError:', selectError)

    if (selectError || !section) {
      console.log('[DELETE] Section not found in DB')
      return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
    }

    if (section.user_id !== user.id) {
      console.log('[DELETE] User mismatch - section.user_id:', section.user_id, 'user.id:', user.id)
      return NextResponse.json({ error: 'No autorizado para eliminar esta sección' }, { status: 403 })
    }

    // Delete the section
    const { data: deleteData, error: deleteError, count } = await serviceClient
      .from('landing_sections')
      .delete()
      .eq('id', sectionId)
      .select()

    console.log('[DELETE] Delete result - data:', deleteData, 'error:', deleteError, 'count:', count)

    if (deleteError) {
      console.error('[DELETE] Error deleting section:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar sección' }, { status: 500 })
    }

    // Verify deletion
    const { data: verifySection } = await serviceClient
      .from('landing_sections')
      .select('id')
      .eq('id', sectionId)
      .single()

    if (verifySection) {
      console.error('[DELETE] Section still exists after delete!')
      return NextResponse.json({ error: 'Error: la sección no se eliminó' }, { status: 500 })
    }

    console.log('[DELETE] Successfully deleted sectionId:', sectionId)
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
