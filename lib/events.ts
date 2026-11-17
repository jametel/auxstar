import 'server-only'
import { supabase } from '@/lib/supabase'

export async function findOrCreateEvent(name: string): Promise<string | null> {
    const key = name.toLowerCase()

    const found = await supabase.from('events').select('id, hidden').eq('name_key', key).maybeSingle()
    if (found.error) {
        console.error(found.error)
        return null
    }

    if (found.data) {
        return found.data.hidden ? null : found.data.id
    }

    const created = await supabase.from('events').insert({ name }).select('id').single()
    if (!created.error) {
        return created.data.id
    }

    if (created.error.code === '23505') {
        const again = await supabase.from('events').select('id, hidden').eq('name_key', key).maybeSingle()
        if (again.data) {
            return again.data.hidden ? null : again.data.id
        }
    }

    console.error(created.error)
    return null
}