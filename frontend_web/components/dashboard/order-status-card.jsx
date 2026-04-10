"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
const statuses = ["received", "preparing", "ready", "served"];
export function OrderStatusCard({ id, tableNumber, customerName, itemCount, amount, status }) {
    const [currentStatus, setCurrentStatus] = useState(status);
    const [isPending, startTransition] = useTransition();
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
            setCurrentStatus(nextStatus);
            toast.success(`Order moved to ${nextStatus}`);
        });
    }
    return (<div className="rounded-3xl border border-stone-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            Table {tableNumber} • {customerName}
          </p>
          <p className="text-sm text-stone-500">
            {itemCount} items • {amount}
          </p>
        </div>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">{currentStatus}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.map((nextStatus) => (<button key={nextStatus} onClick={() => updateStatus(nextStatus)} disabled={isPending || nextStatus === currentStatus} className="rounded-full border border-stone-200 px-3 py-2 text-sm disabled:opacity-50">
            {nextStatus}
          </button>))}
      </div>
    </div>);
}
