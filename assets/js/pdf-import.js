/*
 * Extração de texto de PDFs usando pdf.js (vendorizado em assets/vendor/pdfjs,
 * sem dependência de CDN). Reconstrói linhas a partir da posição (x, y) de
 * cada fragmento de texto, para recuperar algo parecido com as linhas de uma
 * tabela, que os parsers em parsers.js sabem interpretar.
 */

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
}

async function extractPdfLines(file) {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      let rowKey = null;
      for (const existingY of rows.keys()) {
        if (Math.abs(existingY - y) <= 2) { rowKey = existingY; break; }
      }
      if (rowKey === null) rowKey = y;
      if (!rows.has(rowKey)) rows.set(rowKey, []);
      rows.get(rowKey).push({ x, str: item.str });
    }
    const sortedY = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of sortedY) {
      const items = rows.get(y).sort((a, b) => a.x - b.x);
      lines.push(items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim());
    }
  }
  return lines;
}

async function importPdfFile(file) {
  const lines = await extractPdfLines(file);
  const result = parseReportText(lines);
  return { ...result, sourceFile: file.name };
}
