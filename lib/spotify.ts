import 'server-only'
import { supabase } from '@/lib/supabase'

type TokenRow = {
    refresh_token: string
    access_token: string | null
    expires_at: string | null
    version: number
}

async function readRow(): Promise<TokenRow | null> {
    const { data, error } = await supabase
        .from('provider_tokens')
        .select('refresh_token, access_token, expires_at, version')
        .eq('provider', 'spotify')
        .maybeSingle()

    if (error) {
        console.error('Reading tokens failed:', error.code)
        return null
    }
    return data
}

function stillValid(row: TokenRow): boolean {
    if (!row.access_token || !row.expires_at) return false
    return new Date(row.expires_at).getTime() - Date.now() > 60000
}

async function callSpotify(refreshToken: string) {
    const clientID = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    if (!clientID || !clientSecret) {
        console.error('Spotify client ID or secret not set')
        return null
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientID + ':' + clientSecret).toString('base64')
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }),
        signal: AbortSignal.timeout(8000)
    })
    
    if (!response.ok) {
        console.error('Spotify token refresh failed with status ', response.status)
        return null
    }
    const body = await response.json()
    if (typeof body.access_token !== 'string' || typeof body.expires_in !== 'number') {
        console.error('Unexpected token refresh response shape')
        return null
    }

    return {
        accessToken: body.access_token as string,
        refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : refreshToken,
        expiresAt: new Date(Date.now() + (body.expires_in as number) * 1000).toISOString()
    }
}

export async function getSpotifyAccessToken(): Promise<string | null> {
    const row = await readRow()
    if (!row) return null
    if (stillValid(row)) return row.access_token

    const fresh = await callSpotify(row.refresh_token)
    if (!fresh) return null

    const { data: won, error } = await supabase
        .from('provider_tokens')
        .update({ 
            access_token: fresh.accessToken,
            refresh_token: fresh.refreshToken,
            expires_at: fresh.expiresAt,
            version: row.version + 1,
            updated_at: new Date().toISOString()
        })
        .eq('provider', 'spotify')
        .eq('version', row.version)
        .select('version')

    if (error) {
        console.error('Saving refreshed tokens failed:', error.code)
        return null
    }
    if (won.length > 0) return fresh.accessToken

    const latest = await readRow()
    return latest && stillValid(latest) ? latest.access_token : null
}

export type AddResult = 
    | { status: 'added' }
    | { status: 'rate_limited'; retryAfter: number }
    | { status: 'auth_failed' }
    | { status: 'not_found' }
    | { status: 'failed' }
    |  { status: 'rejected' }

export async function addTrackToPlaylist(playlistID: string, trackID: string) : Promise<AddResult> {
    const token = await getSpotifyAccessToken()
    if (!token) return { status: 'auth_failed' }

    let response: Response
    try {
        response = await fetch(
            'https://api.spotify.com/v1/playlists/' + encodeURIComponent(playlistID) + '/items',
            {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ uris: ['spotify:track:' + trackID] }),
                signal: AbortSignal.timeout(8000)
            }
        )
    } catch {
        return { status: 'failed' }
    }

    if (response.ok) return { status: 'added' }

    if (response.status === 429) {
        const wait = Number(response.headers.get('Retry-After'))
        return { status: 'rate_limited', retryAfter: Number.isFinite(wait) ? wait : 30 }
    }

    if (response.status === 401 || response.status === 403) {
        console.error('Spotify rejected the login with status', response.status)
        console.error('Spotify said:', await response.text())
        return { status: 'auth_failed' }
    }

    if (response.status === 404) { return { status: 'not_found' } }

    if (response.status >= 400 && response.status < 500) {
        console.error('Spotify add track failed with status', response.status)
        return { status: 'rejected' }
    }

    console.error('Spotify add track failed with status', response.status)
    return { status: 'failed' }
}

export type TrackLookup = 
    | { status: 'found'; name: string; artist: string }
    | { status: 'not_found' }
    | { status: 'failed' }

export async function getTrackInfo(trackID: string): Promise<TrackLookup> {
    const token = await getSpotifyAccessToken()
    if (!token) return { status: 'failed' }

    let response: Response
    try {
        response = await fetch(
            'https://api.spotify.com/v1/tracks/' + encodeURIComponent(trackID),
            {
                headers: { Authorization: 'Bearer ' + token },
                signal: AbortSignal.timeout(8000)
            }
        )
    } catch {
        return { status: 'failed' }
    }

    if (response.status === 400 || response.status === 404) return { status: 'not_found' }

    if (!response.ok) {
        console.error('Spotify track lookup failed with status', response.status)
        return { status: 'failed' }
    }

    const body = await response.json()
    if (typeof body.name !== 'string' || !Array.isArray(body.artists)) return { status: 'failed' }

    const artist = body.artists
        .map((a: { name: unknown }) => typeof a.name === 'string' ? a.name : '')
        .filter(Boolean)
        .join(', ')
        
    return { status: 'found', name: body.name, artist }
}