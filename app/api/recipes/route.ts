import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const started = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuración de Supabase incompleta' }, { status: 500 })
    }

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

    const { name, ingredients = '', preparation = '', image_url = null, video_url = null, source_url = null, calories = null, is_ai_generated = false, user_id, categories = [] } = body || {}

    if (!user_id) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 })
    if (!name || !name.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const recipeInsert = {
      name: name.trim(),
      ingredients: ingredients || '',
      preparation: preparation || '',
      image_url,
      video_url,
      source_url,
      calories: calories ? Number.parseInt(calories) : null,
      is_ai_generated: !!is_ai_generated,
      user_id,
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    let insertRes
    try {
      insertRes = await Promise.race([
        supabase.from('recipes').insert(recipeInsert).select('id').single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout insert receta (server)')), 15000)),
      ])
    } catch (e: any) {
      if (e?.message?.includes('Timeout')) return NextResponse.json({ error: e.message }, { status: 504 })
      return NextResponse.json({ error: 'Error interno insertando receta' }, { status: 500 })
    }

    const { data, error } = insertRes as any
    if (error) return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    if (!data?.id) return NextResponse.json({ error: 'Receta creada sin ID' }, { status: 500 })
    const recipeId = data.id

    let categoriesInserted = 0
    if (Array.isArray(categories) && categories.length > 0) {
      const rels = categories.map((cid: number) => ({ recipe_id: recipeId, category_id: cid }))
      const { error: catErr } = await supabase.from('recipe_categories').insert(rels)
      if (!catErr) categoriesInserted = rels.length
    }

    return NextResponse.json({ success: true, recipe_id: recipeId, categories: categoriesInserted, ms: Date.now() - started })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true }) }
