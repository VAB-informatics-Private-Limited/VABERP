'use client';

import { Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
  prefix?: string;
  color?: string;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function KpiCard({
  title,
  value,
  icon,
  loading = false,
  trend,
  suffix,
  prefix,
  color = '#1677ff',
}: KpiCardProps) {
  const rgb = hexToRgb(color);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03), 0 2px 8px -2px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        cursor: 'default',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px 0 rgba(0,0,0,0.06), 0 8px 24px -8px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.03), 0 2px 8px -2px rgba(0,0,0,0.04)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
            margin: '0 0 8px 0',
          }}>
            {title}
          </p>
          {loading ? (
            <Spin size="small" />
          ) : (
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}>
              {prefix && <span style={{ fontSize: '20px', marginRight: '2px' }}>{prefix}</span>}
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix && <span style={{ fontSize: '16px', marginLeft: '4px', color: '#64748b' }}>{suffix}</span>}
            </div>
          )}
          {trend && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '8px',
              fontSize: '12px',
              color: trend.isPositive ? '#16a34a' : '#dc2626',
            }}>
              {trend.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span style={{ marginLeft: '4px' }}>{trend.value}%</span>
              <span style={{ color: '#94a3b8', marginLeft: '4px' }}>vs last month</span>
            </div>
          )}
        </div>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
          background: `rgba(${rgb}, 0.10)`,
          color: color,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
