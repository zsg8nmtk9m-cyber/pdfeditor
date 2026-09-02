// Generates the PDF fixtures used by the e2e suite into tests/fixtures/.
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
mkdirSync(FIX, { recursive: true });

async function makePdf(name, label, pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${label} — page ${i}`, { x: 60, y: 760, size: 24, font });
    page.drawRectangle({ x: 60, y: 400, width: 300, height: 200, color: rgb(0.2, 0.4, 0.9) });
  }
  writeFileSync(join(FIX, name), await doc.save());
}

await makePdf("a.pdf", "Document A", 3);
await makePdf("b.pdf", "Document B", 2);
await makePdf("big.pdf", "Big Doc", 5);

// A deliberately risky release fixture: visible sensitive-looking text,
// metadata, an interactive form, an attachment and JavaScript.
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Client: sample@example.com", { x: 60, y: 760, size: 18, font });
  page.drawText("Test card: 4111 1111 1111 1111", { x: 60, y: 720, size: 18, font });
  page.drawText("Hidden ID: 123-45-6789", { x: 60, y: 680, size: 18, font });
  page.drawRectangle({ x: 50, y: 670, width: 300, height: 34, color: rgb(1, 1, 1) });
  doc.setTitle("Confidential client release");
  doc.setAuthor("Fixture Author");
  const field = doc.getForm().createTextField("internal.case-note");
  field.setText("Do not release");
  field.addToPage(page, { x: 60, y: 640, width: 220, height: 32 });
  await doc.attach(new TextEncoder().encode("internal attachment"), "internal.txt", {
    mimeType: "text/plain",
  });
  doc.addJavaScript("release-warning", "app.alert('internal');");
  writeFileSync(join(FIX, "release-risk.pdf"), await doc.save());
}

// A copy of a.pdf whose page 2 differs — used by the compare tool's checks.
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage([595, 842]);
    const label = i === 2 ? "Document A — page 2 REVISED" : `Document A — page ${i}`;
    page.drawText(label, { x: 60, y: 760, size: 24, font });
    page.drawRectangle({ x: 60, y: 400, width: 300, height: 200, color: rgb(0.2, 0.4, 0.9) });
  }
  writeFileSync(join(FIX, "a-revised.pdf"), await doc.save());
}

// A single-page document whose page carries /Rotate 90.
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.setRotation(degrees(90));
  page.drawText("Rotated fixture", { x: 60, y: 700, size: 20, font });
  writeFileSync(join(FIX, "rotated.pdf"), await doc.save());
}

console.log("fixtures written to", FIX);
