'use client'

import { useState, type SubmitEvent } from 'react'

export function SubmitForm({ trinketID }: { trinketID: string }) {
    
    const [status, setStatus] = useState('')
    const [sending, setSending] = useState(false)
    
    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const link = new FormData(form).get('link')
        console.log(link)
        setStatus('Sending...')
        setSending(true)

        try {
            const response = await fetch("/api/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link, trinketID }),
                signal: AbortSignal.timeout(30000)
            })
            const data = await response.json()
            setStatus(data.message)
        } catch {
            setStatus('Failed to add song. Check your connection and try again.')
        } finally {
            setSending(false)
        }
    }
    
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label htmlFor="link">Spotify track link</label>
                <input id="link" name="link" type="url" required />
                <button type="submit" disabled={sending}>Add song</button>
            </form>
            <p>{status}</p>
        </div>
    )
}

