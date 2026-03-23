'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { getDashboard } from '@/lib/api/dashboard';
import {
  getSalesEnquiryReport,
  getSalesFollowupReport,
  getCustomerReport,
  getEmployeePerformanceReport,
} from '@/lib/api/reports';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList,
} from 'recharts';

// ─── Salesforce-inspired colour palette ──────────────────────────────────────
const SF = ['#1B96FF', '#9063CF', '#7526E3', '#06A59A', '#FE9339', '#04844B', '#D8B0FF', '#F26419'];

const TIP: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

function Skeleton({ h = 200 }: { h?: number }) {
  return <div className="bg-gray-100 rounded-md animate-pulse w-full" style={{ height: h }} />;
}

// ─── Reusable card (Salesforce style) ────────────────────────────────────────
function Card({
  title,
  link,
  children,
  className = '',
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded flex flex-col ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-gray-300 hover:text-gray-500 cursor-default select-none text-base leading-none">⤢</span>
      </div>
      <div className="flex-1 px-4 pb-3 min-h-0">{children}</div>
      {link && (
        <div className="px-4 pb-3 flex-shrink-0">
          <span className="text-xs text-blue-600 hover:underline cursor-pointer">{link}</span>
        </div>
      )}
    </div>
  );
}

// ─── Big metric card ──────────────────────────────────────────────────────────
function BigStat({
  title,
  value,
  link,
}: {
  title: string;
  value: string | number;
  link?: string;
}) {
  return (
    <div
      className="bg-white border border-gray-200 rounded flex flex-col"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 130 }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-1 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-gray-300 select-none text-base leading-none">⤢</span>
      </div>
      <div className="flex-1 flex items-center px-4 pb-2">
        <span className="font-bold leading-none" style={{ fontSize: 52, color: '#0176D3' }}>
          {value}
        </span>
      </div>
      {link && (
        <div className="px-4 pb-3 flex-shrink-0">
          <span className="text-xs text-blue-600 hover:underline cursor-pointer">{link}</span>
        </div>
      )}
    </div>
  );
}

// ─── Donut with side legend ───────────────────────────────────────────────────
function DonutLegend({
  data,
  total,
  valueKey = 'value',
  nameKey = 'name',
  loading,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  total: number | string;
  valueKey?: string;
  nameKey?: string;
  loading?: boolean;
}) {
  if (loading) return <Skeleton h={190} />;
  if (!data.length) return <div className="h-[190px] flex items-center justify-center text-gray-400 text-sm">No data</div>;
  return (
    <div className="flex items-center gap-3 h-[190px]">
      <div className="relative flex-shrink-0">
        <PieChart width={140} height={140}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            dataKey={valueKey}
            paddingAngle={1}
          >
            {data.map((_: unknown, i: number) => <Cell key={i} fill={SF[i % SF.length]} />)}
          </Pie>
          <Tooltip contentStyle={TIP} formatter={(v: number) => [v, '']} />
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-bold text-gray-900">{total}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 text-[11px]">
        {data.map((d: Record<string, unknown>, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SF[i % SF.length] }} />
            <span className="text-gray-600 flex-1 truncate">{String(d[nameKey])}</span>
            <span className="font-semibold text-gray-800 flex-shrink-0">{String(d[valueKey])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId()!;

  const { data: dashRes, isLoading: dl } = useQuery({ queryKey: ['an-dash'],    queryFn: getDashboard,                               staleTime: 60000 });
  const { data: enqRes,  isLoading: el } = useQuery({ queryKey: ['an-enq'],     queryFn: () => getSalesEnquiryReport(enterpriseId),  staleTime: 60000 });
  const { data: fupRes              }    = useQuery({ queryKey: ['an-fup'],     queryFn: () => getSalesFollowupReport(enterpriseId), staleTime: 60000 });
  const { data: custRes, isLoading: cl } = useQuery({ queryKey: ['an-cust'],    queryFn: () => getCustomerReport(enterpriseId),      staleTime: 60000 });
  const { data: empRes,  isLoading: empl } = useQuery({ queryKey: ['an-emp'],   queryFn: () => getEmployeePerformanceReport(enterpriseId), staleTime: 60000 });

  const dash = dashRes?.data;
  const enq  = enqRes?.data;
  const fup  = fupRes?.data;
  const cust = custRes?.data;
  const emp  = empRes?.data || [];

  // Monthly trend – last 6 months, for horizontal bar
  const monthlyData = (
    enq?.enquiries_by_date.length
      ? enq.enquiries_by_date
      : (dash?.monthlyTrend || []).map(m => ({ date: m.month, count: Number(m.count) })).reverse()
  ).slice(-6);

  // Funnel from pipeline stats
  const funnelData = (dash?.pipelineStats || [])
    .map((p, i) => ({ name: p.status, value: Number(p.count), fill: SF[i % SF.length] }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Source bar – vertical
  const sourceData = (enq?.enquiries_by_source || [])
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);

  // Status horizontal bar
  const statusData = (enq?.enquiries_by_status || [])
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);

  // Customers by state donut
  const stateData = (cust?.customers_by_state || [])
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(s => ({ name: s.state, value: s.count }));
  const stateTotal = stateData.reduce((s, d) => s + d.value, 0);

  // Employee donut
  const empData = emp
    .filter(e => e.total_enquiries > 0)
    .sort((a, b) => b.total_enquiries - a.total_enquiries)
    .slice(0, 6)
    .map(e => ({ name: e.employee_name, value: e.total_enquiries, conv: e.conversion_rate }));
  const empTotal = empData.reduce((s, d) => s + d.value, 0);

  // Follow-up bars
  const fupTotal = fup?.total_followups || 0;
  const fupBars = fup ? [
    { label: 'Total',     value: fup.total_followups,   color: '#1B96FF' },
    { label: 'Overdue',   value: fup.overdue_followups,  color: '#EF4444' },
    { label: 'Upcoming',  value: fup.pending_followups,  color: '#10B981' },
    { label: 'Completed', value: fup.completed_followups, color: '#9063CF' },
  ] : [];

  const convRate = enq ? `${enq.conversion_rate.toFixed(1)}%` : '—';
  const totalEnq = dl ? '...' : (dash?.totalEnquiries || 0).toLocaleString();
  const totalCust = dl ? '...' : (dash?.totalCustomers || 0).toLocaleString();

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString();

  return (
    <div className="min-h-screen" style={{ background: '#f3f4f6' }}>

      {/* ── Page header (Salesforce-style) ─────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">Analytics</p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Business Intelligence Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              End-to-end platform analytics — enquiries, sales, customers, manufacturing &amp; team performance.
            </p>
            <p className="text-xs mt-1" style={{ color: '#0176D3' }}>
              As of {dateStr} · {timeStr}
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 space-y-4">

        {/* ── ROW 1 ───────────────────────────────────────────────── */}
        {/* [5] Monthly trend bar  |  [4] Pipeline funnel  |  [3] 3× metric cards */}
        <div className="grid grid-cols-12 gap-4">

          {/* Monthly enquiry trend – horizontal bar */}
          <div className="col-span-5">
            <Card title="Enquiries by Month" link="View Report (Monthly Enquiry Trend)">
              {el || dl
                ? <Skeleton h={230} />
                : monthlyData.length === 0
                  ? <div className="h-[230px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
                  : <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={monthlyData} layout="vertical" margin={{ top: 4, right: 44, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                        <YAxis dataKey="date" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} width={54} />
                        <Tooltip contentStyle={TIP} formatter={(v: number) => [v, 'Enquiries']} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={24} fill="#1B96FF">
                          <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
              }
            </Card>
          </div>

          {/* Pipeline funnel with right-side legend */}
          <div className="col-span-4">
            <Card title="Pipeline by Stage" link="View Report (Opportunities by Stage)">
              {dl
                ? <Skeleton h={230} />
                : funnelData.length === 0
                  ? <div className="h-[230px] flex items-center justify-center text-gray-400 text-sm">No pipeline data</div>
                  : <div className="flex gap-2 h-[230px]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 text-center">
                          Total: {funnelData.reduce((s, d) => s + d.value, 0).toLocaleString()}
                        </p>
                        <ResponsiveContainer width="100%" height={210}>
                          <FunnelChart>
                            <Tooltip contentStyle={TIP} formatter={(v: number) => [v, 'Count']} />
                            <Funnel dataKey="value" data={funnelData} isAnimationActive>
                              {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                              <LabelList
                                position="center"
                                fill="#fff"
                                stroke="none"
                                dataKey="value"
                                style={{ fontSize: 11, fontWeight: 700 }}
                              />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-center gap-2 text-[10px] w-[90px] flex-shrink-0">
                        <p className="text-gray-400 font-medium text-right">Stage</p>
                        {funnelData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 justify-end">
                            <span className="text-gray-600 truncate text-right max-w-[68px]">{d.name}</span>
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                          </div>
                        ))}
                      </div>
                    </div>
              }
            </Card>
          </div>

          {/* Right column: 3 stacked big metric cards */}
          <div className="col-span-3 flex flex-col gap-4">
            <BigStat title="Total Enquiries"   value={totalEnq}   link="View Report (All Enquiries)" />
            <BigStat title="Conversion Rate"   value={el ? '...' : convRate} link="View Report (Closed Sales)" />
            <BigStat title="Total Customers"   value={totalCust}  link="View Report (Customer List)" />
          </div>
        </div>

        {/* ── ROW 2 ───────────────────────────────────────────────── */}
        {/* [4] State donut  |  [4] Source vertical bar  |  [4] Employee donut */}
        <div className="grid grid-cols-12 gap-4">

          {/* Customers by State – donut + legend */}
          <div className="col-span-4">
            <Card title="Customers by State" link="View Report (Customers by Region)">
              <DonutLegend
                data={stateData}
                total={stateTotal > 999 ? `${(stateTotal / 1000).toFixed(1)}k` : stateTotal}
                loading={cl}
              />
            </Card>
          </div>

          {/* Enquiries by Source – vertical bar */}
          <div className="col-span-4">
            <Card title="Enquiries by Lead Source" link="View Report (Enquiries by Lead Source)">
              {el
                ? <Skeleton h={190} />
                : sourceData.length === 0
                  ? <div className="h-[190px] flex items-center justify-center text-gray-400 text-sm">No source data</div>
                  : <ResponsiveContainer width="100%" height={195}>
                      <BarChart data={sourceData} margin={{ top: 18, right: 8, left: -20, bottom: 44 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="source_name"
                          tick={{ fontSize: 9, fill: '#6b7280' }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                        <Tooltip contentStyle={TIP} formatter={(v: number) => [v, 'Enquiries']} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={30} fill="#1B96FF">
                          <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
              }
            </Card>
          </div>

          {/* Enquiries by Employee – donut + legend */}
          <div className="col-span-4">
            <Card title="Enquiries by Employee" link="View Report (Team Performance)">
              <DonutLegend
                data={empData}
                total={empTotal > 999 ? `${(empTotal / 1000).toFixed(1)}k` : empTotal}
                loading={empl}
              />
            </Card>
          </div>
        </div>

        {/* ── ROW 3 ───────────────────────────────────────────────── */}
        {/* [5] Status horizontal bar  |  [4] Follow-up health  |  [3] Jobs + Quotations */}
        <div className="grid grid-cols-12 gap-4">

          {/* Enquiry status – horizontal bar */}
          <div className="col-span-5">
            <Card title="Enquiries by Status" link="View Report (Enquiry Status Breakdown)">
              {el
                ? <Skeleton h={195} />
                : statusData.length === 0
                  ? <div className="h-[195px] flex items-center justify-center text-gray-400 text-sm">No data</div>
                  : <ResponsiveContainer width="100%" height={195}>
                      <BarChart data={statusData} layout="vertical" margin={{ top: 2, right: 44, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                        <YAxis dataKey="status_label" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} width={96} />
                        <Tooltip contentStyle={TIP} formatter={(v: number) => [v, 'Count']} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={20}>
                          {statusData.map((s, i) => <Cell key={i} fill={s.color || SF[i % SF.length]} />)}
                          <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
              }
            </Card>
          </div>

          {/* Follow-up health – progress bars */}
          <div className="col-span-4">
            <Card title="Follow-up Overview" link="View Report (Follow-ups)">
              {!fup
                ? <Skeleton h={195} />
                : <div className="space-y-4 pt-1">
                    {fupBars.map(item => {
                      const pct = fupTotal > 0 ? (item.value / fupTotal) * 100 : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs text-gray-600">{item.label}</span>
                            <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(pct, item.value > 0 ? 4 : 0)}%`,
                                background: item.color,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </Card>
          </div>

          {/* Jobs + Quotations stacked in right column */}
          <div className="col-span-3 flex flex-col gap-4">

            {/* Active Jobs mini card */}
            <div
              className="bg-white border border-gray-200 rounded flex-1"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-gray-900">Job Status</h3>
                <span className="text-gray-300 select-none text-base leading-none">⤢</span>
              </div>
              <div className="px-4 pb-4">
                {dl ? <Skeleton h={56} /> : (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Pending',   value: dash?.pendingJobs   || 0, color: '#FE9339' },
                      { label: 'Active',    value: dash?.activeJobs    || 0, color: '#1B96FF' },
                      { label: 'Done',      value: dash?.completedJobs || 0, color: '#04844B' },
                    ].map(s => (
                      <div key={s.label} className="text-center py-2.5 rounded-lg" style={{ background: `${s.color}18` }}>
                        <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quotations mini card */}
            <div
              className="bg-white border border-gray-200 rounded flex-1"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-gray-900">Quotations</h3>
                <span className="text-gray-300 select-none text-base leading-none">⤢</span>
              </div>
              <div className="px-4 pb-4">
                {dl ? <Skeleton h={56} /> : (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total',    value: dash?.totalQuotations   || 0, color: '#1B96FF' },
                      { label: 'Pending',  value: dash?.pendingQuotations  || 0, color: '#FE9339' },
                      { label: 'Won',      value: dash?.acceptedQuotations || 0, color: '#04844B' },
                    ].map(s => (
                      <div key={s.label} className="text-center py-2.5 rounded-lg" style={{ background: `${s.color}18` }}>
                        <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 4: Employee leaderboard full width ──────────────── */}
        {empData.length > 0 && (
          <div>
            <Card title="Team Performance Leaderboard" link="View Report (Employee Performance)">
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-1">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">#</th>
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Employee</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">Enquiries</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">Prospects</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">Closed</th>
                      <th className="text-right py-2 pl-3 text-gray-400 font-medium">Conv. Rate</th>
                      <th className="text-left py-2 pl-4 text-gray-400 font-medium w-40">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp
                      .filter(e => e.total_enquiries > 0 || e.total_conversions > 0)
                      .sort((a, b) => b.total_enquiries - a.total_enquiries)
                      .slice(0, 8)
                      .map((e, i) => {
                        const convColor = e.conversion_rate >= 20 ? '#04844B' : e.conversion_rate >= 10 ? '#FE9339' : '#EF4444';
                        const barPct = empTotal > 0 ? (e.total_enquiries / empTotal) * 100 : 0;
                        return (
                          <tr key={e.employee_id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="py-2.5 pr-4 text-gray-400 font-medium">{i + 1}</td>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                  style={{ background: SF[i % SF.length] }}
                                >
                                  {(e.employee_name || '?')[0].toUpperCase()}
                                </span>
                                <span className="font-medium text-gray-700">{e.employee_name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-700 font-semibold">{e.total_enquiries}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{e.total_prospects}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{e.total_conversions}</td>
                            <td className="py-2.5 pl-3 text-right">
                              <span
                                className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold"
                                style={{ background: convColor }}
                              >
                                {e.conversion_rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 pl-4 w-40">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${barPct}%`, background: SF[i % SF.length] }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
