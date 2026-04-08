'use client';

import { motion } from 'framer-motion';
import { Users, FileText, PackageCheck } from 'lucide-react';

const steps = [
  {
    icon: <Users className="size-6" />,
    title: 'Add Customers & Capture Enquiries',
    desc: 'Register contacts, log inbound enquiries, and assign follow-up tasks to your team — all in one place.',
    gradient: 'from-violet-500 to-purple-400',
    glowRgb: '124,58,237',
  },
  {
    icon: <FileText className="size-6" />,
    title: 'Create Quotations & Convert to Orders',
    desc: 'Build detailed quotations with line items, apply discounts, get approvals, and convert to orders instantly.',
    gradient: 'from-amber-500 to-orange-400',
    glowRgb: '217,119,6',
  },
  {
    icon: <PackageCheck className="size-6" />,
    title: 'Manufacture, Track & Dispatch',
    desc: 'Generate job cards, move through production stages, track real-time status, and dispatch with full documentation.',
    gradient: 'from-emerald-500 to-teal-400',
    glowRgb: '5,150,105',
  },
];

export function HowItWorks() {
  return (
    <section className="py-28 px-6 bg-slate-50 relative overflow-hidden">
      <div className="mx-auto max-w-5xl relative">
        {/* Heading */}
        <motion.div
          initial={{ y: 24 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 text-violet-700 border border-violet-200 bg-violet-50">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 mt-2">
            Simple. Powerful. End-to-End.
          </h2>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Three steps that cover your entire manufacturing operation.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ y: 36 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65, delay: i * 0.15, ease: 'easeOut' }}
              className="relative flex flex-col items-center text-center p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all duration-300 group cursor-default"
            >
              {/* Card glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: `0 0 40px rgba(${step.glowRgb},0.10)` }}
              />
              {/* Icon */}
              <div className="relative mb-6">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-lg`}
                  style={{ boxShadow: `0 8px 28px rgba(${step.glowRgb},0.35)` }}
                >
                  {step.icon}
                </motion.div>
                <span
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ background: `rgba(${step.glowRgb},1)` }}
                >
                  {i + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 leading-snug">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
