'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

function formatY(v: number) {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
}

const PIE_COLORS: Record<string, string> = {
  active: '#22c55e',
  blocked: '#ef4444',
  pending: '#f59e0b',
  inactive: '#94a3b8',
};

export function MonthlyRevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={40} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatY} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlySignupsChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={40} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="New Enterprises" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div style={{ width: '100%', height: 240 }} className="flex items-center">
      <ResponsiveContainer width="60%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={false}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={PIE_COLORS[entry.status] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, name: string) => [`${v} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 pl-2">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: PIE_COLORS[d.status] ?? '#94a3b8' }} />
            <span className="capitalize text-slate-700">{d.status}</span>
            <span className="font-semibold text-slate-800">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
