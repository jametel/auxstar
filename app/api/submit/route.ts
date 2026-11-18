import { supabase } from '@/lib/supabase'
import { findOrCreateEvent } from '@/lib/events'
import { getTrackInfo } from '@/lib/spotify'
import { deliver } from '@/lib/deliver'

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
    
    const { link, trinketID, submissionKey, event: eventInput } = body
    if (typeof link !== 'string' || typeof trinketID !== 'string' || typeof submissionKey !== 'string') {
        return Response.json({ message: 'Missing link, trinket ID, or key' }, { status: 400 })
    }

    let eventName: string | null = null
    if (eventInput !== undefined && eventInput !== null) {
        if (typeof eventInput !== 'string') {
            return Response.json({ message: 'Invalid event name' }, { status: 400 })
        }
        const cleaned = eventInput.trim().replace(/\s+/g, ' ')
        if (cleaned.length > 0) {
            if (cleaned.length < 2 || cleaned.length > 60) {
                return Response.json({ message: 'Event name must be between 2 and 60 characters' }, { status: 400 })
            }
            eventName = cleaned
        }
    }
    
    if (link.length >= 200 || !/^[a-z0-9]{8}$/.test(trinketID) || !/^[A-Za-z0-9-]{8,64}$/.test(submissionKey)) {
        return Response.json({ message: 'Invalid request' }, { status: 400 })
    }

    let url
    try {
        url = new URL(link)
    } catch {
        return Response.json({ message: 'Invalid link' }, { status: 400 })
    }

    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') {
        return Response.json({ message: 'Not a Spotify link' }, { status: 400 })
    }

    const trackParts = url.pathname.split('/').filter(Boolean)
    if (trackParts[0]?.startsWith('intl-')) {
        trackParts.shift()
    }

    const trackID = trackParts[1] ?? ''
    if (trackParts[0] !== 'track' && trackParts[0] !== 's') {
        return Response.json({ message: 'Paste a link to a single track' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9]{22}$/.test(trackID)) {
        return Response.json({ message: 'Track ID is invalid' }, { status: 400 })
    }

    const { data: trinket, error: trinketError } = await supabase
        .from('trinkets')
        .select('active')
        .eq('id', trinketID)
        .maybeSingle()

    if (trinketError) {
        console.error(trinketError)
        return Response.json({ message: 'Something went wrong' }, { status: 503 })
    }
    
    if (!trinket || !trinket.active) {
        return Response.json({ message: 'Unknown trinket' }, { status: 404 })
    }
    
    const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('id, external_id')
        .eq('active', true)
        .maybeSingle()

    if (playlistError || !playlist) {
        console.error(playlistError)
        return Response.json({ message: 'Not accepting songs right now' }, { status: 503 })
    }

    const track = await getTrackInfo(trackID)
    if (track.status === 'not_found') {
        return Response.json({ message: 'Couldn\'t find track on Spotify' }, { status: 404 })
    }
    if (track.status === 'failed') {
        return Response.json({ message: 'Something went wrong. Please try again.' }, { status: 503 })
    }
    
    const eventID = eventName ? await findOrCreateEvent(eventName) : null

    const { data: row, error: insertError } = await supabase.from('submissions').insert({
        trinket_id: trinketID,
        playlist_id: playlist.id,
        provider: 'spotify',
        track_id: trackID,
        submission_key: submissionKey,
        event_id: eventID,
        title: track.name.slice(0, 200),
        artist: track.artist.slice(0, 200)
    }).select('id').single()

    if (insertError) {
        if (insertError.code === '23505') {
            if (insertError.message.includes('no_duplicate_songs')) {
                return Response.json({ message: 'The song is already in the playlist' }, { status: 409 })
            }
            return Response.json({ message: 'Song received' })
        }
        if (insertError.code === '23503') {
            return Response.json({ message: 'Unknown trinket' }, { status: 404 })
        }
        console.error(insertError)
        return Response.json({ message: 'Something went wrong' }, { status: 500 })
    }
    const outcome = await deliver(row.id, playlist.external_id, trackID)
    return Response.json({ message: outcome === 'added' ? 'Song added' : 'Song received. It will appear in the playlist shortly.' })
}