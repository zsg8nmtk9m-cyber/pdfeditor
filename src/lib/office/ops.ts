import { strToU8, zipSync } from "fflate";
import type { ImagesToDocxOptions } from "./types";

const MAX_FILES = 30;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_TOTAL_PIXELS = 120_000_000;

interface ImageAsset {
  bytes: Uint8Array;
  extension: "jpg" | "png";
  width: number;
  height: number;
}

interface PageGeometry {
  widthTwips: number;
  heightTwips: number;
  landscape: boolean;
  imageWidthEmu: number;
  imageHeightEmu: number;
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function imageType(file: File): "jpeg" | "png" {
  const lower = file.name.toLowerCase();
  if (file.type === "image/jpeg" || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  if (file.type === "image/png" || file.type === "image/webp" || lower.endsWith(".png") || lower.endsWith(".webp")) return "png";
  throw new Error("Only JPG, PNG, and WebP images are supported.");
}

async function normalizeImage(file: File): Promise<ImageAsset> {
  const outputType = imageType(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Could not decode "${file.name}". The file may be damaged or mislabeled.`);
  }
  const { width, height } = bitmap;
  if (!width || !height || width * height > MAX_PIXELS) {
    bitmap.close();
    throw new Error(`"${file.name}" exceeds the 40-megapixel safety limit.`);
  }
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot process images in a worker.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const mime = outputType === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await canvas.convertToBlob({ type: mime, quality: 0.92 });
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    extension: outputType === "jpeg" ? "jpg" : "png",
    width,
    height,
  };
}

function geometry(asset: ImageAsset, options: ImagesToDocxOptions): PageGeometry {
  const base = options.pageSize === "a4"
    ? { width: 11906, height: 16838 }
    : { width: 12240, height: 15840 };
  const landscape = options.orientation === "landscape" ||
    (options.orientation === "auto" && asset.width > asset.height);
  const widthTwips = landscape ? base.height : base.width;
  const heightTwips = landscape ? base.width : base.height;
  const margin = Math.round(options.marginMm * 56.6929);
  const availableWidth = Math.max(720, widthTwips - margin * 2);
  const availableHeight = Math.max(720, heightTwips - margin * 2);
  const scale = Math.min(availableWidth / asset.width, availableHeight / asset.height);
  return {
    widthTwips,
    heightTwips,
    landscape,
    imageWidthEmu: Math.round(asset.width * scale * 635),
    imageHeightEmu: Math.round(asset.height * scale * 635),
  };
}

function section(page: PageGeometry, marginTwips: number, nextPage: boolean): string {
  return `<w:sectPr>${nextPage ? '<w:type w:val="nextPage"/>' : ""}<w:pgSz w:w="${page.widthTwips}" w:h="${page.heightTwips}"${page.landscape ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
}

function drawing(index: number, page: PageGeometry): string {
  const label = xml(`Image ${index + 1}`);
  const relationship = `rId${index + 1}`;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${page.imageWidthEmu}" cy="${page.imageHeightEmu}"/><wp:docPr id="${index + 1}" name="${label}" descr="${label}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index + 1}" name="${label}" descr="${label}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${page.imageWidthEmu}" cy="${page.imageHeightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

export async function imagesToDocx(
  files: File[],
  options: ImagesToDocxOptions,
  onProgress: (done: number, total: number) => void,
): Promise<Uint8Array> {
  if (files.length < 1) throw new Error("Choose at least one image.");
  if (files.length > MAX_FILES) throw new Error(`Choose no more than ${MAX_FILES} images.`);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("The selected images exceed the 100 MB total safety limit.");
  for (const file of files) {
    if (!file.size) throw new Error(`"${file.name}" is empty.`);
    if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" exceeds the 25 MB safety limit.`);
    imageType(file);
  }

  const assets: ImageAsset[] = [];
  let totalPixels = 0;
  for (let index = 0; index < files.length; index++) {
    const asset = await normalizeImage(files[index]);
    totalPixels += asset.width * asset.height;
    if (totalPixels > MAX_TOTAL_PIXELS) throw new Error("The selected images exceed the 120-megapixel total safety limit.");
    assets.push(asset);
    onProgress(index + 1, files.length + 1);
  }

  const marginTwips = Math.round(options.marginMm * 56.6929);
  const pages = assets.map((asset) => geometry(asset, options));
  const paragraphs = pages.map((page, index) =>
    `<w:p>${index < pages.length - 1 ? `<w:pPr>${section(page, marginTwips, true)}</w:pPr>` : ""}${drawing(index, page)}</w:p>`,
  ).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${paragraphs}${section(pages.at(-1)!, marginTwips, false)}</w:body></w:document>`;

  const entries: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Images</dc:title><dc:creator>Private Document Toolbox</dc:creator><dc:language>en-US</dc:language></cp:coreProperties>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Private Document Toolbox</Application><Pages>${assets.length}</Pages></Properties>`),
    "word/document.xml": strToU8(documentXml),
    "word/_rels/document.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${assets.map((asset, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${index + 1}.${asset.extension}"/>`).join("")}</Relationships>`),
  };
  assets.forEach((asset, index) => {
    entries[`word/media/image${index + 1}.${asset.extension}`] = asset.bytes;
  });
  onProgress(files.length + 1, files.length + 1);
  return zipSync(entries, { level: 6 });
}
