'use client';

import { useBrandingStore } from '@/stores/brandingStore';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = useBrandingStore((s) => s.branding);
  const bgUrl = branding?.login_bg_image_url || '/login-bg.jpg';

  return (
    <div className="auth-shell">
      <div
        className="auth-bg"
        style={{ backgroundImage: `url(${bgUrl})` }}
        aria-hidden
      />
      <div className="auth-bg-veil" aria-hidden />
      <div className="auth-content">
        {children}
      </div>
    </div>
  );
}
