import Link from "next/link";
export function Header() {
    return (<header className="shell py-6">
      <div className="flex items-center justify-between rounded-[2rem] border border-white/60 bg-white/70 px-6 py-4 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur">
        <Link href="/" className="text-xl font-semibold text-stone-950">
          QR DineFlow
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/register" className="rounded-full bg-stone-950 px-4 py-2 text-white">
            Register
          </Link>
          <Link href="/login" className="rounded-full border border-stone-200 px-4 py-2">
            Login
          </Link>
        </nav>
      </div>
    </header>);
}
