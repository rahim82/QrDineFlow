"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
export default function LoginPage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [passwordValues, setPasswordValues] = useState({ email: "", password: "" });
    const googleError = searchParams.get("error");

    async function handlePasswordLogin(event) {
        event.preventDefault();
        setLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(passwordValues)
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(data.error || "Login failed");
                return;
            }
            toast.success("Login successful");
            window.location.href = data.user.role === "admin" ? "/admin/dashboard" : "/manager/dashboard";
        }
        catch (error) {
            console.error("login network error", error);
            toast.error("The login request could not reach the server");
        }
        finally {
            setLoading(false);
        }
    }

    return (<main className="shell min-h-screen py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-4xl bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950 p-8 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-200">Manager access</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Return to your operations dashboard.</h1>
          <p className="mt-4 max-w-xl text-stone-300">
            Manage tables, menus, live orders, QR links, billing, and analytics from one dashboard.
          </p>
          {/* <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-stone-300">
            Demo buttons have been removed. Managers now register or log in to manage their own workspace.
          </div> */}
        </section>
        <div className="glass-card w-full p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-stone-950">Login</h1>
              <p className="mt-2 text-sm text-stone-500">Use your email and password or continue with Google.</p>
            </div>
            <Link href="/register" className="text-sm font-medium text-orange-700">
              Register
            </Link>
          </div>
          {googleError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Google login could not be completed. Please try again.
            </div>
          ) : null}
          <div className="mt-6 space-y-4">
            <a href="/api/auth/google" className="group flex w-full items-center justify-between rounded-[1.35rem] border border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] px-5 py-4 text-left shadow-[0_12px_32px_rgba(28,25,23,0.06)] transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_18px_40px_rgba(28,25,23,0.1)]">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.5-.2-2.1H12z" />
                    <path fill="#34A853" d="M12 21c2.6 0 4.9-.9 6.5-2.4l-3.1-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2l-3.2 2.5C4.8 18.8 8.1 21 12 21z" />
                    <path fill="#4285F4" d="M6.3 12.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.1 6.6C2.4 8 2 9.5 2 11s.4 3 1.1 4.4l3.2-2.5z" />
                    <path fill="#FBBC05" d="M12 4.9c1.4 0 2.7.5 3.7 1.4l2.7-2.7C16.9 2.2 14.7 1.3 12 1.3 8.1 1.3 4.8 3.5 3.1 6.6l3.2 2.5C7.1 6.7 9.4 4.9 12 4.9z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-950">Continue with Google</p>
                  {/* <p className="mt-1 text-xs text-stone-500">Fast sign-in for admin and manager access</p> */}
                </div>
              </div>
              {/* <span className="text-sm font-medium text-stone-400 transition group-hover:text-stone-700">Open</span> */}
            </a>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">or</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handlePasswordLogin}>
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <input value={passwordValues.email} onChange={(event) => setPasswordValues((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3"/>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Password</label>
                <input type="password" value={passwordValues.password} onChange={(event) => setPasswordValues((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3"/>
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-white disabled:opacity-60">
                {loading ? "Signing in..." : "Sign in with password"}
              </button>
            </form>
        </div>
      </div>
    </main>);
}
