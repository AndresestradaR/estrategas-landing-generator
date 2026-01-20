import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    // Get sectionId from params
    const { sectionId } = await context.params
    console.log('[DELETE] sectionId:', sectionId)

    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[DELETE] Auth error:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.log('[DELETE] userId:', user.id)

    // Use service client for delete
    const serviceClient = await createServiceClient()

    // Delete directly with user_id check
    const { error: deleteError } = await serviceClient
      .from('landing_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[DELETE] Supabase error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log('[DELETE] Success for:', sectionId)
    return NextResponse.json({ success: true, deleted: sectionId })
  } catch (error: any) {
    console.error('[DELETE] Catch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await context.params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
