"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const statuses = ["received", "preparing", "ready", "served"];
export function AdvancedOrderCard({
    id,
    tableNumber,
    customerName,
    itemCount,
    amount,
    status,
    createdAt,
    items = [],
    splitParticipants = []
}) {
    const router = useRouter();
    const [currentStatus, setCurrentStatus] = useState(status);
    const [isPending, startTransition] = useTransition();

    const createdLabel = createdAt
        ? new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date(createdAt))
        : null;

    function updateStatus(nextStatus) {
        startTransition(async () => {
            const response = await fetch(`/api/orders/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });

            if (!response.ok) {
                toast.error("Unable to update status");
                return;
            }

            const data = await response.json();
            if (data?.removed) {
                toast.success("Order served. The order was cleared and the table is now free.");
                router.refresh();
                return;
            }

            setCurrentStatus(nextStatus);
            toast.success(`Order moved to ${nextStatus}`);
            router.refresh();
        });
    }

    return (
        <article className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_12px_40px_rgba(28,25,23,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                        <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">Table {tableNumber}</span>
                        {createdLabel ? <span>{createdLabel}</span> : null}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-stone-950">{customerName}</h3>
                        <p className="text-sm text-stone-500">{itemCount} items in this order</p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium capitalize text-orange-700">
                        {currentStatus}
                    </span>
                    <p className="mt-3 text-2xl font-semibold text-stone-950">{amount}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl bg-stone-50 p-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-stone-950">Ordered items</h4>
                        <span className="text-sm text-stone-500">{itemCount} total</span>
                    </div>

                    <div className="mt-3 space-y-3">
                        {items.map((item) => (
                            <div
                                key={`${id}-${item.name}`}
                                className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                            >
                                <div>
                                    <p className="font-medium text-stone-900">{item.name}</p>
                                    <p className="text-sm text-stone-500">
                                        Qty {item.quantity} x {formatCurrency(item.unitPrice)}
                                    </p>
                                </div>
                                <p className="font-semibold text-stone-900">{formatCurrency(item.totalPrice)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-stone-200 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-stone-950">Split billing</h4>
                            <span className="text-sm text-stone-500">
                                {splitParticipants.length ? `${splitParticipants.length} guests` : "Not split"}
                            </span>
                        </div>

                        {splitParticipants.length ? (
                            <div className="mt-3 space-y-3">
                                {splitParticipants.map((participant) => (
                                    <div key={`${id}-${participant.name}`} className="rounded-2xl bg-stone-50 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium text-stone-900">{participant.name}</p>
                                            <p className="font-semibold text-stone-900">
                                                {formatCurrency(participant.amount)}
                                            </p>
                                        </div>
                                        {participant.items?.length ? (
                                            <p className="mt-1 text-sm text-stone-500">{participant.items.join(", ")}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-stone-500">Single bill order. No split participants added.</p>
                        )}
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {statuses.map((nextStatus) => (
                    <button
                        key={nextStatus}
                        onClick={() => updateStatus(nextStatus)}
                        disabled={isPending || nextStatus === currentStatus}
                        className="rounded-full border border-stone-200 px-3 py-2 text-sm font-medium capitalize text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {nextStatus}
                    </button>
                ))}
            </div>
        </article>
    );
}
