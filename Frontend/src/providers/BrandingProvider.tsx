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

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount = 0.9): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#e6f0ff';
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return rgbToHex(r, g, b);
}

function darken(hex: string, amount = 0.15): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return rgbToHex(r, g, b);
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const stored = useBrandingStore((s) => s.branding);

  // Branding is driven by exactly two user inputs: primary + secondary.
  // Everything else (accent, sidebar bg/text, layout bg) is derived deterministically.
  const colors = useMemo(() => {
    const primary = stored?.primary_color || DEFAULT_BRANDING.primary_color;
    const secondary = stored?.secondary_color || DEFAULT_BRANDING.secondary_color;
    return {
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: primary,                // derived
      colorBgLayout: '#f1f5f9',            // fixed neutral
      sidebarBgColor: '#ffffff',           // fixed white
      sidebarTextColor: secondary,         // derived
      fontFamily: stored?.font_family || DEFAULT_BRANDING.font_family,
      borderRadius: stored?.border_radius ?? DEFAULT_BRANDING.border_radius,
      appName: stored?.app_name || DEFAULT_BRANDING.app_name,
      faviconUrl: stored?.favicon_url || DEFAULT_BRANDING.favicon_url,
    };
  }, [stored]);

  // Set CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const primary = colors.primaryColor;
    const primaryDark = darken(primary, 0.15);
    const primaryDarker = darken(primary, 0.3);
    const primaryHover = darken(primary, 0.08);
    const primaryBorder = lighten(primary, 0.55);
    const primarySoft = lighten(primary, 0.85);
    const primarySofter = lighten(primary, 0.93);
    const primaryFaint = lighten(primary, 0.97);

    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-hover', primaryHover);
    root.style.setProperty('--color-primary-dark', primaryDark);
    root.style.setProperty('--color-primary-darker', primaryDarker);
    root.style.setProperty('--color-primary-border', primaryBorder);
    root.style.setProperty('--color-primary-light', primarySoft);
    root.style.setProperty('--color-primary-soft', primarySofter);
    root.style.setProperty('--color-primary-faint', primaryFaint);
    root.style.setProperty('--color-primary-rgba-10', rgba(primary, 0.1));
    root.style.setProperty('--color-primary-rgba-20', rgba(primary, 0.2));
    root.style.setProperty('--color-primary-rgba-25', rgba(primary, 0.25));
    root.style.setProperty('--color-bg-layout', colors.colorBgLayout);
    root.style.setProperty('--color-secondary', colors.secondaryColor);
    root.style.setProperty('--color-secondary-soft', lighten(colors.secondaryColor, 0.92));
    root.style.setProperty('--color-accent', colors.accentColor);
    root.style.setProperty('--color-accent-hover', darken(colors.accentColor, 0.1));
    root.style.setProperty('--color-accent-light', lighten(colors.accentColor, 0.85));
    root.style.setProperty('--color-accent-soft', lighten(colors.accentColor, 0.93));
    root.style.setProperty('--color-accent-rgba-20', rgba(colors.accentColor, 0.2));
    root.style.setProperty('--sidebar-bg', colors.sidebarBgColor);
    root.style.setProperty('--sidebar-text', colors.sidebarTextColor);
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

  const primary = colors.primaryColor;
  const primaryHover = darken(primary, 0.08);
  const primaryDark = darken(primary, 0.15);
  const primaryDarker = darken(primary, 0.3);
  const primaryBorder = lighten(primary, 0.55);
  const primarySoft = lighten(primary, 0.85);
  const primarySofter = lighten(primary, 0.93);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primary,
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
          colorLink: primary,
          colorLinkHover: primaryHover,
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          colorInfo: primary,
          fontSize: 14,
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: primaryDarker,
            rowHoverBg: primarySofter,
            borderColor: '#f1f5f9',
          },
          Card: {
            paddingLG: 24,
          },
          Input: {
            activeBorderColor: primary,
            hoverBorderColor: primaryBorder,
          },
          Select: {
            optionSelectedBg: primarySofter,
          },
          Badge: {
            colorBgContainer: '#ffffff',
          },
          Switch: {
            colorPrimary: primary,
            colorPrimaryHover: primaryHover,
          },
          Segmented: {
            itemSelectedBg: primary,
            itemSelectedColor: '#ffffff',
          },
          Button: {
            primaryShadow: `0 2px 4px ${rgba(primary, 0.2)}`,
          },
          Tabs: {
            itemActiveColor: primary,
            itemSelectedColor: primary,
            itemHoverColor: primaryHover,
            inkBarColor: primary,
          },
          Menu: {
            itemSelectedBg: primarySofter,
            itemSelectedColor: primaryDark,
            itemHoverBg: primarySofter,
            itemHoverColor: primaryDark,
          },
          Radio: {
            buttonSolidCheckedActiveBg: primary,
            buttonSolidCheckedBg: primary,
          },
          Checkbox: {
            colorPrimary: primary,
            colorPrimaryHover: primaryHover,
          },
          Pagination: {
            itemActiveBg: primarySofter,
          },
          Steps: {
            colorPrimary: primary,
          },
          Slider: {
            handleColor: primary,
            trackBg: primary,
            trackHoverBg: primaryHover,
          },
          Progress: {
            defaultColor: primary,
          },
          DatePicker: {
            activeBorderColor: primary,
            hoverBorderColor: primaryBorder,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
