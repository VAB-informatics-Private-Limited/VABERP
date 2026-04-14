'use client';

/**
 * PrintMasterTemplate — CMS-driven document layout engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ARCHITECTURE (4-layer separation)
 * ──────────────────────────────────
 * 1. TEMPLATE LAYER  — static HTML structure, only placeholders
 * 2. STYLE LAYER     — all CSS uses var(--pt-*) variables, zero hardcoded values
 * 3. CMS CONFIG      — PrintTemplateConfig drives every visual decision
 * 4. RENDER ENGINE   — merges config + document data → final HTML → PDF/print
 *
 * GRID SYSTEM (12 columns)
 * ─────────────────────────
 * Header : [3 col logo+name] [6 col title] [3 col meta]
 * Parties: [6 col from]      [6 col to]
 * Table  : [12 col full width]
 * Summary: [7 col terms]     [5 col totals]
 *
 * COLOR SYSTEM (CSS variables — set from CMS, never hardcoded)
 * ──────────────────────────────────────────────────────────────
 *   --pt-primary         primary brand color
 *   --pt-primary-light   8% tint of primary (card backgrounds)
 *   --pt-primary-border  20% tint of primary (card borders)
 *   --pt-secondary       dark color (table headers, totals highlight)
 *   --pt-accent          optional third color
 *   --pt-font            font family
 */

import React, { forwardRef } from 'react';
import { PrintTemplateConfig } from '@/types/print-template';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DocMeta {
  label: string;
  value: string;
  bold?: boolean;
  danger?: boolean;
  success?: boolean;
}

export interface PartyInfo {
  sectionLabel: string;
  name: string;
  subName?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  extra?: React.ReactNode;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

export interface SummaryRow {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
  large?: boolean;
  separator?: boolean;
}

export interface PrintMasterTemplateProps {
  config?: PrintTemplateConfig;

  // ── Header ──
  documentTitle: string;
  metaLines: DocMeta[];

  // ── Parties ──
  fromParty: PartyInfo;
  toParty: PartyInfo;

  // ── Optional info strip ──
  infoStrip?: { label: string; value: string }[];

  // ── Table ──
  tableColumns: TableColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableRows: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderCell: (row: any, colKey: string, rowIndex: number) => React.ReactNode;

  // ── Summary ──
  summaryRows: SummaryRow[];
  amountInWords?: string;
  summaryLeft?: React.ReactNode;

  // ── Overrides ──
  signatureLabel?: string;
  afterBody?: React.ReactNode;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PrintMasterTemplate = forwardRef<HTMLDivElement, PrintMasterTemplateProps>(
  (
    {
      config,
      documentTitle,
      metaLines,
      fromParty,
      toParty,
      infoStrip,
      tableColumns,
      tableRows,
      renderCell,
      summaryRows,
      amountInWords,
      summaryLeft,
      signatureLabel = 'Authorized Signature',
      afterBody,
      className,
    },
    ref,
  ) => {
    // ── ALL colors come from CMS config — nothing hardcoded ──────────────────
    const primary       = config?.primary_color   ?? '#f97316';
    const secondary     = config?.secondary_color ?? '#111827';
    const fontFamily    = config?.font_family     ?? 'Arial, Helvetica, sans-serif';
    const logoUrl       = config?.show_logo       ? (config?.logo_url ?? null)  : null;
    const companyName   = config?.company_name    ?? '';
    const alignment     = config?.header_alignment ?? 'left';   // 'left' | 'center' | 'right'
    const showSignature = config?.show_signature  ?? true;
    const showWatermark = config?.show_watermark  ?? false;
    const signatureUrl  = config?.signature_url   ?? null;

    // Compute light tints for cards (derived from primary, no hardcoding)
    const primaryLight  = hexBlend(primary, '#ffffff', 0.08);
    const primaryBorder = hexBlend(primary, '#ffffff', 0.22);

    return (
      <div ref={ref} className={`pt-root${className ? ' ' + className : ''}`} style={{ ...ROOT_STYLE, fontFamily }}>

        {/* ── STYLE LAYER: CSS variables on root, inherited by all children ── */}
        <style>{`
          /* ── CSS Custom Properties (set from CMS — never hardcoded) ── */
          .pt-root {
            --pt-primary:        ${primary};
            --pt-primary-light:  ${primaryLight};
            --pt-primary-border: ${primaryBorder};
            --pt-secondary:      ${secondary};
            --pt-font:           ${fontFamily};
          }

          /* ── Reset ── */
          .pt-root *, .pt-root *::before, .pt-root *::after {
            box-sizing: border-box; margin: 0; padding: 0;
          }
          .pt-root {
            font-family: var(--pt-font);
            font-size: 12px;
            color: #111827;
            line-height: 1.5;
          }

          /* ════════════════════════════════════════════════════
             HEADER — 12-column grid: [3fr] [6fr] [3fr]
             Layout adapts based on CMS header_alignment
             ════════════════════════════════════════════════════ */
          .pt-header {
            display: grid;
            grid-template-columns: 3fr 6fr 3fr;
            align-items: center;
            gap: 0;
            padding-bottom: 16px;
          }
          /* center layout: collapse to single column, all centered */
          .pt-header-center-layout {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .pt-header-center-layout .pt-header-left { justify-content: center; }
          .pt-header-center-layout .pt-header-right { text-align: center; }
          .pt-header-center-layout .pt-meta-row { justify-content: center; }

          .pt-header-left {
            display: flex; align-items: center; gap: 10px;
          }
          .pt-header-right { text-align: right; }

          .pt-logo {
            max-height: 64px; max-width: 140px;
            object-fit: contain; display: block;
          }
          .pt-company-name-fallback {
            font-size: 16px; font-weight: 700; color: #111827;
          }
          .pt-doc-title {
            text-align: center;
            font-size: 28px;
            font-weight: 800;
            color: var(--pt-primary);   /* ← CMS primary color */
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .pt-meta-row {
            display: flex; justify-content: flex-end;
            gap: 10px; margin-bottom: 3px;
          }
          .pt-meta-label { font-size: 11px; color: #6b7280; white-space: nowrap; }
          .pt-meta-value { font-size: 11px; font-weight: 700; color: #111827; white-space: nowrap; }

          /* ── Dividers ── */
          .pt-rule       { border: none; border-top: 1.5px solid #d1d5db; margin: 0 0 16px; }
          .pt-rule-light { border: none; border-top: 1px solid #e5e7eb;   margin: 0 0 20px; }

          /* ════════════════════════════════════════════════════
             PARTIES — 6+6 equal-height cards
             ════════════════════════════════════════════════════ */
          .pt-parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 16px;
            align-items: stretch;
          }
          .pt-party-card {
            padding: 14px 16px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            background: var(--pt-primary-light);   /* ← CMS primary light */
            border: 1px solid var(--pt-primary-border); /* ← CMS primary border */
          }
          .pt-party-section-label {
            font-size: 12px; font-weight: 700; margin-bottom: 6px;
            color: var(--pt-primary);  /* ← CMS primary color */
          }
          .pt-party-name   { font-size: 14px; font-weight: 700; color: #111827; }
          .pt-party-sub    { font-size: 12px; color: #374151; margin-top: 2px; }
          .pt-party-detail { font-size: 11px; color: #555; }
          .pt-party-badge  { font-size: 11px; color: #374151; margin-top: 3px; }

          /* ════════════════════════════════════════════════════
             INFO STRIP
             ════════════════════════════════════════════════════ */
          .pt-info-strip {
            display: flex; gap: 32px; align-items: center;
            padding: 8px 14px;
            background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;
            margin-bottom: 16px;
          }
          .pt-info-strip-item { display: flex; gap: 8px; align-items: baseline; }
          .pt-info-strip-label {
            font-size: 10px; color: #6b7280; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.5px;
          }
          .pt-info-strip-value { font-size: 12px; font-weight: 700; color: #111827; }

          /* ════════════════════════════════════════════════════
             TABLE — full 12 columns
             Zebra striping, page-break-inside: avoid on rows
             ════════════════════════════════════════════════════ */
          .pt-table-wrap { margin-bottom: 20px; }
          .pt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .pt-th {
            background: var(--pt-primary);  /* ← CMS primary color */
            color: #fff;
            padding: 9px 12px;
            font-weight: 700; font-size: 12px; white-space: nowrap;
          }
          .pt-td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
          .pt-tr-even { background: #ffffff; }
          .pt-tr-odd  { background: #fafafa; }
          .pt-td-empty { text-align: center; color: #9ca3af; font-style: italic; padding: 20px; }

          /* ════════════════════════════════════════════════════
             SUMMARY — 7fr (terms) + 5fr (totals)
             ════════════════════════════════════════════════════ */
          .pt-summary {
            display: grid;
            grid-template-columns: 7fr 5fr;
            gap: 24px;
            margin-bottom: 16px;
            align-items: flex-start;
          }
          .pt-summary-left  { min-width: 0; }
          .pt-summary-right { min-width: 0; }
          .pt-no-terms { font-size: 11px; color: #9ca3af; font-style: italic; }

          .pt-section-title {
            font-size: 12px; font-weight: 700;
            color: var(--pt-primary);  /* ← CMS primary color */
            margin-bottom: 6px; margin-top: 12px;
          }
          .pt-section-title:first-child { margin-top: 0; }
          .pt-section-body {
            font-size: 11px; color: #555; line-height: 1.6; white-space: pre-wrap;
          }

          /* ── Totals table ── */
          .pt-totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .pt-totals-highlight {
            background: var(--pt-secondary);  /* ← CMS secondary color */
            color: #fff;
          }
          .pt-totals-label  { padding: 7px 12px; color: #555; white-space: nowrap; }
          .pt-totals-highlight .pt-totals-label  { color: #e5e7eb; padding: 10px 12px; }
          .pt-totals-value  { padding: 7px 12px; text-align: right; font-weight: 600; white-space: nowrap; }
          .pt-totals-highlight .pt-totals-value  { padding: 10px 12px; }

          /* ── Amount in words ── */
          .pt-words-wrap {
            margin-top: 12px; padding: 10px 12px;
            background: var(--pt-primary-light);   /* ← CMS primary light */
            border: 1px solid var(--pt-primary-border); /* ← CMS primary border */
            border-radius: 4px;
          }
          .pt-words-label {
            font-size: 9px; color: #6b7280;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
          }
          .pt-words-value { font-size: 12px; font-weight: 600; color: #111827; line-height: 1.4; }

          /* ════════════════════════════════════════════════════
             SIGNATURE — bottom right, shown/hidden via CMS
             ════════════════════════════════════════════════════ */
          .pt-sig-row { display: flex; justify-content: flex-end; margin-bottom: 24px; }
          .pt-sig-box { text-align: center; min-width: 180px; }
          .pt-sig-img  { max-height: 52px; max-width: 160px; object-fit: contain; display: block; margin: 0 auto 4px; }
          .pt-sig-space { height: 52px; }
          .pt-sig-line  { border-top: 1px solid #374151; margin-bottom: 6px; }
          .pt-sig-label { font-size: 11px; color: #555; }

          /* ── Footer ── */
          .pt-footer { margin-top: 4px; }
          .pt-footer-rule { border: none; border-top: 1px solid #d1d5db; margin-bottom: 10px; }
          .pt-footer-text {
            text-align: center; font-size: 11px; color: #6b7280;
            white-space: pre-line; line-height: 1.6;
          }

          @media screen {
            .pt-footer { margin-top: 32px; }
          }

          /* ── Watermark ── */
          .pt-watermark {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 72px; font-weight: 900;
            color: rgba(0,0,0,0.04); pointer-events: none;
            white-space: nowrap; text-transform: uppercase;
            letter-spacing: 8px; user-select: none;
          }

          /* ════════════════════════════════════════════════════
             PRINT MEDIA — page-break rules, repeat table header
             ════════════════════════════════════════════════════ */
          @page {
            size: A4 portrait;
            margin: 20mm 16mm 28mm 16mm;
          }

          @media print {
            html, body { margin: 0 !important; padding: 0 !important; }
            .pt-root { padding: 0 !important; }
            .pt-table { page-break-inside: auto; }
            .pt-tr-even, .pt-tr-odd { page-break-inside: avoid; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .pt-parties     { page-break-inside: avoid; }
            .pt-summary     { page-break-inside: avoid; }
            .pt-sig-row     { page-break-inside: avoid; }
            .print\\:hidden { display: none !important; }

            /* Footer pinned to the very bottom of every A4 page */
            .pt-footer {
              position: fixed;
              bottom: -16mm;
              left: -16mm;
              right: -16mm;
              padding: 8px 24px 10px;
              background: #fff;
              border-top: 1px solid #d1d5db;
            }
            /* Hide the in-flow footer rule since the fixed footer has its own border */
            .pt-footer .pt-footer-rule { display: none; }
          }
        `}</style>

        {/* ════════════════════════════════════════════════════════════════
            HEADER — 12-column, layout driven by CMS header_alignment
            ════════════════════════════════════════════════════════════════ */}
        <header className={`pt-header${alignment === 'center' ? ' pt-header-center-layout' : ''}`}>
          {/* LEFT — Logo */}
          <div className="pt-header-left">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="pt-logo"
                style={{ width: config?.logo_width ?? 120 }}
              />
            ) : (
              companyName && <div className="pt-company-name-fallback">{companyName}</div>
            )}
          </div>

          {/* CENTER — Document title (always brand colored via CSS var) */}
          <div>
            <div className="pt-doc-title">{documentTitle}</div>
          </div>

          {/* RIGHT — Meta (Quotation#, Date, etc.) */}
          <div className="pt-header-right">
            {metaLines.map((m, i) => (
              <div key={i} className="pt-meta-row">
                <span className="pt-meta-label">{m.label}</span>
                <span
                  className="pt-meta-value"
                  style={{
                    color: m.danger ? '#dc2626' : m.success ? '#16a34a' : undefined,
                  }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </header>

        <hr className="pt-rule" />

        {/* ════════════════════════════════════════════════════════════════
            PARTIES — Quotation by / Quotation to (6+6 grid)
            All card styling via CSS vars — no inline colors
            ════════════════════════════════════════════════════════════════ */}
        <div className="pt-parties">
          <PartyCard party={fromParty} />
          <PartyCard party={toParty}   />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            INFO STRIP (optional — e.g. Place of Supply)
            ════════════════════════════════════════════════════════════════ */}
        {infoStrip && infoStrip.length > 0 && (
          <div className="pt-info-strip">
            {infoStrip.map((item, i) => (
              <div key={i} className="pt-info-strip-item">
                <span className="pt-info-strip-label">{item.label}</span>
                <span className="pt-info-strip-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TABLE — full width, brand-colored header, zebra body
            thead { display: table-header-group } repeats on page breaks
            ════════════════════════════════════════════════════════════════ */}
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead>
              <tr>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    className="pt-th"
                    style={{
                      textAlign: col.align ?? 'left',
                      width: col.width ?? undefined,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={row.id ?? ri} className={ri % 2 === 0 ? 'pt-tr-even' : 'pt-tr-odd'}>
                  {tableColumns.map((col) => (
                    <td
                      key={col.key}
                      className="pt-td"
                      style={{ textAlign: col.align ?? 'left' }}
                    >
                      {renderCell(row, col.key, ri)}
                    </td>
                  ))}
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="pt-td pt-td-empty" colSpan={tableColumns.length}>No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SUMMARY — 7fr terms/notes | 5fr totals
            ════════════════════════════════════════════════════════════════ */}
        <div className="pt-summary">
          <div className="pt-summary-left">
            {summaryLeft ?? <div className="pt-no-terms">—</div>}
          </div>

          <div className="pt-summary-right">
            <table className="pt-totals-table">
              <tbody>
                {summaryRows.map((row, i) => (
                  <tr
                    key={i}
                    className={row.highlight ? 'pt-totals-highlight' : ''}
                    style={row.separator ? { borderTop: `2px solid #111827` } : undefined}
                  >
                    <td
                      className="pt-totals-label"
                      style={{
                        fontSize: row.large ? 15 : undefined,
                        fontWeight: row.highlight ? 700 : undefined,
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      className="pt-totals-value"
                      style={{
                        color: row.valueColor,
                        fontSize: row.large ? 15 : undefined,
                        fontWeight: row.highlight || row.large ? 700 : undefined,
                      }}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {amountInWords && (
              <div className="pt-words-wrap">
                <div className="pt-words-label">Amount in words</div>
                <div className="pt-words-value">{amountInWords}</div>
              </div>
            )}
          </div>
        </div>

        {afterBody}

        <hr className="pt-rule pt-rule-light" />

        {/* ════════════════════════════════════════════════════════════════
            SIGNATURE — controlled by CMS show_signature toggle
            Uses signature_url image if uploaded, else blank line
            ════════════════════════════════════════════════════════════════ */}
        {showSignature && (
          <div className="pt-sig-row">
            <div className="pt-sig-box">
              {signatureUrl ? (
                <img src={signatureUrl} alt="Signature" className="pt-sig-img" />
              ) : (
                <div className="pt-sig-space" />
              )}
              <div className="pt-sig-line" />
              <div className="pt-sig-label">{signatureLabel}</div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            FOOTER — controlled by CMS show_footer + footer_text
            ════════════════════════════════════════════════════════════════ */}
        {config?.show_footer && config?.footer_text && (
          <footer className="pt-footer">
            <div className="pt-footer-rule" />
            <div className="pt-footer-text">{config.footer_text}</div>
          </footer>
        )}

        {/* ── Watermark — controlled by CMS show_watermark ── */}
        {showWatermark && config?.watermark_text && (
          <div className="pt-watermark">{config.watermark_text}</div>
        )}
      </div>
    );
  },
);

PrintMasterTemplate.displayName = 'PrintMasterTemplate';

// ─── Party Card — uses only CSS class styles, zero inline colors ──────────────

function PartyCard({ party }: { party: PartyInfo }) {
  return (
    <div className="pt-party-card">
      <div className="pt-party-section-label">{party.sectionLabel}</div>
      <div className="pt-party-name">{party.name}</div>
      {party.subName  && <div className="pt-party-sub">{party.subName}</div>}
      {party.address  && <div className="pt-party-detail" style={{ whiteSpace: 'pre-line' }}>{party.address}</div>}
      {party.phone    && <div className="pt-party-detail">Ph: {party.phone}</div>}
      {party.email    && <div className="pt-party-detail">Email: {party.email}</div>}
      {party.gstin    && <div className="pt-party-badge"><strong>GSTIN</strong>&nbsp;{party.gstin}</div>}
      {party.pan      && <div className="pt-party-badge"><strong>PAN</strong>&nbsp;{party.pan}</div>}
      {party.cin      && <div className="pt-party-badge"><strong>CIN</strong>&nbsp;{party.cin}</div>}
      {party.extra}
    </div>
  );
}

// ─── Root container style ─────────────────────────────────────────────────────

const ROOT_STYLE: React.CSSProperties = {
  background: '#fff',
  maxWidth: 860,
  margin: '0 auto',
  padding: '32px 40px',
  boxSizing: 'border-box',
  position: 'relative',
};

// ─── Color blending helper — computes tints from CMS primary color ────────────
// No magic numbers; all derived from the primary color itself.

function hexBlend(hex: string, onto: string, alpha: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(onto);
  const r = Math.round(r1 * alpha + r2 * (1 - alpha));
  const g = Math.round(g1 * alpha + g2 * (1 - alpha));
  const b = Math.round(b1 * alpha + b2 * (1 - alpha));
  return `rgb(${r},${g},${b})`;
}
