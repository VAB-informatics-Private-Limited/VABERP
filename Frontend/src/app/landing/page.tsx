'use client';

import Link from 'next/link';
import { Button, Card, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import EnhancedBackgroundPaths from '@/components/ui/modern-background-paths';
import { FeaturesSectionWithHoverEffects } from '@/components/ui/feature-section-with-hover-effects';
import { HowItWorks } from '@/components/ui/features-4';
import { FeatureCarousel } from '@/components/ui/feature-carousel';
import { Cta4 } from '@/components/ui/cta-4';

const { Title, Text, Paragraph } = Typography;




export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(22,119,255,0.1)',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="VAB Informatics" className="w-8 h-8 object-contain flex-shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-gray-900 text-base tracking-tight">VAB Informatics</span>
            <span className="text-gray-500 text-[10px] tracking-widest uppercase">Private Limited</span>
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.03] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #1677ff, #0ea5e9)',
            boxShadow: '0 2px 12px rgba(22,119,255,0.35)',
            textDecoration: 'none',
          }}
        >
          Login →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-16">
        <EnhancedBackgroundPaths
          title="Modern Manufacturing"
          subtitle="From lead capture to product dispatch — manage your entire manufacturing business with one powerful, integrated platform."
          primaryCta={{ label: "Get Started", href: "/register" }}
        />
      </section>

      {/* ── Features Grid ── */}
      <section className="bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center pt-20 pb-4">
            <Title level={2} className="!text-3xl md:!text-4xl !font-bold !text-gray-900 !mb-3">
              Everything You Need, In One Place
            </Title>
            <Paragraph className="text-gray-400 text-base max-w-xl mx-auto">
              Purpose-built modules for every part of your manufacturing business.
            </Paragraph>
          </div>
          <FeaturesSectionWithHoverEffects />
        </div>
      </section>

      {/* ── How It Works ── */}
      <HowItWorks />

      {/* ── Modules Overview ── */}
      <section className="py-10 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <Title level={2} className="!text-3xl md:!text-4xl !font-semibold !text-gray-900 !mb-3">
              All Modules at a Glance
            </Title>
            <Paragraph className="text-gray-400 text-base max-w-md mx-auto">
              Every module works together seamlessly across your entire operation.
            </Paragraph>
          </div>
          <FeatureCarousel />
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <Cta4
        title="Ready to streamline your operations?"
        description="Join manufacturers already using VAB Enterprise to run smarter, faster, and leaner."
        buttonText="Get Started Free"
        buttonUrl="/register"
        items={[
          "End-to-end manufacturing management",
          "Sales, CRM & quotation tools",
          "Inventory & procurement control",
          "Job card & dispatch tracking",
          "Role-based team permissions",
        ]}
      />

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="VAB Informatics" className="w-7 h-7 object-contain flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-gray-200 text-sm tracking-tight">VAB Informatics</span>
              <span className="text-gray-500 text-[9px] tracking-widest uppercase">Private Limited</span>
            </div>
          </div>
          <span className="text-sm">© 2025 VAB Enterprise. All rights reserved.</span>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
