'use client';

import { useBrandingStore } from '@/stores/brandingStore';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = useBrandingStore((s) => s.branding);

  const bgStyle: React.CSSProperties = branding?.login_bg_image_url
    ? { backgroundImage: `url(${branding.login_bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="login-container" style={bgStyle}>
      {children}
    </div>
  );
}
