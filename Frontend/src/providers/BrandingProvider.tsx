'use client';

import { useEffect, useMemo } from 'react';
import { ConfigProvider } from 'antd';
import { useBrandingStore } from '@/stores/brandingStore';
import { DEFAULT_BRANDING } from '@/types/branding';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function lighten(hex: string, amount = 0.9): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#e6f0ff';
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const stored = useBrandingStore((s) => s.branding);

  const colors = useMemo(() => ({
    primaryColor: stored?.primary_color || DEFAULT_BRANDING.primary_color,
    secondaryColor: stored?.secondary_color || DEFAULT_BRANDING.secondary_color,
    colorBgLayout: stored?.color_bg_layout || DEFAULT_BRANDING.color_bg_layout,
    fontFamily: stored?.font_family || DEFAULT_BRANDING.font_family,
    borderRadius: stored?.border_radius ?? DEFAULT_BRANDING.border_radius,
    appName: stored?.app_name || DEFAULT_BRANDING.app_name,
    faviconUrl: stored?.favicon_url || DEFAULT_BRANDING.favicon_url,
  }), [stored]);

  // Set CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primaryColor);
    root.style.setProperty('--color-primary-light', lighten(colors.primaryColor, 0.9));
    root.style.setProperty('--color-bg-layout', colors.colorBgLayout);
    root.style.setProperty('--color-secondary', colors.secondaryColor);
  }, [colors]);

  // Dynamic document title
  useEffect(() => {
    if (colors.appName) {
      document.title = colors.appName;
    }
  }, [colors.appName]);

  // Dynamic favicon
  useEffect(() => {
    if (colors.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = colors.faviconUrl;
    }
  }, [colors.faviconUrl]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colors.primaryColor,
          borderRadius: colors.borderRadius,
          colorBgContainer: '#ffffff',
          colorBgLayout: colors.colorBgLayout,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03), 0 2px 8px -2px rgba(0,0,0,0.05)',
          fontFamily: `${colors.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorText: '#1e293b',
          colorTextSecondary: '#64748b',
          colorTextTertiary: '#94a3b8',
          colorLink: '#7c3aed',
          colorLinkHover: '#6d28d9',
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          colorInfo: '#1e40af',
          fontSize: 14,
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#1e3a8a',
            rowHoverBg: '#faf5ff',
            borderColor: '#f1f5f9',
          },
          Card: {
            paddingLG: 24,
          },
          Input: {
            activeBorderColor: '#7c3aed',
            hoverBorderColor: '#a78bfa',
          },
          Select: {
            optionSelectedBg: '#f5f3ff',
          },
          Badge: {
            colorBgContainer: '#ffffff',
          },
          Switch: {
            colorPrimary: '#7c3aed',
            colorPrimaryHover: '#6d28d9',
          },
          Segmented: {
            itemSelectedBg: '#1e40af',
            itemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
