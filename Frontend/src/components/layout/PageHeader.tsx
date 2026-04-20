'use client';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // Action buttons on the right
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="page-header-banner">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="page-header-banner-title">{title}</h1>
          {subtitle && <p className="page-header-banner-subtitle">{subtitle}</p>}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
