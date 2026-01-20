import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await context.params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Use service client to bypass RLS issues
    const serviceClient = await createServiceClient()

    // First try simple query without join
    const { data: sections, error } = await serviceClient
      .from('landing_sections')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sections:', error)
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ sections: [], error: 'Tabla no encontrada' })
      }
      return NextResponse.json({ 
        sections: [], 
        error: `Error: ${error.message}`,
        code: error.code 
      })
    }

    // If we have sections, try to get template info separately
    const sectionsWithTemplates = await Promise.all(
      (sections || []).map(async (section) => {
        if (section.template_id) {
          try {
            const { data: template } = await serviceClient
              .from('templates')
              .select('id, name, image_url, category, dimensions')
              .eq('id', section.template_id)
              .single()
            return { ...section, template }
          } catch (e) {
            return { ...section, template: null }
          }
        }
        return { ...section, template: null }
      })
    )

    return NextResponse.json(
      { sections: sectionsWithTemplates },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    console.error('Sections API error:', error)
    return NextResponse.json({ 
      sections: [],
      error: error.message 
    })
  }
}
