import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    if (process.env.SPOTIFY_SETUP !== 'on') {
        return new Response('Not found', { status: 404 })
    }

    const params = request.nextUrl.searchParams
    const code = params.get('code')
    const state = params.get('state')
    const storedState = request.cookies.get('spotify_state')?.value

    if (!state || !storedState || state !== storedState) {
        return new Response('Invalid state', { status: 400 })
    }

    if (params.get('error') || !code) {
        return new Response('Spotify login was not completed', { status: 400 })
    }

    const clientID = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    if (!clientID || !clientSecret || !redirectUri) {
        return new Response('Server misconfigured', { status: 500 })
    }

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientID + ':' + clientSecret).toString('base64')
        },
        body: new URLSearchParams({
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    })

    if (!tokenResponse.ok) {
        console.error('Token exchange failed with status ', tokenResponse.status)
        return new Response('Token exchange failed', { status: 502 })
    }

    const tokens = await tokenResponse.json()
    if (
        typeof tokens.access_token !== 'string' ||
        typeof tokens.refresh_token !== 'string' ||
        typeof tokens.expires_in !== 'number'
    ) {
        console.error('Unexpected token response shape')
        return new Response('Unexpected response from Spotify', { status: 502 })
    }

    const { data: existing } = await supabase
        .from('provider_tokens')
        .select('version')
        .eq('provider', 'spotify')
        .maybeSingle()

    const { error: saveError } = await supabase.from('provider_tokens').upsert({
        provider: 'spotify',
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        version: (existing?.version ?? 0) + 1,
        updated_at: new Date().toISOString()
    })
    
    if (saveError) {
        console.error('Saving tokens failed:', saveError)
        return new Response('Could not save tokens', { status: 500 })
    }

    const response = new NextResponse('Spotify connected')
    response.cookies.set('spotify_state', '', { path: '/api/spotify', maxAge: 0 })
    return response
}