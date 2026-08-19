import type {
  ImageCropMode,
  ImageOutputFormat,
  ImageWorkbenchOptions,
  ProcessedImage,
} from "./types";

const MAX_FILES = 50;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_TOTAL_PIXELS = 200_000_000;
const MAX_DIMENSION = 12_000;

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

function cropRect(width: number, height: number, mode: ImageCropMode): CropRect {
  const ratio = mode === "square" ? 1 : mode === "4:3" ? 4 / 3 : mode === "16:9" ? 16 / 9 : null;
  if (!ratio) return { x: 0, y: 0, width, height };
  const sourceRatio = width / height;
  if (sourceRatio > ratio) {
    const cropWidth = height * ratio;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / ratio;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

function drawTransformed(
  context: OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  source: CropRect,
  scaledWidth: number,
  scaledHeight: number,
  rotation: 0 | 90 | 180 | 270,
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (rotation === 90) {
    context.translate(canvasWidth, 0);
    context.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    context.translate(canvasWidth, canvasHeight);
    context.rotate(Math.PI);
  } else if (rotation === 270) {
    context.translate(0, canvasHeight);
    context.rotate(-Math.PI / 2);
  }
  context.drawImage(
    bitmap,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    scaledWidth,
    scaledHeight,
  );
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

  const source = cropRect(bitmap.width, bitmap.height, options.crop);
  const swapsAxes = options.rotation === 90 || options.rotation === 270;
  const orientedWidth = swapsAxes ? source.height : source.width;
  const orientedHeight = swapsAxes ? source.width : source.height;
  const scale = Math.min(1, options.maxWidth / orientedWidth, options.maxHeight / orientedHeight);
  const outputWidth = Math.max(1, Math.round(orientedWidth * scale));
  const outputHeight = Math.max(1, Math.round(orientedHeight * scale));
  const scaledWidth = swapsAxes ? outputHeight : outputWidth;
  const scaledHeight = swapsAxes ? outputWidth : outputHeight;

  const canvas = new OffscreenCanvas(outputWidth, outputHeight);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser cannot process images in a worker.");
  }
  const target = outputDetails(options.format);
  if (target.mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputWidth, outputHeight);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawTransformed(
    context,
    bitmap,
    source,
    scaledWidth,
    scaledHeight,
    options.rotation,
    outputWidth,
    outputHeight,
  );
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
    width: outputWidth,
    height: outputHeight,
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
