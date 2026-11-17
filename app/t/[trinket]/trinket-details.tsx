import { SubmitForm } from './submit-form'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export async function TrinketDetails({ params }: { params: Promise<{ trinket: string }> }) {
    const { trinket } = await params
    
    if (!/^[a-z0-9]{8}$/.test(trinket)) {
        notFound()
    }

    const { data, error } = await supabase
        .from('trinkets')
        .select('id, name, active')
        .eq('id', trinket)
        .maybeSingle()

    if (error) {
        console.error(error)
        return <p>Something went wrong. Please try again.</p>
    }

    if (!data || !data.active) {
        notFound()
    }

    const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('trinket_id', trinket)
        .in('status', ['queued', 'added'])
    
    return (
        <>
            <h1>{data.name ?? 'Unnamed Trinket'}</h1>
            {count !== null && (
                <p>{count} {count === 1 ? 'song' : 'songs'} added from this auxstar</p>
            )}
            <SubmitForm trinketID={trinket} />
        </>
    )
}