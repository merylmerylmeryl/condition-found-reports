import type { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';

interface Row {
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  created_at: Date;
  ai_suggestion: { severity: string; category: string; summary: string } | null;
}

// Streams straight into the HTTP response, so memory stays flat even for thousands of rows.
// Layout is deliberately a simple report-style list; pdfkit has no table primitive and a
// table plugin would be a dependency for little gain.
export function writeCfrPdf(rows: Row[], out: Writable) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(out);

  doc.fontSize(18).text('Condition Found Reports');
  doc
    .fontSize(9)
    .fillColor('#555')
    .text(`Generated ${new Date().toISOString()} · ${rows.length} report(s)`)
    .fillColor('#000')
    .moveDown();

  if (!rows.length) doc.fontSize(11).text('No reports match the current filters.');

  for (const r of rows) {
    // Keep each entry together: start a new page if there isn't room for the header lines.
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').text(r.title);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555')
      .text(
        `${r.severity.toUpperCase()} · ${r.status.replace('_', ' ')} · ${r.location} · ${r.created_at.toISOString()}`,
      )
      .fillColor('#000');
    if (r.description) doc.fontSize(10).text(r.description);
    if (r.ai_suggestion) {
      const a = r.ai_suggestion;
      doc.fontSize(9).fillColor('#2459d6').text(`AI suggestion: ${a.severity} · ${a.category} · ${a.summary}`).fillColor('#000');
    }
    doc.moveDown(0.8);
  }

  doc.end();
}
