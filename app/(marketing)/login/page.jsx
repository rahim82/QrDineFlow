"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
export default function LoginPage() {
    const [mode, setMode] = useState("password");
    const [loading, setLoading] = useState(false);
    const [passwordValues, setPasswordValues] = useState({ email: "", password: "" });
    const [otpEmail, setOtpEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);
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
    async function handleRequestOtp(event) {
        event.preventDefault();
        setLoading(true);
        try {
            const response = await fetch("/api/auth/request-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: otpEmail })
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(data.error || "OTP could not be sent");
                return;
            }
            setOtpSent(true);
            toast.success(data.devOtp ? `OTP sent: ${data.devOtp}` : data.message || "OTP sent successfully");
        }
        catch (error) {
            console.error("request otp network error", error);
            toast.error("The OTP request could not reach the server");
        }
        finally {
            setLoading(false);
        }
    }
    async function handleVerifyOtp(event) {
        event.preventDefault();
        setLoading(true);
        try {
            const response = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: otpEmail, otp: otpCode })
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(data.error || "OTP verification failed");
                return;
            }
            toast.success("Login successful");
            window.location.href = data.user.role === "admin" ? "/admin/dashboard" : "/manager/dashboard";
        }
        catch (error) {
            console.error("verify otp network error", error);
            toast.error("The OTP verification request could not reach the server");
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="shell min-h-screen py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950 p-8 text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-200">Manager access</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Return to your operations dashboard.</h1>
          <p className="mt-4 max-w-xl text-stone-300">
            Manage tables, menus, live orders, QR links, billing, and analytics from one dashboard.
          </p>
          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-stone-300">
            Demo buttons have been removed. Managers now register or log in to manage their own workspace.
          </div>
        </section>
        <div className="glass-card w-full p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-stone-950">Login</h1>
              <p className="mt-2 text-sm text-stone-500">Use password login or request a one-time OTP to open the dashboard.</p>
            </div>
            <Link href="/register" className="text-sm font-medium text-orange-700">
              Register
            </Link>
          </div>
          <div className="mt-8 inline-flex rounded-full border border-stone-200 bg-stone-50 p-1">
            <button onClick={() => setMode("password")} className={`rounded-full px-4 py-2 text-sm ${mode === "password" ? "bg-stone-950 text-white" : "text-stone-600"}`}>
              Password
            </button>
            <button onClick={() => setMode("otp")} className={`rounded-full px-4 py-2 text-sm ${mode === "otp" ? "bg-stone-950 text-white" : "text-stone-600"}`}>
              OTP
            </button>
          </div>
          {mode === "password" ? (<form className="mt-6 space-y-4" onSubmit={handlePasswordLogin}>
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
            </form>) : (<div className="mt-6 space-y-4">
              <form className="space-y-4" onSubmit={handleRequestOtp}>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <input value={otpEmail} onChange={(event) => setOtpEmail(event.target.value)} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3"/>
                </div>
                <button type="submit" disabled={loading || !otpEmail} className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-white disabled:opacity-60">
                  {loading && !otpSent ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                <div>
                  <label className="mb-2 block text-sm font-medium">One-time password</label>
                  <input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 tracking-[0.35em]"/>
                </div>
                <button type="submit" disabled={loading || !otpSent || otpCode.length !== 6} className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-white disabled:opacity-60">
                  {loading && otpSent ? "Verifying OTP..." : "Verify OTP"}
                </button>
              </form>
              <p className="text-sm text-stone-500">In development, OTP is also printed in the terminal so you can test the flow quickly.</p>
            </div>)}
        </div>
      </div>
    </main>);
}
