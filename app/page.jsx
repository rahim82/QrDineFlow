import Link from "next/link";
import { Header } from "@/components/shared/header";
const highlights = [
    "Manager self registration and restaurant onboarding",
    "Table creation with QR links and live order routing",
    "Stock-aware menu publishing and dynamic pricing",
    "Card or pay-at-table checkout with live order updates"
];
export default function HomePage() {
    return (<main className="pb-20">
      <Header />
      <section className="shell grid gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-7">
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-sm font-medium text-orange-700">
            Restaurant QR ordering platform
          </span>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-stone-950 sm:text-7xl">
            A real restaurant control panel.
          </h1>
          <p className="max-w-2xl text-lg text-stone-600 sm:text-xl">
            Managers can create their own account, set up a restaurant, add tables and menus,
            and let customers place orders directly from table QR codes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/register" className="rounded-full bg-stone-950 px-7 py-3 text-white">
              Start as manager
            </Link>
            <Link href="/login" className="rounded-full border border-stone-200 bg-white px-7 py-3 text-stone-900 shadow-sm">
              Login to dashboard
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (<div key={item} className="rounded-[1.75rem] border border-white/60 bg-white/80 px-5 py-5 text-sm text-stone-700 shadow-[0_18px_60px_rgba(120,53,15,0.1)]">
                {item}
              </div>))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-4xl bg-stone-950 p-7 text-white shadow-[0_30px_100px_rgba(28,25,23,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.18),transparent_28%)]"/>
          <div className="relative space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-orange-200">What managers get</p>
            <div className="grid gap-4">
              {[
            "Create restaurant workspace",
            "Add tables and generate QR links",
            "Publish and update menu items",
            "Track live order statuses",
            "Watch billing and sales analytics"
        ].map((module) => (<div key={module} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-stone-50">
                  {module}
                </div>))}
            </div>
            <div className="rounded-[1.75rem] bg-white p-5 text-stone-950">
              <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Checkout modes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">Card via Razorpay</span> */}
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">Pay at table</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>);
}
