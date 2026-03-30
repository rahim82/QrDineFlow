"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { formatCurrency } from "@/lib/utils";

const FALLBACK_MENU_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#fff7ed"/>
    <rect x="60" y="60" width="1080" height="680" rx="36" fill="#fed7aa"/>
    <circle cx="270" cy="280" r="110" fill="#fb923c"/>
    <circle cx="360" cy="390" r="70" fill="#fdba74"/>
    <rect x="500" y="220" width="420" height="44" rx="22" fill="#9a3412"/>
    <rect x="500" y="300" width="320" height="28" rx="14" fill="#c2410c"/>
    <rect x="500" y="350" width="260" height="28" rx="14" fill="#c2410c"/>
    <rect x="500" y="430" width="180" height="90" rx="24" fill="#1c1917"/>
    <text x="500" y="585" font-family="Arial, sans-serif" font-size="42" fill="#7c2d12">Menu image unavailable</text>
  </svg>
`)}`;

function resolveMenuImage(src) {
    if (!src || typeof src !== "string") {
        return FALLBACK_MENU_IMAGE;
    }
    try {
        const url = new URL(src);
        const allowedHosts = new Set(["images.unsplash.com", "plus.unsplash.com", "res.cloudinary.com"]);
        const blockedHosts = new Set(["www.youtube.com", "youtube.com", "youtu.be"]);
        if (blockedHosts.has(url.hostname) || !allowedHosts.has(url.hostname)) {
            return FALLBACK_MENU_IMAGE;
        }
        return src;
    }
    catch {
        return FALLBACK_MENU_IMAGE;
    }
}

async function readJsonSafely(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
export function MenuClient({ restaurantId, restaurantName, tableId, tableNumber, menu }) {
    const [customerName, setCustomerName] = useState("Guest");
    const [splitWith, setSplitWith] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [cart, setCart] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [latestStatus, setLatestStatus] = useState("Browse and place your order");
    const [lastOrderId, setLastOrderId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState("pending");
    useEffect(() => {
        const socket = getSocket();
        socket.emit("join:table", `${restaurantId}:${tableNumber}`);
        socket.on("order:status", (payload) => setLatestStatus(`Order ${payload.orderId.slice(-5)} is ${payload.status}`));
        return () => {
            socket.off("order:status");
        };
    }, [restaurantId, tableNumber]);
    const grouped = useMemo(() => {
        const available = menu.filter((item) => item.isAvailable);
        return available.reduce((acc, item) => {
            acc[item.category] = [...(acc[item.category] || []), item];
            return acc;
        }, {});
    }, [menu]);
    const total = Object.values(cart).reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
    function addToCart(item) {
        setCart((current) => ({
            ...current,
            [item._id]: {
                ...item,
                quantity: (current[item._id]?.quantity || 0) + 1
            }
        }));
    }
    function changeQuantity(id, delta) {
        setCart((current) => {
            const next = { ...current };
            const existing = next[id];
            if (!existing)
                return current;
            existing.quantity += delta;
            if (existing.quantity <= 0)
                delete next[id];
            return next;
        });
    }
    async function placeOrder() {
        if (!Object.keys(cart).length) {
            toast.error("Add at least one item");
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId,
                    tableId,
                    tableNumber,
                    customerName,
                    paymentMethod,
                    splitWith: splitWith
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    items: Object.values(cart).map((item) => ({
                        menuItemId: item._id,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.currentPrice
                    }))
                })
            });
            const data = await readJsonSafely(response);
            if (!response.ok) {
                toast.error((data && "error" in data && typeof data.error === "string" ? data.error : null) || "Order failed");
                return;
            }
            if (!data || !("order" in data) || !("bill" in data) || !("payment" in data)) {
                toast.error("The server did not return a valid response");
                return;
            }
            toast.success("Order placed successfully");
            setCart({});
            setLastOrderId(String(data.order._id));
            setPaymentStatus(data.payment.status);
            setLatestStatus(`Order received. Bill total ${formatCurrency(data.bill.total)}`);
            if (paymentMethod !== "cash") {
                const paymentResponse = await fetch("/api/payments/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: data.bill.total,
                        receipt: String(data.order._id)
                    })
                });
                if (!paymentResponse.ok) {
                    toast.error("Payment order could not be initialized");
                }
            }
        }
        catch (error) {
            console.error("placeOrder network error", error);
            toast.error("Could not connect to the server");
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-stone-950 p-6 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.24),transparent_30%),radial-gradient(circle_at_right,rgba(45,212,191,0.18),transparent_25%)]"/>
          <div className="relative">
            <p className="text-sm uppercase tracking-[0.2em] text-orange-200">Table {tableNumber}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{restaurantName}</h1>
            <p className="mt-2 text-sm text-stone-300">{latestStatus}</p>
          </div>
        </div>

        {Object.entries(grouped).map(([category, items]) => (<div key={category} className="space-y-4">
            <h2 className="section-title">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (<article key={item._id} className="glass-card overflow-hidden">
                  <div className="relative h-52">
                    <Image src={resolveMenuImage(item.image)} alt={item.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"/>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                      </div>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                        {item.tags.join(" / ") || "Chef special"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        {item.activeDiscountLabel ? (<p className="text-sm text-stone-400 line-through">{formatCurrency(item.price)}</p>) : null}
                        <p className="text-lg font-semibold text-stone-950">{formatCurrency(item.currentPrice)}</p>
                      </div>
                      <button onClick={() => addToCart(item)} className="rounded-full bg-stone-950 px-4 py-2 text-sm text-white">
                        Add
                      </button>
                    </div>
                  </div>
                </article>))}
            </div>
          </div>))}
      </section>

      <aside className="sticky top-6 h-fit rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(120,53,15,0.14)]">
        <h2 className="text-2xl font-semibold">Your order</h2>
        <div className="mt-6 space-y-4">
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3" placeholder="Customer name"/>
          <input value={splitWith} onChange={(event) => setSplitWith(event.target.value)} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3" placeholder="Split with: Asha, Rohan"/>
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <option value="card">Card</option>
            <option value="cash">Pay at table</option>
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {Object.values(cart).length ? (Object.values(cart).map((item) => (<div key={item._id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-stone-500">{formatCurrency(item.currentPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQuantity(item._id, -1)} className="rounded-full border px-3 py-1">
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item._id, 1)} className="rounded-full border px-3 py-1">
                      +
                    </button>
                  </div>
                </div>
              </div>))) : (<p className="text-sm text-stone-500">Your cart is empty.</p>)}
        </div>

        <div className="mt-6 rounded-2xl bg-stone-950 p-5 text-white">
          <div className="flex items-center justify-between text-sm text-stone-300">
            <span>Estimated total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-stone-300">
            <span>Payment</span>
            <span>{paymentStatus}</span>
          </div>
          <button onClick={placeOrder} disabled={submitting} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 font-medium text-white disabled:opacity-60">
            {submitting ? "Placing order..." : "Place order"}
          </button>
          {lastOrderId ? (<a href={`/api/orders/${lastOrderId}/bill`} className="mt-3 block rounded-2xl border border-white/20 px-4 py-3 text-center text-sm font-medium">
              Download bill PDF
            </a>) : null}
        </div>
      </aside>
    </div>);
}
