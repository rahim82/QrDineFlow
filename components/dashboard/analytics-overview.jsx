"use client";
import { formatCurrency } from "@/lib/utils";
export function AnalyticsOverview({ summary }) {
    return (<div className="glass-card p-6">
        <h3 className="text-lg font-semibold">Sales overview</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Today" value={formatCurrency(summary.sales.daily)}/>
          <MetricCard label="This week" value={formatCurrency(summary.sales.weekly)}/>
          <MetricCard label="This month" value={formatCurrency(summary.sales.monthly)}/>
        </div>
    </div>);
}
function MetricCard({ label, value }) {
    return (<div className="rounded-3xl bg-stone-950 px-5 py-6 text-white">
      <p className="text-sm text-stone-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>);
}
