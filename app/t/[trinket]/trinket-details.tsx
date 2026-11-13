import { SubmitForm } from './submit-form'

export async function TrinketDetails({ params }: { params: Promise<{ trinket: string }> }) {
    const { trinket } = await params
    return (
        <>
            <h1>{trinket}</h1>
            <SubmitForm trinketID={trinket} />
        </>
    )
}