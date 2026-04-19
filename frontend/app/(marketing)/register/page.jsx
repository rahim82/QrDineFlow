"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { managerRegisterSchema } from "@/lib/validations/auth";
export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(managerRegisterSchema),
        defaultValues: {
            managerName: "",
            email: "",
            password: "",
            restaurantName: "",
            tagline: ""
        }
    });
    async function onSubmit(values) {
        setLoading(true);
        try {
            const response = await fetch("/api/auth/register-manager", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(data.error || "Registration failed");
                return;
            }
            toast.success("Restaurant workspace created");
            window.location.href = "/manager/dashboard";
        }
        catch (error) {
            console.error("register network error", error);
            toast.error("The registration request could not reach the server");
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="shell min-h-screen py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-stone-950 p-8 text-white shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Manager onboarding</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Launch your restaurant workspace on your own.</h1>
          <p className="mt-4 max-w-xl text-stone-300">
            Create an account, set up your restaurant, add tables, publish the menu, and go live with QR ordering.
          </p>
          <div className="mt-8 grid gap-3">
            {["Self registration", "Table QR generation", "Menu management", "Live order tracking"].map((item) => (<div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {item}
              </div>))}
          </div>
        </section>

        <section className="glass-card p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Create manager account</h2>
              <p className="mt-2 text-sm text-stone-500">No demo flow. Create your workspace directly.</p>
            </div>
            <Link href="/login" className="text-sm font-medium text-orange-700">
              Login
            </Link>
          </div>
          <form className="mt-8 grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <input className="rounded-2xl border border-stone-200 px-4 py-3" placeholder="Manager name" {...form.register("managerName")}/>
            <input className="rounded-2xl border border-stone-200 px-4 py-3" placeholder="Email" {...form.register("email")}/>
            <input type="password" className="rounded-2xl border border-stone-200 px-4 py-3" placeholder="Password" {...form.register("password")}/>
            <input className="rounded-2xl border border-stone-200 px-4 py-3" placeholder="Restaurant name" {...form.register("restaurantName")}/>
            <textarea className="min-h-28 rounded-2xl border border-stone-200 px-4 py-3" placeholder="Short restaurant tagline" {...form.register("tagline")}/>
            <button disabled={loading} className="rounded-2xl bg-orange-500 px-4 py-3 font-medium text-white disabled:opacity-60">
              {loading ? "Creating..." : "Create workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>);
}
