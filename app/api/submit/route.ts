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
    
    const { link, trinketID } = body
    if (typeof link !== 'string' || typeof trinketID !== 'string') {
        return Response.json({ message: 'Missing link or trinket ID' }, { status: 400 })
    }

    if (link.length >= 200 || trinketID.length >= 64) {
        return Response.json({ message: 'Input too long' }, { status: 400 })
    }

    let url
    try {
        url = new URL(link)
    } catch {
        return Response.json({ message: 'Invalid link' }, { status: 400 })
    }

    if (url.protocol != 'https:' || url.hostname != 'open.spotify.com') {
        return Response.json({ message: 'Not a Spotify link' }, { status: 400 })
    }

    const trackParts = url.pathname.split('/').filter(Boolean)
    if (trackParts[0]?.startsWith('intl-')) {
        trackParts.shift()
    }

    const trackID = trackParts[1] ?? ''
    if (trackParts[0] !== 'track' || !/^[a-zA-Z0-9]{22}$/.test(trackID)) {
        return Response.json({ message: 'Paste a link to a single track' }, { status: 400 })
    }

    console.log( trackID, trinketID )

    return Response.json({ message: 'ok' })
}