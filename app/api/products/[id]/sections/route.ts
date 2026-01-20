import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: productId } = params

    // Get sections for this product
    const { data: sections, error } = await supabase
      .from('landing_sections')
      .select(`
        *,
        template:templates(id, name, image_url, category, dimensions)
      `)
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sections:', error)
      return NextResponse.json({ error: 'Error al cargar secciones' }, { status: 500 })
    }

    return NextResponse.json({ sections: sections || [] })
  } catch (error: any) {
    console.error('Sections API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
