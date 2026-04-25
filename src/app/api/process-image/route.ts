import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const CURSOR_SIZES = [16, 24, 32, 48, 64, 128, 256];

interface ProcessOptions {
  removeBackground: boolean;
  sharpenEdges: boolean;
  normalizeAlpha: boolean;
  tint: string | null;
}

async function detectHotspot(buffer: Buffer) {
  const { data } = await sharp(buffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = (y * 32 + x) * 4;
      if (data[i + 3] > 200) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

async function removeBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const result = Buffer.from(data);

  const cornerColors: number[][] = [];
  for (let y = 0; y < Math.min(3, height); y++) {
    for (let x = 0; x < Math.min(3, width); x++) {
      const i = (y * width + x) * channels;
      cornerColors.push([data[i], data[i + 1], data[i + 2]]);
    }
  }

  const avgR = Math.round(cornerColors.reduce((s, c) => s + c[0], 0) / cornerColors.length);
  const avgG = Math.round(cornerColors.reduce((s, c) => s + c[1], 0) / cornerColors.length);
  const avgB = Math.round(cornerColors.reduce((s, c) => s + c[2], 0) / cornerColors.length);

  const isNearWhite = avgR > 220 && avgG > 220 && avgB > 220;
  const isNearBlack = avgR < 30 && avgG < 30 && avgB < 30;

  if (!isNearWhite && !isNearBlack) {
    return Buffer.from(
      await sharp(result, { raw: { width, height, channels } }).png().toBuffer()
    );
  }

  const threshold = 30;
  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [];

  const push = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * channels;
    const dr = Math.abs(data[i] - avgR);
    const dg = Math.abs(data[i + 1] - avgG);
    const db = Math.abs(data[i + 2] - avgB);
    if (dr + dg + db < threshold * 3) {
      visited[idx] = 1;
      queue.push([x, y]);
    }
  };

  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    if (cx > 0) push(cx - 1, cy);
    if (cx < width - 1) push(cx + 1, cy);
    if (cy > 0) push(cx, cy - 1);
    if (cy < height - 1) push(cx, cy + 1);
  }

  for (let i = 0; i < width * height; i++) {
    if (visited[i]) result[i * channels + 3] = 0;
  }

  return Buffer.from(
    await sharp(result, { raw: { width, height, channels } }).png().toBuffer()
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const optionsRaw = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const options: ProcessOptions = optionsRaw
      ? JSON.parse(optionsRaw)
      : { removeBackground: false, sharpenEdges: true, normalizeAlpha: false, tint: null };

    const arrayBuffer = await file.arrayBuffer();
    // eslint-disable-next-line prefer-const
    let buffer: Buffer = Buffer.from(arrayBuffer);

    const isGif = file.type === 'image/gif' || file.name.endsWith('.gif');
    const frames: string[] = [];
    let frameCount = 1;
    let frameDuration = 100;

    if (isGif) {
      buffer = Buffer.from(
        await sharp(buffer, { animated: false, page: 0 }).png().toBuffer()
      );
      try {
        const gifMeta = await sharp(Buffer.from(arrayBuffer), { animated: true }).metadata();
        frameCount = gifMeta.pages ?? 1;
        frameDuration = gifMeta.delay?.[0] ?? 100;

        for (let p = 0; p < Math.min(frameCount, 32); p++) {
          const frame = Buffer.from(
            await sharp(Buffer.from(arrayBuffer), { animated: false, page: p })
              .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer()
          );
          frames.push(frame.toString('base64'));
        }
      } catch {
        frameCount = 1;
      }
    }

    if (options.removeBackground) {
      buffer = await removeBackground(buffer);
    }

    let pipeline = sharp(buffer).ensureAlpha();

    if (options.sharpenEdges) {
      pipeline = pipeline.sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 });
    }

    if (options.normalizeAlpha) {
      pipeline = pipeline.normalize();
    }

    if (options.tint) {
      const rgb = hexToRgb(options.tint);
      if (rgb) {
        pipeline = pipeline.tint(rgb);
      }
    }

    const baseBuffer = Buffer.from(await pipeline.png().toBuffer());

    const meta = await sharp(baseBuffer).metadata();
    const origWidth = meta.width ?? 32;
    const origHeight = meta.height ?? 32;

    const sizes: { size: number; data: string }[] = [];

    for (const size of CURSOR_SIZES) {
      const resized = Buffer.from(
        await sharp(baseBuffer)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: 'lanczos3',
          })
          .png({ compressionLevel: 9, palette: false })
          .toBuffer()
      );
      sizes.push({ size, data: resized.toString('base64') });
    }

    const hotspot = await detectHotspot(
      Buffer.from(sizes.find((s) => s.size === 32)!.data, 'base64')
    );

    return NextResponse.json({
      sizes,
      hotspot,
      originalWidth: origWidth,
      originalHeight: origHeight,
      frameCount,
      frames,
      frameDuration,
      isAnimated: isGif && frameCount > 1,
    });
  } catch (err) {
    console.error('process-image error:', err);
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
  }
}
