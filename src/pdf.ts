/** PDF policies are read up to this size; a larger file stays unread. */
export const MAX_PDF_BYTES = 5_000_000;
const MAX_PAGES = 60;
const MAX_CHARS = 500_000;

/** Whether the bytes are a PDF: "%PDF-" within the first kilobyte, as readers accept it. */
export function isPdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  return head.includes('%PDF-');
}

/**
 * The text of a PDF, page by page, or undefined when it can't be read (not a PDF, encrypted,
 * broken). Uses pdf.js without evaluating code from the file and without loading fonts: only the
 * text is needed.
 */
export async function pdfText(bytes: Uint8Array): Promise<string | undefined> {
  if (!isPdf(bytes)) return undefined;
  // Loaded on demand: most scans never meet a PDF policy.
  const { getDocument, VerbosityLevel } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    // pdf.js takes ownership of the buffer; give it a copy.
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: VerbosityLevel.ERRORS,
  });
  try {
    const document = await task.promise;
    const pages: string[] = [];
    let length = 0;
    for (let number = 1; number <= Math.min(document.numPages, MAX_PAGES); number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : ''))
        .join('')
        .replace(/[ \t]+/g, ' ')
        .trim();
      page.cleanup();
      pages.push(text);
      length += text.length;
      if (length >= MAX_CHARS) break;
    }
    const text = pages.join('\n').slice(0, MAX_CHARS).trim();
    return text === '' ? undefined : text;
  } catch {
    return undefined;
  } finally {
    await task.destroy();
  }
}
