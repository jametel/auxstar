import 'server-only'
import { supabase } from '@/lib/supabase'
import { addTrackToPlaylist } from '@/lib/spotify'

export async function deliver(submissionID: string, playlistExternalID: string, trackID: string): Promise<'added' | 'pending'> {
    const { data: claimed, error: claimError } = await supabase
        .from('submissions')
        .update({ status: 'adding', claimed_at: new Date().toISOString() })
        .eq('id', submissionID)
        .eq('status', 'queued')
        .select('id')
    
    if (claimError || !claimed || claimed.length === 0) return 'pending'

    const result = await addTrackToPlaylist(playlistExternalID, trackID)

    if (result.status === 'added') {
        const { error } = await supabase
            .from('submissions')
            .update({ status: 'added', claimed_at: null })
            .eq('id', submissionID)
            .eq('status', 'adding')
        if (error) {
            console.error('Failed to mark submission as added:', error.code)
        }
        return 'added'
    }

    if (result.status === 'failed') {
        return 'pending'
    }

    console.error('Delivery blocked:', result.status)
    await supabase
        .from('submissions')
        .update({ status: 'queued', claimed_at: null })
        .eq('id', submissionID)
        .eq('status', 'adding')
    return 'pending'
}