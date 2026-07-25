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

// A form with one field of each fillable kind, for the Fill Forms tool.
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText("Application form", { x: 60, y: 770, size: 24, font });
  const form = doc.getForm();
  const name = form.createTextField("Full Name");
  name.addToPage(page, { x: 60, y: 700, width: 220, height: 24 });
  const agree = form.createCheckBox("Agree");
  agree.addToPage(page, { x: 60, y: 650, width: 18, height: 18 });
  const color = form.createRadioGroup("Color");
  color.addOptionToPage("Red", page, { x: 60, y: 600, width: 18, height: 18 });
  color.addOptionToPage("Blue", page, { x: 120, y: 600, width: 18, height: 18 });
  const country = form.createDropdown("Country");
  country.addOptions(["Türkiye", "Germany", "Spain"]);
  country.addToPage(page, { x: 60, y: 550, width: 160, height: 22 });
  writeFileSync(join(FIX, "form.pdf"), await doc.save());
}

console.log("fixtures written to", FIX);
