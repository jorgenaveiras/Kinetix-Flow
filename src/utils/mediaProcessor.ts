import { KeyframeItem, MediaMetadata, OpticalMetrics } from '../types';

export function calculateAspectRatioLabel(width: number, height: number): string {
  if (!width || !height) return '16:9';
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.12) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.12) return '9:16';
  if (Math.abs(ratio - 4 / 3) < 0.12) return '4:3';
  if (Math.abs(ratio - 3 / 4) < 0.12) return '3:4';
  if (Math.abs(ratio - 1) < 0.08) return '1:1';
  if (Math.abs(ratio - 21 / 9) < 0.18) return '21:9';
  if (Math.abs(ratio - 3 / 2) < 0.1) return '3:2';
  return `${width}:${height}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function analyzeCanvasOptics(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): OpticalMetrics {
  try {
    const imgData = ctx.getImageData(0, 0, width, height).data;
    let totalLum = 0;
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalSat = 0;
    let darkPixels = 0;
    let brightPixels = 0;
    let count = 0;

    const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

    for (let i = 0; i < imgData.length; i += 16) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];
      if (a < 128) continue;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLum += lum;
      totalR += r;
      totalG += g;
      totalB += b;

      if (lum < 55) darkPixels++;
      if (lum > 200) brightPixels++;

      const maxC = Math.max(r, g, b) / 255;
      const minC = Math.min(r, g, b) / 255;
      const l = (maxC + minC) / 2;
      const sat = maxC === minC ? 0 : (maxC - minC) / (1 - Math.abs(2 * l - 1));
      totalSat += sat;
      count++;

      const qr = Math.round(r / 36) * 36;
      const qg = Math.round(g / 36) * 36;
      const qb = Math.round(b / 36) * 36;
      const key = `${qr},${qg},${qb}`;
      if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
      buckets[key].r += r;
      buckets[key].g += g;
      buckets[key].b += b;
      buckets[key].count += 1;
    }

    const avgLuminance = count > 0 ? Math.round(totalLum / count) : 110;
    const avgR = count > 0 ? totalR / count : 128;
    const avgB = count > 0 ? totalB / count : 128;
    const avgSat = count > 0 ? totalSat / count : 0.35;

    // Contrast & key classification
    const darkRatio = count > 0 ? darkPixels / count : 0.3;
    const brightRatio = count > 0 ? brightPixels / count : 0.15;
    let contrastLevel: OpticalMetrics['contrastLevel'] = 'balanced';
    if (darkRatio > 0.45) {
      contrastLevel = 'low-key';
    } else if (brightRatio > 0.4) {
      contrastLevel = 'high-key';
    } else if (darkRatio > 0.25 && brightRatio > 0.2) {
      contrastLevel = 'high-contrast';
    }

    // Color temperature estimation from R/B ratio
    const rbRatio = (avgR + 10) / (avgB + 10);
    let colorTempKelvin = 5200;
    let colorTempLabel = '5200K (Luz Día Natural Balanceada)';
    if (rbRatio > 1.25) {
      colorTempKelvin = 3100;
      colorTempLabel = '3100K (Cálida · Hora Dorada / Tungsteno)';
    } else if (rbRatio > 1.08) {
      colorTempKelvin = 4200;
      colorTempLabel = '4200K (Cálida Suave · Sol de Tarde)';
    } else if (rbRatio < 0.85) {
      colorTempKelvin = 6800;
      colorTempLabel = '6800K (Fría · Hora Azul / Sombra Atmosférica)';
    } else if (rbRatio < 0.95) {
      colorTempKelvin = 6000;
      colorTempLabel = '6000K (Luz Día Fría / Nublado Difuso)';
    }

    let saturationLevel: OpticalMetrics['saturationLevel'] = 'natural';
    if (avgSat < 0.22) saturationLevel = 'desaturated';
    else if (avgSat > 0.48) saturationLevel = 'vibrant';

    // Estimate center vs edge sharpness to infer depth of field (bokeh)
    let centerGrad = 0;
    let edgeGrad = 0;
    let centerCount = 0;
    let edgeCount = 0;
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4;
        const idxRight = (y * width + (x + 1)) * 4;
        const idxDown = ((y + 1) * width + x) * 4;
        const gx = Math.abs(imgData[idx] - imgData[idxRight]);
        const gy = Math.abs(imgData[idx] - imgData[idxDown]);
        const grad = gx + gy;

        const inCenter =
          x > width * 0.25 && x < width * 0.75 && y > height * 0.25 && y < height * 0.75;
        if (inCenter) {
          centerGrad += grad;
          centerCount++;
        } else {
          edgeGrad += grad;
          edgeCount++;
        }
      }
    }
    const avgCenterGrad = centerCount > 0 ? centerGrad / centerCount : 15;
    const avgEdgeGrad = edgeCount > 0 ? edgeGrad / edgeCount : 12;
    let depthOfFieldEstimate: OpticalMetrics['depthOfFieldEstimate'] = 'medium-selective';
    if (avgCenterGrad > avgEdgeGrad * 1.45) {
      depthOfFieldEstimate = 'shallow-bokeh';
    } else if (avgEdgeGrad >= avgCenterGrad * 0.9) {
      depthOfFieldEstimate = 'deep-focus';
    }

    const dominantColors = Object.values(buckets)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => {
        const r = Math.min(255, Math.round(item.r / item.count));
        const g = Math.min(255, Math.round(item.g / item.count));
        const b = Math.min(255, Math.round(item.b / item.count));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
          .toString(16)
          .padStart(2, '0')}`.toUpperCase();
      });

    return {
      avgLuminance,
      contrastLevel,
      colorTempKelvin,
      colorTempLabel,
      saturationLevel,
      depthOfFieldEstimate,
      dominantColors:
        dominantColors.length > 0
          ? dominantColors
          : ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'],
    };
  } catch {
    return {
      avgLuminance: 110,
      contrastLevel: 'balanced',
      colorTempKelvin: 5000,
      colorTempLabel: '5000K (Luz Natural Balanceada)',
      saturationLevel: 'natural',
      depthOfFieldEstimate: 'medium-selective',
      dominantColors: ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'],
    };
  }
}

export async function processImageFile(file: File): Promise<{
  previewUrl: string;
  base64: string;
  mimeType: string;
  metadata: MediaMetadata;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || 1920;
      const height = img.naturalHeight || 1080;

      // Resize to max 1024px for fast, reliable payload upload
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Optical analysis on 64x64 sample canvas
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 64;
      sampleCanvas.height = 64;
      const sampleCtx = sampleCanvas.getContext('2d');
      let opticalMetrics = analyzeCanvasOptics(ctx, targetW, targetH);
      if (sampleCtx) {
        sampleCtx.drawImage(img, 0, 0, 64, 64);
        opticalMetrics = analyzeCanvasOptics(sampleCtx, 64, 64);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
      const base64 = dataUrl.split(',')[1] || '';

      resolve({
        previewUrl: url,
        base64,
        mimeType: 'image/jpeg',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'image/jpeg',
          width,
          height,
          aspectRatio: calculateAspectRatioLabel(width, height),
          opticalMetrics,
        },
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo abrir la imagen. Verifica que sea JPG, PNG o WEBP.'));
    };

    img.src = url;
  });
}

export async function inspectAndExtractVideo(file: File): Promise<{
  previewUrl: string;
  keyframes: KeyframeItem[];
  metadata: MediaMetadata;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = Number(video.duration || 0);
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;

      if (!Number.isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la duración del video.'));
        return;
      }

      const trimStart = 0;
      const trimEnd = duration > 30 ? 30 : duration;
      const effectiveDuration = Number((trimEnd - trimStart).toFixed(1));

      if (duration < 5.0) {
        resolve({
          previewUrl: url,
          keyframes: [],
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4',
            width,
            height,
            aspectRatio: calculateAspectRatioLabel(width, height),
            duration,
            trimStart,
            trimEnd: duration,
            effectiveDuration: duration,
            opticalMetrics: {
              avgLuminance: 100,
              contrastLevel: 'balanced',
              colorTempKelvin: 5000,
              colorTempLabel: '5000K',
              saturationLevel: 'natural',
              depthOfFieldEstimate: 'medium-selective',
              dominantColors: ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'],
            },
          },
        });
        return;
      }

      try {
        const extracted = await extractVideoKeyframes(url, trimStart, trimEnd, 6);
        resolve({
          previewUrl: url,
          keyframes: extracted.keyframes,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4',
            width,
            height,
            aspectRatio: calculateAspectRatioLabel(width, height),
            duration,
            trimStart,
            trimEnd,
            effectiveDuration,
            opticalMetrics: extracted.opticalMetrics,
          },
        });
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Formato de video no soportado. Usa MP4, WEBM o MOV.'));
    };

    video.src = url;
  });
}

export async function extractVideoKeyframes(
  videoUrl: string,
  startSec: number,
  endSec: number,
  frameCount = 6
): Promise<{ keyframes: KeyframeItem[]; opticalMetrics: OpticalMetrics }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    const keyframes: KeyframeItem[] = [];

    video.onloadeddata = async () => {
      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const maxDim = 768;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Error al inicializar canvas de video.');

        const span = Math.max(1, endSec - startSec);
        const timestamps: number[] = [];
        for (let i = 0; i < frameCount; i++) {
          const t = startSec + (span * i) / Math.max(1, frameCount - 1);
          timestamps.push(Math.min(endSec - 0.05, Math.max(0, Number(t.toFixed(1)))));
        }

        let opticalMetrics: OpticalMetrics | null = null;
        let prevFrameSample: Uint8ClampedArray | null = null;
        let totalFrameDiff = 0;

        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 64;
        sampleCanvas.height = 64;
        const sampleCtx = sampleCanvas.getContext('2d');

        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i];
          await new Promise<void>((resSeek) => {
            const timeout = setTimeout(resSeek, 1200);
            const onSeeked = () => {
              clearTimeout(timeout);
              video.removeEventListener('seeked', onSeeked);
              resSeek();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = t;
          });

          ctx.drawImage(video, 0, 0, targetW, targetH);

          if (sampleCtx) {
            sampleCtx.drawImage(video, 0, 0, 64, 64);
            const currentData = sampleCtx.getImageData(0, 0, 64, 64).data;
            if (prevFrameSample) {
              let diff = 0;
              for (let p = 0; p < currentData.length; p += 16) {
                diff += Math.abs(currentData[p] - prevFrameSample[p]);
              }
              totalFrameDiff += diff / (currentData.length / 16);
            }
            prevFrameSample = new Uint8ClampedArray(currentData);

            if (i === Math.floor(timestamps.length / 2)) {
              opticalMetrics = analyzeCanvasOptics(sampleCtx, 64, 64);
            }
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
          const base64 = dataUrl.split(',')[1] || '';
          keyframes.push({
            timestamp: t,
            dataUrl,
            base64,
            mimeType: 'image/jpeg',
          });
        }

        const avgMotionDiff = frameCount > 1 ? totalFrameDiff / (frameCount - 1) : 10;
        let motionIntensityEstimate: OpticalMetrics['motionIntensityEstimate'] = 'smooth-tracking';
        if (avgMotionDiff < 8) motionIntensityEstimate = 'static-subtle';
        else if (avgMotionDiff > 24) motionIntensityEstimate = 'dynamic-action';

        const finalMetrics: OpticalMetrics = opticalMetrics
          ? { ...opticalMetrics, motionIntensityEstimate }
          : {
              avgLuminance: 110,
              contrastLevel: 'balanced',
              colorTempKelvin: 5200,
              colorTempLabel: '5200K (Luz Natural Balanceada)',
              saturationLevel: 'natural',
              depthOfFieldEstimate: 'medium-selective',
              motionIntensityEstimate,
              dominantColors: ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'],
            };

        resolve({ keyframes, opticalMetrics: finalMetrics });
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => reject(new Error('No se pudieron extraer los fotogramas del video.'));
  });
}
