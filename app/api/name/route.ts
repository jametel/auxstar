import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
    let body
    
    try {
        body = await request.json()
    } catch {
        return Response.json({ message: 'Invalid request' }, { status: 400 })
    }

    if (typeof body !== 'object' || body === null) {
        return Response.json({ message: 'Invalid request' }, { status: 400 })
    }
    
    const { trinketID, name } = body
    if (typeof trinketID !== 'string' || typeof name !== 'string') {
        return Response.json({ message: 'Missing trinket ID or name' }, { status: 400 })
    }

    if (!/^[a-z0-9]{8}$/.test(trinketID) || name.length > 100) {
        return Response.json({ message: 'Invalid request' }, { status: 400 })
    }

    const cleanName = name.trim().replace(/\s+/g, ' ')
    if (cleanName.length < 1 || cleanName.length > 40) {
        return Response.json({ message: 'Name must be between 1 and 40 characters' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
        .from('trinkets')
        .update({ name: cleanName, named_at: new Date().toISOString() })
        .eq('id', trinketID)
        .eq('active', true)
        .is('name', null)
        .select('id')

    if (updateError) {
        console.error(updateError)
        return Response.json({ message: 'Something went wrong' }, { status: 500 })
    }

    if (updated.length > 0) {
        return Response.json({ message: 'Named' })
    }

    const { data: existing } = await supabase
        .from('trinkets')
        .select('name, active')
        .eq('id', trinketID)
        .maybeSingle()
        
    if (!existing || !existing.active) {
        return Response.json({ message: 'Trinket not found' }, { status: 404 })
    }

    if (existing.name === cleanName) {
        return Response.json({ message: 'Already named' })
    }

    return Response.json({ message: 'Trinket already named' }, { status: 409 })
}