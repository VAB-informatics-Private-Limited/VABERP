'use client';

import { motion } from 'framer-motion';
import {
  IconPhone, IconFileText, IconTool, IconBox,
  IconShoppingCart, IconChartBar, IconUsers, IconSettings,
} from '@tabler/icons-react';

const features = [
  {
    title: 'CRM & Enquiries',
    description: 'Capture leads, track follow-ups, and nurture customer relationships from first contact to close.',
    icon: <IconPhone size={22} />,
    color: '#7c3aed', colorRgb: '124,58,237', bg: '#f5f3ff',
  },
  {
    title: 'Quotation Builder',
    description: 'Generate professional versioned quotations and convert them to sales orders in one click.',
    icon: <IconFileText size={22} />,
    color: '#d97706', colorRgb: '217,119,6', bg: '#fffbeb',
  },
  {
    title: 'Manufacturing & Job Cards',
    description: 'Full BOM-to-dispatch workflow with job cards, production stages, and real-time tracking.',
    icon: <IconTool size={22} />,
    color: '#e11d48', colorRgb: '225,29,72', bg: '#fff1f2',
  },
  {
    title: 'Inventory Management',
    description: 'Manage raw materials, track stock levels, and maintain a complete stock ledger effortlessly.',
    icon: <IconBox size={22} />,
    color: '#059669', colorRgb: '5,150,105', bg: '#ecfdf5',
  },
  {
    title: 'Procurement',
    description: 'Handle purchase indents, manage supplier relationships, and streamline your purchasing process.',
    icon: <IconShoppingCart size={22} />,
    color: '#ea580c', colorRgb: '234,88,12', bg: '#fff7ed',
  },
  {
    title: 'Reports & Analytics',
    description: 'Charts, sales funnels, and trend analysis to keep you informed and always ahead.',
    icon: <IconChartBar size={22} />,
    color: '#db2777', colorRgb: '219,39,119', bg: '#fdf2f8',
  },
  {
    title: 'Customer Management',
    description: 'Centralised customer profiles with full history, contacts, and communication logs.',
    icon: <IconUsers size={22} />,
    color: '#ca8a04', colorRgb: '202,138,4', bg: '#fefce8',
  },
  {
    title: 'Settings & Control',
    description: 'Configure stages, units, templates, and permissions to fit exactly how your business works.',
    icon: <IconSettings size={22} />,
    color: '#475569', colorRgb: '71,85,105', bg: '#f8fafc',
  },
];

export function FeaturesSectionWithHoverEffects() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-10 max-w-7xl mx-auto">
      {features.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ y: 28 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
          className="group relative flex flex-col p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default"
        >
          {/* Hover gradient wash */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
            style={{ background: `linear-gradient(140deg, ${feature.bg} 0%, #ffffff 60%)` }}
          />
          {/* Animated bottom border */}
          <div
            className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 ease-out"
            style={{ background: `linear-gradient(90deg, ${feature.color}, transparent)` }}
          />
          {/* Icon */}
          <motion.div
            whileHover={{ scale: 1.12, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative z-10 mb-5 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: feature.bg,
              color: feature.color,
              boxShadow: `0 4px 14px rgba(${feature.colorRgb},0.2)`,
            }}
          >
            {feature.icon}
          </motion.div>
          <h3 className="relative z-10 text-sm font-semibold text-slate-900 mb-2">{feature.title}</h3>
          <p className="relative z-10 text-sm text-slate-400 leading-relaxed">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
