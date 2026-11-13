/** Shrinks a photo to a JPEG data URL so a whole closet fits comfortably on the phone. */
export async function fileToDataUrl(file: Blob, maxSide = 1000, quality = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => null);
  let w: number, h: number, src: CanvasImageSource;
  if (bmp) {
    w = bmp.width;
    h = bmp.height;
    src = bmp;
  } else {
    const img = await loadImg(URL.createObjectURL(file));
    w = img.naturalWidth;
    h = img.naturalHeight;
    src = img;
  }
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = src;
  });
}

/** Splits "data:image/jpeg;base64,xxxx" into what the Claude API expects. */
export function dataUrlParts(dataUrl: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string } {
  const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(dataUrl);
  if (!m) throw new Error('Unsupported image.');
  const t = m[1] === 'image/jpg' ? 'image/jpeg' : m[1];
  return { mediaType: t as 'image/jpeg', data: m[2] };
}

/** Draws an outfit as a collage, for saving or sharing. */
export async function outfitCollage(photos: (string | undefined)[], labels: string[], title: string): Promise<Blob> {
  const n = Math.max(1, photos.length);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cell = 360;
  const pad = 24;
  const head = 90;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell + (cols + 1) * pad;
  canvas.height = head + rows * (cell + 34) + (rows + 1) * pad;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f7f5f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1d1b19';
  ctx.font = '600 38px -apple-system, system-ui, sans-serif';
  ctx.fillText(title.slice(0, 40), pad, 58);
  for (let i = 0; i < n; i++) {
    const x = pad + (i % cols) * (cell + pad);
    const y = head + pad + Math.floor(i / cols) * (cell + 34 + pad);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, cell, cell);
    const p = photos[i];
    if (p) {
      const img = await loadImg(p);
      const s = Math.min(cell / img.naturalWidth, cell / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
    }
    ctx.fillStyle = '#6b655f';
    ctx.font = '24px -apple-system, system-ui, sans-serif';
    ctx.fillText((labels[i] ?? '').slice(0, 26), x, y + cell + 28);
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}
