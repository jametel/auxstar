import { supabase } from '@/lib/supabase'
import { addTrackToPlaylist } from '@/lib/spotify'

export async function GET(request: Request) {
    if (process.env.SPOTIFY_SETUP !== 'on') {
        return new Response('Not found', { status: 404 })
    }

    const track = new URL(request.url).searchParams.get('track') ?? ''
    if (!/^[A-Za-z0-9]{22}$/.test(track)) {
        return Response.json({ error: 'bad track' }, { status: 400 })
    }

    const { data: playlist } = await supabase
        .from('playlists')
        .select('external_id')
        .eq('active', true)
        .maybeSingle()
    if (!playlist) {
        return Response.json({ error: 'no playlist' }, { status: 503 })
    }

    return Response.json(await addTrackToPlaylist(playlist.external_id, track))
}