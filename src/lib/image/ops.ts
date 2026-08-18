import type { ImageOutputFormat, ImageWorkbenchOptions, ProcessedImage } from "./types";

const MAX_FILES = 50;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_TOTAL_PIXELS = 200_000_000;
const MAX_DIMENSION = 12_000;

function validateInput(file: File): void {
  const name = file.name.toLowerCase();
  const supported =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp" ||
    /\.(jpe?g|png|webp)$/.test(name);
  if (!supported) throw new Error(`"${file.name}" is not a supported JPG, PNG, or WebP image.`);
  if (!file.size) throw new Error(`"${file.name}" is empty.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" exceeds the 25 MB safety limit.`);
}

function outputDetails(format: ImageOutputFormat): {
  mimeType: string;
  extension: "jpg" | "png" | "webp";
} {
  if (format === "jpeg") return { mimeType: "image/jpeg", extension: "jpg" };
  if (format === "webp") return { mimeType: "image/webp", extension: "webp" };
  return { mimeType: "image/png", extension: "png" };
}

function validateOptions(options: ImageWorkbenchOptions): void {
  for (const [label, value] of [["width", options.maxWidth], ["height", options.maxHeight]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > MAX_DIMENSION) {
      throw new Error(`Maximum ${label} must be between 1 and ${MAX_DIMENSION} pixels.`);
    }
  }
  if (!Number.isFinite(options.quality) || options.quality < 0.4 || options.quality > 0.95) {
    throw new Error("Quality must be between 40% and 95%.");
  }
}

async function processImage(file: File, options: ImageWorkbenchOptions): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Could not decode "${file.name}". The file may be damaged or mislabeled.`);
  }
  const sourcePixels = bitmap.width * bitmap.height;
  if (!bitmap.width || !bitmap.height || sourcePixels > MAX_PIXELS) {
    bitmap.close();
    throw new Error(`"${file.name}" exceeds the 40-megapixel safety limit.`);
  }

  const scale = Math.min(1, options.maxWidth / bitmap.width, options.maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot process images in a worker.");
  }
  const target = outputDetails(options.format);
  if (target.mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob;
  try {
    blob = await canvas.convertToBlob({
      type: target.mimeType,
      quality: target.mimeType === "image/png" ? undefined : options.quality,
    });
  } catch {
    throw new Error(`This browser could not encode ${target.extension.toUpperCase()} output.`);
  }
  if (blob.type !== target.mimeType) {
    throw new Error(`This browser does not support ${target.extension.toUpperCase()} encoding. Choose another output format.`);
  }
  return {
    bytes: await blob.arrayBuffer(),
    mimeType: target.mimeType,
    extension: target.extension,
    width,
    height,
  };
}

export async function runImageWorkbench(
  files: File[],
  options: ImageWorkbenchOptions,
  onProgress: (done: number, total: number) => void,
): Promise<ProcessedImage[]> {
  if (files.length < 1) throw new Error("Choose at least one image.");
  if (files.length > MAX_FILES) throw new Error(`Choose no more than ${MAX_FILES} images.`);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    throw new Error("The selected images exceed the 150 MB total safety limit.");
  }
  files.forEach(validateInput);
  validateOptions(options);

  const outputs: ProcessedImage[] = [];
  let totalPixels = 0;
  for (let index = 0; index < files.length; index++) {
    const output = await processImage(files[index], options);
    totalPixels += output.width * output.height;
    if (totalPixels > MAX_TOTAL_PIXELS) {
      throw new Error("The processed images exceed the 200-megapixel total safety limit.");
    }
    outputs.push(output);
    onProgress(index + 1, files.length);
  }
  return outputs;
}
