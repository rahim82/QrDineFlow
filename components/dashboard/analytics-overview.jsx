"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
export function AnalyticsOverview({ summary }) {
    return (<div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold">Sales overview</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Today" value={formatCurrency(summary.sales.daily)}/>
          <MetricCard label="This week" value={formatCurrency(summary.sales.weekly)}/>
          <MetricCard label="This month" value={formatCurrency(summary.sales.monthly)}/>
        </div>
      </div>
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold">Peak order time</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.peakOrderTime}>
              <CartesianGrid vertical={false} strokeDasharray="3 3"/>
              <XAxis dataKey="hour"/>
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#f97316" radius={[8, 8, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>);
}
function MetricCard({ label, value }) {
    return (<div className="rounded-3xl bg-stone-950 px-5 py-6 text-white">
      <p className="text-sm text-stone-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>);
}
