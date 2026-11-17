'use client'

import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'

export function SubmitForm({ trinketID, eventNames }: { trinketID: string; eventNames: string[] }) {
    const router = useRouter()
    
    const [status, setStatus] = useState('')
    const [sending, setSending] = useState(false)
    const [ready, setReady] = useState(false)
    useEffect(() => {
        setReady(true)
    }, [])

    const attempt = useRef<{ link: string; key: string } | null>(null)
    
    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const link = new FormData(form).get('link')

        const eventValue = new FormData(form).get('event')

        if (typeof link !== 'string') return

        if (attempt.current?.link !== link) {
            attempt.current = { link, key: crypto.randomUUID() }
        }

        setStatus('Sending...')
        setSending(true)

        try {
            const response = await fetch("/api/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link, trinketID: trinketID, submissionKey: attempt.current.key, event: typeof eventValue === 'string' ? eventValue : undefined }),
                signal: AbortSignal.timeout(30000)
            })
            const data = await response.json()
            setStatus(data.message)
            if (response.ok){
                 router.refresh()
                 form.reset()
                 attempt.current = null
            }
        } catch {
            setStatus("Couldn't confirm submission. Please try again.")
        } finally {
            setSending(false)
        }
    }
    
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label htmlFor="event">Event (optional)</label>
                <input id="event" name="event" type="text" list="event-options" maxLength={60} autoComplete="off" />
                <datalist id="event-options">
                    {eventNames.map(n => <option key={n} value={n} />)}
                </datalist>
                <label htmlFor="link">Spotify track link</label>
                <input id="link" name="link" type="url" required />
                <button type="submit" disabled={sending || !ready}>{ready ? 'Add song' : 'Loading...'}</button>
            </form>
            <p>{status}</p>
        </div>
    )
}

