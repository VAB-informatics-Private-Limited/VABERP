import dayjs from 'dayjs';

export type ExportColumn<T> = { key: keyof T; title: string };

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
) {
  if (data.length === 0) {
    return;
  }

  // Create header row
  const headers = columns.map((col) => col.title).join(',');

  // Create data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Handle strings with commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',')
  );

  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function buildTableHTML<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string,
): string {
  const dateStr = dayjs().format('DD MMM YYYY, hh:mm A');
  const headerCells = columns.map((col) => `<th>${col.title}</th>`).join('');
  const bodyRows = data
    .map((item, idx) => {
      const cells = columns
        .map((col) => {
          const val = item[col.key];
          return `<td>${val !== null && val !== undefined ? String(val) : '-'}</td>`;
        })
        .join('');
      return `<tr class="${idx % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
    })
    .join('');

  return `
    <div class="pdf-container">
      <div class="pdf-header">
        <h2>${title}</h2>
        <p class="date">Generated on ${dateStr} &bull; Total Records: ${data.length}</p>
      </div>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

const PDF_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #1a1a1a; }
  .pdf-container { padding: 20px; }
  .pdf-header { margin-bottom: 16px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
  .pdf-header h2 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .pdf-header .date { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background-color: #f0f0f0; font-weight: 600; text-align: left; padding: 7px 8px; border: 1px solid #d0d0d0; white-space: nowrap; }
  td { padding: 6px 8px; border: 1px solid #e0e0e0; word-break: break-word; }
  tr.odd td { background-color: #fafafa; }
  tr.even td { background-color: #fff; }
  @media print {
    .pdf-container { padding: 0; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
`;

/**
 * Export data to PDF file using html2pdf.js
 */
export async function exportToPDF<T extends object>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[],
  title: string,
) {
  if (data.length === 0) return;

  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.innerHTML = `<style>${PDF_STYLES}</style>${buildTableHTML(data, columns, title)}`;
  document.body.appendChild(container);

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: `${filename}_${dayjs().format('YYYY-MM-DD')}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: columns.length > 6 ? 'landscape' as const : 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt as any).from(container).save();
  document.body.removeChild(container);
}

/**
 * Print data - opens browser print dialog with formatted table
 */
export function printData<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string,
) {
  if (data.length === 0) return;

  const orientation = columns.length > 6 ? 'landscape' : 'portrait';
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4 ${orientation}; margin: 12mm; }
        ${PDF_STYLES}
      </style>
    </head>
    <body>
      ${buildTableHTML(data, columns, title)}
      <script>
        window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
