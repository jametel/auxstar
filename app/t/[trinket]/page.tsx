import { Suspense } from 'react'
import { TrinketDetails } from './trinket-details'

export default function Page({
    params,
}: {
    params: Promise<{ trinket: string }>
}) {
    return (
        <main>
            <Suspense fallback={<p>Loading...</p>}>
                <TrinketDetails params={params} />
            </Suspense>
        </main>
    );
}