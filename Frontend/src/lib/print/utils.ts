import dayjs from 'dayjs';

// ─── Number formatter — Indian locale ────────────────────────────────────────
export const fmt = (v: number | string | null | undefined): string => {
  const n = Number(v ?? 0);
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Date formatter ───────────────────────────────────────────────────────────
export const fmtDate = (d?: string | null, format = 'DD MMM YYYY'): string => {
  if (!d) return '—';
  return dayjs(d).format(format).toUpperCase();
};

// ─── Amount in words — Indian number system ───────────────────────────────────
export function amountInWords(amount: number | string | null | undefined): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function threeDigits(n: number): string {
    if (n === 0) return '';
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
  }

  const n = Math.round(Number(amount ?? 0));
  if (isNaN(n) || n === 0) return 'Zero Rupees Only';

  const crore    = Math.floor(n / 10_000_000);
  const lakh     = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const remainder = n % 1_000;

  let result = '';
  if (crore)    result += threeDigits(crore)    + ' Crore ';
  if (lakh)     result += threeDigits(lakh)      + ' Lakh ';
  if (thousand) result += threeDigits(thousand)  + ' Thousand ';
  if (remainder) result += threeDigits(remainder);

  return result.trim() + ' Rupees Only';
}

// ─── PDF downloader — shared across all print pages ──────────────────────────
export async function downloadAsPDF(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf()
    .set({
      margin: 0,
      filename,
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save();
}
