'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import EnhancedBackgroundPaths from '@/components/ui/modern-background-paths';
import { FeaturesSectionWithHoverEffects } from '@/components/ui/feature-section-with-hover-effects';
import { HowItWorks } from '@/components/ui/features-4';
import {
  IconPhone, IconFileText, IconTool, IconBox,
  IconShoppingCart, IconChartBar, IconUsers, IconTruck,
  IconReceipt, IconClipboardList, IconPackage, IconSettings,
  IconArrowRight, IconSparkles, IconCheck,
} from '@tabler/icons-react';

/* ─── Animated counter (native IntersectionObserver — no framer hook) ── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        obs.disconnect();
        let frame: number;
        const t0 = performance.now();
        const dur = 1400;
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Stats ────────────────────────────────────────────────────────────── */
const stats = [
  { numeric: true,  to: 12,  suffix: '+', text: '',   label: 'Integrated Modules',  color: '#7c3aed' },
  { numeric: true,  to: 100, suffix: '%', text: '',   label: 'End-to-End Coverage', color: '#059669' },
  { numeric: false, to: 0,   suffix: '',  text: '5+', label: 'User Role Types',     color: '#d97706' },
  { numeric: false, to: 0,   suffix: '',  text: '1',  label: 'Unified Platform',    color: '#e11d48' },
];

/* ─── Module showcase data ──────────────────────────────────────────────── */
const modules = [
  {
    title: 'CRM & Enquiries',
    description:
      'Capture every inbound enquiry and never lose a sales opportunity. Assign follow-ups to team members, track lead progression, and move prospects seamlessly through your pipeline.',
    icon: <IconPhone size={26} />,
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    features: ['Lead capture & tracking', 'Follow-up assignments', 'Pipeline management'],
    span: 'md:col-span-2',
  },
  {
    title: 'Quotation Builder',
    description:
      'Build detailed, professional quotations with line items, tiered discounts, and full version control. Get customer approvals and convert to orders with a single click.',
    icon: <IconFileText size={26} />,
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    features: ['Version control', 'Tiered discounts', 'One-click conversion'],
    span: '',
  },
  {
    title: 'Sales Orders',
    description:
      'Manage the full order lifecycle from creation to fulfilment. Link orders to manufacturing, track status in real time, and keep customers informed at every step.',
    icon: <IconClipboardList size={26} />,
    color: '#059669', bg: '#ecfdf5', border: '#a7f3d0',
    features: ['Order lifecycle', 'Manufacturing linkage', 'Status tracking'],
    span: '',
  },
  {
    title: 'Manufacturing & Job Cards',
    description:
      'Drive production with structured job cards and BOM management. Move materials through defined production stages with complete real-time visibility for every team member.',
    icon: <IconTool size={26} />,
    color: '#e11d48', bg: '#fff1f2', border: '#fecdd3',
    features: ['BOM management', 'Stage-wise tracking', 'Real-time status'],
    span: '',
  },
  {
    title: 'Inventory Management',
    description:
      'Know exactly what stock you have at all times. Track raw materials, monitor consumption, and maintain a complete stock ledger — always accurate, always up to date.',
    icon: <IconBox size={26} />,
    color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',
    features: ['Stock ledger', 'Consumption tracking', 'Material monitoring'],
    span: 'md:col-span-2',
  },
  {
    title: 'Goods Receipts',
    description:
      'Log every incoming material delivery against purchase orders. Verify quantities on arrival, flag discrepancies, and automatically update inventory — no manual entry.',
    icon: <IconPackage size={26} />,
    color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff',
    features: ['PO-linked receipts', 'Qty verification', 'Auto stock update'],
    span: '',
  },
  {
    title: 'Procurement & RFQ',
    description:
      'Raise purchase indents, send RFQs to multiple vendors, compare competing quotes side by side, and issue purchase orders through a clean structured workflow.',
    icon: <IconShoppingCart size={26} />,
    color: '#c026d3', bg: '#fdf4ff', border: '#f0abfc',
    features: ['RFQ to vendors', 'Quote comparison', 'PO generation'],
    span: '',
  },
  {
    title: 'Dispatch Tracking',
    description:
      'Track every product dispatch from the factory floor to the customer. Log dispatch details, generate shipping documents, and confirm deliveries — all in one place.',
    icon: <IconTruck size={26} />,
    color: '#65a30d', bg: '#f7fee7', border: '#bbf7d0',
    features: ['Dispatch records', 'Document generation', 'Delivery confirmation'],
    span: '',
  },
  {
    title: 'Invoicing & Payments',
    description:
      'Generate accurate invoices directly from orders with zero double entry. Track payment status, record receipts, and maintain complete financial records effortlessly.',
    icon: <IconReceipt size={26} />,
    color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8',
    features: ['Auto invoicing', 'Payment tracking', 'Financial records'],
    span: 'md:col-span-2',
  },
  {
    title: 'Reports & Analytics',
    description:
      "Get a bird's-eye view of your entire business. Sales funnels, production output, procurement spend, and enquiry trends — all visualised in charts you can act on.",
    icon: <IconChartBar size={26} />,
    color: '#ca8a04', bg: '#fefce8', border: '#fde68a',
    features: ['Sales analytics', 'Pipeline charts', 'Trend reports'],
    span: '',
  },
  {
    title: 'Customer Management',
    description:
      'Maintain rich, centralised customer profiles with full interaction history, key contacts, linked quotations and orders, and a complete communication log.',
    icon: <IconUsers size={26} />,
    color: '#dc2626', bg: '#fff1f2', border: '#fecaca',
    features: ['Customer profiles', 'Interaction history', 'Order linkage'],
    span: '',
  },
  {
    title: 'Settings & Permissions',
    description:
      'Configure every aspect of your workflow — production stages, units of measure, approval chains, and role-based permissions — precisely tailored to how your team operates.',
    icon: <IconSettings size={26} />,
    color: '#475569', bg: '#f8fafc', border: '#e2e8f0',
    features: ['Role-based access', 'Workflow stages', 'System config'],
    span: '',
  },
];

/* ─── Module card ───────────────────────────────────────────────────────── */
function ModuleCard({ mod, delay }: { mod: typeof modules[0]; delay: number }) {
  return (
    <motion.div
      initial={{ y: 28 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={`group relative flex flex-col p-7 rounded-2xl bg-white border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default ${mod.span}`}
      style={{ borderColor: mod.border }}
    >
      {/* Hover color wash */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${mod.bg} 0%, #ffffff 55%)` }}
      />
      {/* Left accent on hover */}
      <div
        className="absolute left-0 top-6 bottom-6 w-0.5 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"
        style={{ background: mod.color }}
      />
      {/* Decorative bg circle */}
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-[0.06] group-hover:opacity-[0.10] transition-opacity duration-300"
        style={{ background: mod.color }}
      />
      {/* Icon */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 3 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
        style={{
          background: mod.bg,
          color: mod.color,
          border: `1.5px solid ${mod.border}`,
          boxShadow: `0 4px 16px ${mod.color}25`,
        }}
      >
        {mod.icon}
      </motion.div>
      {/* Text */}
      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-slate-900 mb-2.5">{mod.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1">{mod.description}</p>
        {/* Feature tags */}
        <div className="flex flex-wrap gap-2">
          {mod.features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: mod.bg, color: mod.color, border: `1px solid ${mod.border}` }}
            >
              <IconCheck size={10} strokeWidth={2.5} />
              {f}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-14 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <motion.div
          initial={{ x: -12 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <img src="/logo-icon.png" alt="VAB Informatics" className="w-7 h-7 object-contain flex-shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-slate-900 text-sm tracking-tight">VAB Informatics</span>
            <span className="text-slate-400 text-[9px] tracking-widest uppercase">Private Limited</span>
          </div>
        </motion.div>
        <motion.div
          initial={{ x: 12 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
            style={{ textDecoration: 'none' }}
          >
            Login <IconArrowRight size={13} />
          </Link>
        </motion.div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="pt-14">
        <EnhancedBackgroundPaths
          title="Modern Manufacturing"
          subtitle="From lead capture to product dispatch — manage your entire manufacturing business with one powerful, integrated platform."
          primaryCta={{ label: 'Get Started', href: '/register' }}
        />
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 py-14 px-6 overflow-hidden">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(5,150,105,0.14) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div className="relative max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ y: 20 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group"
            >
              <p className="text-4xl font-black leading-none mb-2 tabular-nums" style={{ color: s.color }}>
                {s.numeric ? <Counter to={s.to} suffix={s.suffix} /> : s.text}
              </p>
              <p className="text-sm text-slate-400 font-medium">{s.label}</p>
              <div
                className="mt-3 h-0.5 w-8 mx-auto rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: s.color }}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features Overview ─────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 text-violet-700 bg-violet-50 border border-violet-100">
              <IconSparkles size={12} />
              Platform Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Everything You Need, In One Place
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Purpose-built modules for every part of your manufacturing business.
            </p>
          </motion.div>
          <FeaturesSectionWithHoverEffects />
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── Module Showcase ───────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 text-emerald-700 bg-emerald-50 border border-emerald-100">
              12 Modules
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Every Tool Your Business
              <br />
              <span className="text-slate-400 font-normal">Could Possibly Need</span>
            </h2>
            <p className="text-slate-400 text-base max-w-2xl mx-auto">
              VAB Enterprise is a complete operating system for manufacturers — from first customer contact all the way to final invoice, every step is covered.
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {modules.map((mod, i) => (
              <ModuleCard key={mod.title} mod={mod} delay={(i % 4) * 0.07} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 overflow-hidden bg-slate-900">
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-[500px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[250px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(5,150,105,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <motion.div
          initial={{ y: 32 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6 text-violet-400 border border-violet-500/30 bg-violet-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Get Started Today
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Ready to streamline
            <br />
            <span className="text-slate-400 font-normal">your operations?</span>
          </h2>
          <p className="text-slate-400 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Join manufacturers already using VAB Enterprise to run smarter, faster, and leaner — all in one unified platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold cursor-pointer relative overflow-hidden group"
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  boxShadow: '0 2px 0 rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25)',
                }}
              >
                <span className="relative z-10 flex items-center gap-2.5">
                  Get Started Free <IconArrowRight size={15} />
                </span>
                <span className="absolute inset-0 bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </motion.button>
            </Link>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold cursor-pointer border border-white/20 text-slate-300 hover:border-white/40 hover:text-white transition-colors duration-200"
              >
                Login to your account
              </motion.button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
            {['End-to-end workflow', 'Role-based access', 'Real-time tracking', 'Web-based'].map((f) => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-medium text-slate-400 border border-white/10 bg-white/5">
                ✓ {f}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="VAB Informatics" className="w-6 h-6 object-contain flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-slate-200 text-sm tracking-tight">VAB Informatics</span>
              <span className="text-slate-600 text-[9px] tracking-widest uppercase">Private Limited</span>
            </div>
          </div>
          <span className="text-sm text-slate-600">© 2025 VAB Enterprise. All rights reserved.</span>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="text-slate-400 hover:text-white transition-colors" style={{ textDecoration: 'none' }}>Login</Link>
            <Link href="/register" className="text-slate-400 hover:text-white transition-colors" style={{ textDecoration: 'none' }}>Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
