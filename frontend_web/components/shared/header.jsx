import Link from "next/link";

export function Header() {
  return (
    <header className="shell flex items-center justify-between py-6">
      <Link href="/" className="text-xl font-semibold tracking-tight text-stone-950">
        QR DineFlow
      </Link>
      <nav className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800 shadow-sm"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm text-white"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}
