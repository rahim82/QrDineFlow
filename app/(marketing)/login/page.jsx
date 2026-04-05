"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [passwordValues, setPasswordValues] = useState({ email: "", password: "" });

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
              <p className="mt-2 text-sm text-stone-500">Use your email and password to open the dashboard.</p>
            </div>
            <Link href="/register" className="text-sm font-medium text-orange-700">
              Register
            </Link>
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
