import Link from "next/link";
export default function NotFound() {
    return (<main className="shell flex min-h-screen items-center justify-center py-16">
      <div className="glass-card max-w-lg p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-stone-500">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Table or restaurant not found</h1>
        <p className="mt-3 text-stone-600">
          The QR code may be outdated, or the demo data has not been seeded yet.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-white">
          Back to home
        </Link>
      </div>
    </main>);
}
