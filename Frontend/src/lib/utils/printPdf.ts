/**
 * Client-side PDF generation and print utilities.
 * Uses html2pdf.js for PDF export from DOM elements.
 */

interface PdfOptions {
  filename?: string;
  /** Element selector or ref to capture. Defaults to '.printable-area' */
  element?: HTMLElement | string;
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Show loading message via Ant Design message */
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Generate and download a PDF from a DOM element.
 * Dynamically imports html2pdf.js to keep the bundle lean.
 */
export async function downloadPdf(options: PdfOptions = {}) {
  const {
    filename = 'document.pdf',
    element,
    orientation = 'portrait',
    onStart,
    onSuccess,
    onError,
  } = options;

  try {
    onStart?.();

    // Resolve element
    let target: HTMLElement | null = null;
    if (element instanceof HTMLElement) {
      target = element;
    } else if (typeof element === 'string') {
      target = document.querySelector(element);
    } else {
      target = document.querySelector('.printable-area');
    }

    if (!target) {
      throw new Error('Printable element not found');
    }

    // Dynamically import html2pdf.js
    const html2pdf = (await import('html2pdf.js')).default;

    const opt = {
      margin: [10, 10, 15, 10] as [number, number, number, number],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation,
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as string[] },
    };

    await html2pdf().set(opt as any).from(target).save();

    onSuccess?.();
  } catch (error) {
    console.error('PDF generation failed:', error);
    onError?.(error);
  }
}

/**
 * Trigger browser print for the current page.
 * The @media print CSS in globals.css handles hiding sidebar/header.
 */
export function printPage() {
  window.print();
}
