import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VAB Enterprise — The Complete ERP for Modern Manufacturing',
  description: 'Streamline your manufacturing operations with CRM, quotations, job cards, inventory, procurement, and more.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
