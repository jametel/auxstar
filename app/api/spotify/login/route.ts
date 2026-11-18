import { NextResponse } from "next/server";

export async function GET() {
    if (process.env.SPOTIFY_SETUP !== 'on') {
        return new Response('Not found', { status: 404 })
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    if (!clientId || !redirectUri) {
        return new Response('Server misconfigured', { status: 500 })
    }

    const state = crypto.randomUUID()
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope: 'playlist-modify-public playlist-modify-private',
        redirect_uri: redirectUri,
        state
    })

    const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
    response.cookies.set('spotify_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/api/spotify'
    })
    return response
}