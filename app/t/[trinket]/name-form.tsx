'use client'

import { useEffect, useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'

export function NameForm({ trinketID }: { trinketID: string }) {
    const router = useRouter()
    const [status, setStatus] = useState('')
    const [sending, setSending] = useState(false)
    const [ready, setReady] = useState(false)
    useEffect(() => {
        setReady(true)
    }, [])
    
    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const name = new FormData(form).get('name')
        if (typeof name !== 'string') return

        setStatus('Sending...')
        setSending(true)

        try {
            const response = await fetch("/api/name", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trinketID: trinketID, name }),
                signal: AbortSignal.timeout(30000)
            })
            const data = await response.json()
            setStatus(data.message)
            if (response.ok || response.status === 409) {
                 router.refresh()
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
                <label htmlFor="name">Give this auxstar a name</label>
                <input id="name" name="name" type="text" required />
                <button type="submit" disabled={sending || !ready}>{ready ? 'Name it' : 'Loading...'}</button>
            </form>
            <p>{status}</p>
        </div>
    )
}

