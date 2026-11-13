export default async function Page({
    params,
}: {
    params: Promise<{ trinket: string }>
}) {
    const { trinket } = await params
    return (
        <div>{trinket}</div>
    );
}