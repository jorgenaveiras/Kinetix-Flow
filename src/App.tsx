import React, { useState, useRef } from 'react';
import {
  Upload,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Download,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Clock,
  Aperture,
  Sun,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { AnalysisResult, KeyframeItem, MediaMetadata, MediaType } from './types';
import {
  formatBytes,
  inspectAndExtractVideo,
  processImageFile,
  sampleVideoOptics,
} from './utils/mediaProcessor';

function buildClientFallbackResult(
  mediaType: MediaType,
  metadata: MediaMetadata
): AnalysisResult {
  const isVideo = mediaType === 'video';
  const duration = Number(metadata.effectiveDuration ?? metadata.duration ?? 10).toFixed(1);
  const aspectRatio = metadata.aspectRatio || '16:9';
  const width = metadata.width || 1920;
  const height = metadata.height || 1080;
  const optics = metadata.opticalMetrics;
  const colors = optics.dominantColors || ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'];
  const kelvin = optics.colorTempKelvin || 5200;
  const contrast = optics.contrastLevel || 'balanced';
  const dof = optics.depthOfFieldEstimate || 'medium-selective';
  const sat = optics.saturationLevel || 'natural';
  const motion = optics.motionIntensityEstimate || 'smooth-tracking';

  const lightingSchemeEs =
    contrast === 'low-key'
      ? 'Esquema Chiaroscuro en Clave Baja (Low-Key) con sombras profundas y contraste dramático'
      : contrast === 'high-key'
      ? 'Iluminación High-Key luminosa y envolvente con difusión suave'
      : contrast === 'high-contrast'
      ? 'Iluminación direccional de alto contraste con luz de recorte (rim light) definida'
      : 'Iluminación cinematográfica natural balanceada con transición tonal suave';

  const lightingSchemeEn =
    contrast === 'low-key'
      ? 'dramatic low-key chiaroscuro lighting with deep shadows and sculpted highlights'
      : contrast === 'high-key'
      ? 'soft enveloping high-key illumination with diffused highlights'
      : contrast === 'high-contrast'
      ? 'high-contrast directional lighting with crisp rim light separation'
      : 'balanced natural cinematic lighting with smooth tonal roll-off';

  const lensEs =
    dof === 'shallow-bokeh'
      ? 'Óptica fija 50mm f/1.4 con profundidad de campo selectiva y bokeh cremoso'
      : dof === 'deep-focus'
      ? 'Lente gran angular cinematográfico 28mm f/5.6 con foco profundo en toda la escena'
      : 'Lente anamórfico 35mm f/2.0 con foco nítido en el sujeto principal y desenfoque progresivo';

  const lensEn =
    dof === 'shallow-bokeh'
      ? '50mm f/1.4 cinema prime lens, shallow depth of field with smooth bokeh'
      : dof === 'deep-focus'
      ? '28mm f/5.6 wide-angle cinema lens, deep focus from foreground to background'
      : '35mm f/2.0 anamorphic cinema lens, selective focus with natural optical falloff';

  const styleEs =
    sat === 'desaturated'
      ? 'Cinematografía editorial sobria en celuloide 35mm Kodak Vision3 con grano orgánico fino'
      : sat === 'vibrant'
      ? 'Cinematografía contemporánea de alta riqueza cromática, nitidez óptica y texturas detalladas'
      : 'Realismo cinematográfico orgánico en 35mm con texturas físicas naturales y etalonaje profesional';

  const styleEn =
    sat === 'desaturated'
      ? 'muted editorial 35mm Kodak Vision3 cinematography with fine organic film grain'
      : sat === 'vibrant'
      ? 'vibrant contemporary cinema aesthetic with crisp micro-textures and rich color separation'
      : 'organic 35mm photorealistic cinematography with natural textures and refined color grading';

  const motionEs = isVideo
    ? motion === 'dynamic-action'
      ? `Secuencia dinámica de ${duration}s con movimiento de cámara en seguimiento continuo (tracking shot a 24fps)`
      : motion === 'static-subtle'
      ? `Secuencia contemplativa de ${duration}s con Dolly-In lento y progresivo sobre el eje central`
      : `Secuencia fluida de ${duration}s con movimiento de cámara Steadicam / Dolly suave a 24fps`
    : 'Encuadre fijo de precisión (para animar en Google Flow: aplicar Dolly-In suave de 8s con paralaje natural)';

  const motionEn = isVideo
    ? motion === 'dynamic-action'
      ? `${duration}-second dynamic sequence with fluid tracking camera movement at 24fps`
      : motion === 'static-subtle'
      ? `${duration}-second contemplative sequence with slow, deliberate dolly-in camera movement`
      : `${duration}-second fluid sequence with smooth Steadicam/dolly tracking movement at 24fps`
    : 'Precision still frame (for Google Flow animation: apply a slow 8-second push-in dolly movement)';

  return {
    title: isVideo
      ? `Secuencia de Video (${duration}s · ${aspectRatio})`
      : `Imagen Analizada (${aspectRatio} · ${kelvin}K)`,
    promptGoogleFlowEs: isVideo
      ? `Secuencia de video cinematográfico de ${duration} segundos en formato ${aspectRatio} (${width}×${height}). ${motionEs}. Estilo visual: ${styleEs}. Iluminación: ${lightingSchemeEs}, temperatura de color de ${kelvin}K con volumen atmosférico y paleta cromática dominante en ${colors.slice(0, 3).join(', ')}. Composición técnica: ${lensEs}, regla de los tercios, continuidad física realista optimizada para Google Flow.`
      : `Fotografía cinematográfica de alta resolución en formato ${aspectRatio} (${width}×${height}). Estilo visual: ${styleEs}. Iluminación: ${lightingSchemeEs}, fuente principal calibrada a ${kelvin}K con reflejos especulares controlados y paleta cromática en ${colors.slice(0, 3).join(', ')}. Composición técnica: ${lensEs}, equilibrio geométrico en regla de los tercios y máxima fidelidad óptica para Google Flow / Imagen.`,
    promptGoogleFlowEn: isVideo
      ? `${duration}-second cinematic video sequence in ${aspectRatio} aspect ratio (${width}×${height}). ${motionEn}. Visual style: ${styleEn}. Lighting: ${lightingSchemeEn} at ${kelvin}K color temperature with atmospheric depth and dominant color palette of ${colors.slice(0, 3).join(', ')}. Technical composition: ${lensEn}, rule-of-thirds framing, coherent temporal physics optimized for Google Flow.`
      : `High-resolution cinematic photograph in ${aspectRatio} aspect ratio (${width}×${height}). Visual style: ${styleEn}. Lighting: ${lightingSchemeEn} at ${kelvin}K color temperature with controlled specular highlights and dominant palette of ${colors.slice(0, 3).join(', ')}. Technical composition: ${lensEn}, balanced rule-of-thirds composition and crisp optical clarity optimized for Google Flow / Imagen.`,
    negativePrompt:
      'cortes bruscos, parpadeo temporal (flickering), deformación geométrica, sobreexposición quemada, compresión borrosa, texturas plásticas artificiales.',
    styles: {
      mainStyle: styleEs,
      colorAndTexture: `Paleta cromática extraída (${colors.join(' · ')}), temperatura ${kelvin}K y textura orgánica definida.`,
      artDirection:
        'Separación tonal limpia entre el plano principal y el entorno con fidelidad realista de materiales.',
    },
    lighting: {
      scheme: lightingSchemeEs,
      keyAndFill: `Luz principal calibrada a ${kelvin}K con difusión controlada y contraluz de recorte (rim light) sutil.`,
      atmosphere:
        'Profundidad lumínica progresiva con sombras detalladas y reflejos naturales.',
    },
    composition: {
      shotAndAngle: `Encuadre en relación ${aspectRatio} (${width}×${height}) estructurado sobre ejes de tercios y líneas guía.`,
      lensAndOptics: lensEs,
      cameraMotion: motionEs,
    },
    technicalSummary: {
      aspectRatio,
      recommendedLens:
        dof === 'shallow-bokeh'
          ? '50mm f/1.4 Prime'
          : dof === 'deep-focus'
          ? '28mm f/5.6 Wide'
          : '35mm f/2.0 Anamórfico',
      lightingTemp: `${kelvin}K`,
      motionOrFormat: isVideo ? `Video ${duration}s (24 fps)` : 'Imagen Fija',
    },
  };
}

export default function App() {
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [keyframes, setKeyframes] = useState<KeyframeItem[]>([]);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const [promptLang, setPromptLang] = useState<'es' | 'en'>('es');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setMediaType(null);
    setPreviewUrl('');
    setImageBase64('');
    setKeyframes([]);
    setMetadata(null);
    setValidationError(null);
    setAnalysisResult(null);
  };

  const handleFileUpload = async (file: File) => {
    setValidationError(null);
    setAnalysisResult(null);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setValidationError(
        'Formato no válido. Sube una imagen (JPG, PNG, WEBP) o un video (MP4, WEBM, MOV).'
      );
      return;
    }

    setIsProcessingFile(true);
    try {
      if (isImage) {
        const processed = await processImageFile(file);
        setMediaType('image');
        setPreviewUrl(processed.previewUrl);
        setImageBase64(processed.base64);
        setKeyframes([]);
        setMetadata(processed.metadata);
      } else {
        const inspected = await inspectAndExtractVideo(file);
        setMediaType('video');
        setPreviewUrl(inspected.previewUrl);
        setImageBase64('');
        setKeyframes(inspected.keyframes);
        setMetadata(inspected.metadata);

        const rawDur = inspected.metadata.duration ?? 0;
        if (rawDur < 5.0) {
          setValidationError(
            `El video dura ${rawDur.toFixed(
              1
            )} segundos. El requisito es de mínimo 5 segundos y máximo 30 segundos.`
          );
        }
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Error al leer el archivo seleccionado.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleTrimVideo = async (newStart: number, newEnd: number) => {
    if (!metadata || mediaType !== 'video') return;
    const totalDur = metadata.duration || 30;
    const clampedStart = Math.max(0, Math.min(newStart, totalDur - 5));
    const clampedEnd = Math.min(totalDur, Math.max(newEnd, clampedStart + 5));
    const finalEnd =
      clampedEnd - clampedStart > 30 ? Number((clampedStart + 30).toFixed(1)) : clampedEnd;
    const effective = Number((finalEnd - clampedStart).toFixed(1));

    setMetadata((prev) =>
      prev
        ? {
            ...prev,
            trimStart: clampedStart,
            trimEnd: finalEnd,
            effectiveDuration: effective,
          }
        : null
    );

    if (effective >= 5.0 && effective <= 30.0) {
      setValidationError(null);
      try {
        const sampleAt = Number(((clampedStart + finalEnd) / 2).toFixed(2));
        const sampled = await sampleVideoOptics(previewUrl, sampleAt);
        setMetadata((prev) =>
          prev ? { ...prev, opticalMetrics: sampled.opticalMetrics } : null
        );
      } catch {
        // Keep current optical metrics
      }
    } else {
      setValidationError(
        `El segmento seleccionado mide ${effective}s. Debe durar entre 5.0s y 30.0s.`
      );
    }
  };

  const handleGeneratePrompt = async () => {
    if (!mediaType || !metadata) return;

    if (mediaType === 'video') {
      const effDur = metadata.effectiveDuration ?? metadata.duration ?? 0;
      if (effDur < 5.0 || effDur > 30.0) {
        setValidationError(
          `El video debe tener una duración de mínimo 5 segundos y máximo 30 segundos (actual: ${effDur.toFixed(
            1
          )}s).`
        );
        return;
      }
    }

    setValidationError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType,
          mimeType: mediaType === 'image' ? 'image/jpeg' : metadata.mimeType,
          mediaBase64: mediaType === 'image' ? imageBase64 : undefined,
          keyframes:
            mediaType === 'video'
              ? keyframes.map((k) => ({
                  timestamp: k.timestamp,
                  base64: k.base64,
                  mimeType: k.mimeType,
                }))
              : undefined,
          metadata,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.promptGoogleFlowEs) {
          setAnalysisResult(data);
          setIsAnalyzing(false);
          return;
        }
      }

      // If upstream returned non-200 or non-JSON, synthesize directly from optical metrics
      const fallback = buildClientFallbackResult(mediaType, metadata);
      setAnalysisResult(fallback);
    } catch {
      const fallback = buildClientFallbackResult(mediaType, metadata);
      setAnalysisResult(fallback);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!analysisResult || !metadata) return;
    const content = [
      `KINETIX FLOW — PROMPT GENERADO Y FICHA TÉCNICA`,
      `================================================`,
      `Archivo: ${metadata.fileName} (${metadata.width}×${metadata.height} · ${metadata.aspectRatio})`,
      mediaType === 'video'
        ? `Duración Analizada: ${(metadata.effectiveDuration ?? metadata.duration ?? 0).toFixed(1)}s`
        : `Tipo: Imagen Fija`,
      ``,
      `PROMPT OPTIMIZADO PARA GOOGLE FLOW (ESPAÑOL):`,
      analysisResult.promptGoogleFlowEs,
      ``,
      `OPTIMIZED GOOGLE FLOW PROMPT (ENGLISH):`,
      analysisResult.promptGoogleFlowEn,
      ``,
      `PROMPT NEGATIVO RECOMENDADO:`,
      analysisResult.negativePrompt,
      ``,
      `01. ESTILOS VISUALES:`,
      `- Estilo Principal: ${analysisResult.styles.mainStyle}`,
      `- Color y Textura: ${analysisResult.styles.colorAndTexture}`,
      `- Dirección de Arte: ${analysisResult.styles.artDirection}`,
      ``,
      `02. ILUMINACIÓN:`,
      `- Esquema: ${analysisResult.lighting.scheme}`,
      `- Luz Principal y Temperatura: ${analysisResult.lighting.keyAndFill}`,
      `- Atmósfera: ${analysisResult.lighting.atmosphere}`,
      ``,
      `03. COMPOSICIÓN TÉCNICA RECOMENDADA:`,
      `- Plano y Encuadre: ${analysisResult.composition.shotAndAngle}`,
      `- Lente y Óptica: ${analysisResult.composition.lensAndOptics}`,
      `- Movimiento de Cámara: ${analysisResult.composition.cameraMotion}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${metadata.fileName.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const rawVideoDuration = metadata?.duration ?? 0;
  const effectiveVideoDuration = metadata?.effectiveDuration ?? rawVideoDuration;
  const isVideoValid =
    mediaType !== 'video' || (effectiveVideoDuration >= 5.0 && effectiveVideoDuration <= 30.0);

  const activePromptText = analysisResult
    ? promptLang === 'es'
      ? analysisResult.promptGoogleFlowEs
      : analysisResult.promptGoogleFlowEn
    : '';

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#F4F4F0] flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-16 bg-[#0A0B0E]/90 backdrop-blur-md border-b border-[#262936] px-6 lg:px-10 flex items-center justify-between">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-[#F4F4F0] whitespace-nowrap shrink-0"
        >
          Kinetix Flow
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9499AD]">
          <a
            href="#analizador"
            className="hover:text-[#F4F4F0] hover:underline underline-offset-8 decoration-amber-500 transition-colors whitespace-nowrap"
          >
            Analizador
          </a>
          <a
            href="#resultado"
            className="hover:text-[#F4F4F0] hover:underline underline-offset-8 decoration-amber-500 transition-colors whitespace-nowrap"
          >
            Prompt Generado
          </a>
          <a
            href="#desglose"
            className="hover:text-[#F4F4F0] hover:underline underline-offset-8 decoration-amber-500 transition-colors whitespace-nowrap"
          >
            Estilos e Iluminación
          </a>
          <a
            href="#composicion"
            className="hover:text-[#F4F4F0] hover:underline underline-offset-8 decoration-amber-500 transition-colors whitespace-nowrap"
          >
            Composición Técnica
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {mediaType ? (
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-medium text-[#F4F4F0] bg-[#191C26] hover:bg-[#262936] border border-[#262936] rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nuevo Archivo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-[#0A0B0E] bg-[#E2A03F] hover:bg-[#F59E0B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Subir Imagen o Video
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main id="top" className="flex-1 w-full max-w-[1360px] mx-auto px-6 lg:px-10 py-8 space-y-8">
        {/* Clean, Direct Header */}
        <section className="border-b border-[#262936] pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#9499AD] font-mono-tabular">
                <span>Imagen Fija</span>
                <span aria-hidden="true">·</span>
                <span>Video (Mín. 5s · Máx. 30s)</span>
                <span aria-hidden="true">·</span>
                <span>Optimizado para Google Flow</span>
              </div>
              <h1
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F0]"
                style={{ textWrap: 'balance' }}
              >
                Ingeniería inversa de prompts para imagen y video
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#9499AD] max-w-md">
              Sube tu archivo para obtener el prompt exacto con estilos visuales, esquema de
              iluminación y composición técnica recomendada.
            </p>
          </div>
        </section>

        {/* Two-Column Direct Studio */}
        <section id="analizador" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (5 Cols): Upload, Preview & Generate Button */}
          <div className="lg:col-span-5 bg-[#12141A] border border-[#262936] rounded-xl p-6 space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#E2A03F] bg-[#E2A03F]/10'
                  : 'border-[#323646] hover:border-[#E2A03F]/70 bg-[#0A0B0E]/60'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#191C26] border border-[#262936] flex items-center justify-center text-[#E2A03F]">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#F4F4F0]">
                    {mediaType
                      ? 'Haz clic o arrastra otro archivo para reemplazar'
                      : 'Sube una imagen o un video (5s a 30s)'}
                  </p>
                  <p className="text-xs text-[#9499AD] font-mono-tabular">
                    JPG · PNG · WEBP · MP4 · WEBM · MOV
                  </p>
                </div>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div
                role="alert"
                className="p-4 rounded-lg bg-red-950/40 border border-red-800/80 text-red-200 flex items-start gap-3 text-xs leading-relaxed"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>{validationError}</div>
              </div>
            )}

            {/* File Loading State */}
            {isProcessingFile && (
              <div className="py-8 text-center space-y-2 text-xs text-[#9499AD]">
                <RefreshCw className="w-5 h-5 animate-spin text-[#E2A03F] mx-auto" />
                <p>Inspeccionando propiedades ópticas y duración del archivo...</p>
              </div>
            )}

            {/* Media Preview & Inspector */}
            {mediaType && metadata && !isProcessingFile && (
              <div className="space-y-5">
                {/* Unboxed File Metadata */}
                <div className="flex items-center justify-between text-xs text-[#9499AD]">
                  <div className="flex items-center gap-2 truncate">
                    {mediaType === 'video' ? (
                      <Film className="w-3.5 h-3.5 text-[#E2A03F] shrink-0" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-[#E2A03F] shrink-0" />
                    )}
                    <span className="font-medium text-[#F4F4F0] truncate max-w-[180px]">
                      {metadata.fileName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{formatBytes(metadata.fileSize)}</span>
                  </div>
                  <div className="font-mono-tabular shrink-0">
                    {metadata.width}×{metadata.height} · {metadata.aspectRatio}
                  </div>
                </div>

                {/* Preview Viewport */}
                <div className="relative rounded-lg overflow-hidden bg-[#0A0B0E] border border-[#262936] aspect-video flex items-center justify-center">
                  {mediaType === 'video' ? (
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt={metadata.fileName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Video 5s - 30s Duration Control */}
                {mediaType === 'video' && (
                  <div className="pt-4 border-t border-[#262936] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-[#F4F4F0]">
                        <Clock className="w-3.5 h-3.5 text-[#E2A03F]" />
                        <span>Duración del Video (5s – 30s)</span>
                      </span>
                      <span
                        className={`font-mono-tabular font-semibold ${
                          isVideoValid ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isVideoValid
                          ? `Válido · ${effectiveVideoDuration.toFixed(1)}s`
                          : `Inválido · ${effectiveVideoDuration.toFixed(1)}s`}
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-[#0A0B0E] rounded-full overflow-hidden border border-[#262936] relative">
                        <div
                          className="absolute top-0 bottom-0 w-px bg-zinc-500 z-10"
                          style={{ left: `${(5 / 30) * 100}%` }}
                        />
                        <div
                          className={`h-full ${
                            isVideoValid ? 'bg-[#E2A03F]' : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (effectiveVideoDuration / 30) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono-tabular text-[#9499AD]">
                        <span>0s</span>
                        <span>Mín: 5.0s</span>
                        <span>Máx: 30.0s</span>
                      </div>
                    </div>

                    {/* Range Trimmer if Video > 30s */}
                    {rawVideoDuration > 30 && (
                      <div className="pt-2 space-y-2 bg-[#0A0B0E] p-3 rounded-lg border border-[#262936]">
                        <div className="flex justify-between text-xs text-[#9499AD]">
                          <span>Recorte automático a máx. 30s:</span>
                          <span className="font-mono-tabular text-[#F4F4F0]">
                            {(metadata.trimStart ?? 0).toFixed(1)}s –{' '}
                            {(metadata.trimEnd ?? 30).toFixed(1)}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, rawVideoDuration - 5)}
                          step={0.5}
                          value={metadata.trimStart ?? 0}
                          onChange={(e) => {
                            const start = parseFloat(e.target.value);
                            handleTrimVideo(start, Math.min(rawVideoDuration, start + 30));
                          }}
                          className="w-full accent-[#E2A03F] cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Extracted Keyframes */}
                    {keyframes.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs text-[#9499AD] block">
                          Fotogramas extraídos para análisis temporal:
                        </span>
                        <div className="grid grid-cols-6 gap-1.5">
                          {keyframes.map((frame, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (videoRef.current) {
                                  videoRef.current.currentTime = frame.timestamp;
                                }
                              }}
                              className="relative rounded overflow-hidden border border-[#262936] hover:border-[#E2A03F] aspect-video bg-[#0A0B0E] cursor-pointer"
                            >
                              <img
                                src={frame.dataUrl}
                                alt={`${frame.timestamp}s`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono-tabular text-[#F4F4F0] text-center">
                                {frame.timestamp.toFixed(0)}s
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dominant Color Palette */}
                <div className="pt-4 border-t border-[#262936] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#9499AD]">
                    <span>Paleta cromática detectada</span>
                    <span className="font-mono-tabular">
                      {metadata.opticalMetrics.colorTempLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {metadata.opticalMetrics.dominantColors.map((hex, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleCopy(hex, `hex-${i}`)}
                        className="group flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <div
                          className="w-full h-6 rounded border border-white/15"
                          style={{ backgroundColor: hex }}
                        />
                        <span className="text-[10px] font-mono-tabular text-[#9499AD] group-hover:text-[#F4F4F0]">
                          {copiedId === `hex-${i}` ? 'Copiado' : hex}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button: Generar Prompt */}
                <button
                  type="button"
                  disabled={isAnalyzing || !isVideoValid}
                  onClick={handleGeneratePrompt}
                  className={`w-full py-3.5 px-5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isAnalyzing || !isVideoValid
                      ? 'bg-[#262936] text-[#9499AD] cursor-not-allowed'
                      : 'bg-[#E2A03F] hover:bg-[#F59E0B] text-[#0A0B0E]'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analizando y generando prompt para Google Flow...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {mediaType === 'video'
                          ? `Generar Prompt de Video (${effectiveVideoDuration.toFixed(1)}s)`
                          : 'Generar Prompt de Imagen'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (7 Cols): Direct Output */}
          <div id="resultado" className="lg:col-span-7 space-y-6">
            {!analysisResult ? (
              <div className="bg-[#12141A] border border-[#262936] rounded-xl p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#191C26] border border-[#262936] flex items-center justify-center text-[#E2A03F] mx-auto">
                  <Aperture className="w-6 h-6" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="font-display text-lg font-bold text-[#F4F4F0]">
                    Listo para analizar tu imagen o video
                  </h2>
                  <p className="text-xs sm:text-sm text-[#9499AD] leading-relaxed">
                    Sube una imagen o un video de entre 5 y 30 segundos en el panel izquierdo y
                    pulsa <strong className="text-[#F4F4F0]">Generar Prompt</strong>. Obtendrás el
                    prompt exacto optimizado para Google Flow junto con el análisis de estilos,
                    iluminación y composición técnica.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-[#9499AD] font-mono-tabular">
                  <span>01. Prompt Google Flow (ES / EN)</span>
                  <span aria-hidden="true">·</span>
                  <span>02. Estilos Visuales</span>
                  <span aria-hidden="true">·</span>
                  <span>03. Iluminación</span>
                  <span aria-hidden="true">·</span>
                  <span>04. Composición Técnica</span>
                </div>
              </div>
            ) : (
              <>
                {/* Main Prompt Card */}
                <div className="bg-[#12141A] border border-[#262936] rounded-xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262936] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#9499AD] font-mono-tabular">
                        <span>
                          {mediaType === 'video' ? 'Prompt para Generar Video' : 'Prompt para Generar Imagen'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Google Flow</span>
                        <span aria-hidden="true">·</span>
                        <span>{analysisResult.technicalSummary.aspectRatio}</span>
                      </div>
                      <h2 className="font-display text-xl font-bold text-[#F4F4F0]">
                        {analysisResult.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Language Switcher */}
                      <div className="flex items-center p-1 bg-[#0A0B0E] border border-[#262936] rounded-lg">
                        <button
                          type="button"
                          onClick={() => setPromptLang('es')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                            promptLang === 'es'
                              ? 'bg-[#262936] text-[#F4F4F0]'
                              : 'text-[#9499AD] hover:text-[#F4F4F0]'
                          }`}
                        >
                          Español
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromptLang('en')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                            promptLang === 'en'
                              ? 'bg-[#262936] text-[#F4F4F0]'
                              : 'text-[#9499AD] hover:text-[#F4F4F0]'
                          }`}
                        >
                          English
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(activePromptText, 'main-prompt')}
                        className="px-4 py-2 text-xs font-semibold bg-[#E2A03F] hover:bg-[#F59E0B] text-[#0A0B0E] rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {copiedId === 'main-prompt' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="p-2 text-xs bg-[#191C26] hover:bg-[#262936] text-[#F4F4F0] border border-[#262936] rounded-lg transition-colors cursor-pointer"
                        title="Descargar en .TXT"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Prompt Text Box */}
                  <div className="bg-[#0A0B0E] border border-[#262936] rounded-lg p-5 space-y-4">
                    <p className="text-[15px] leading-relaxed text-[#F4F4F0] select-all">
                      {activePromptText}
                    </p>

                    <div className="pt-3 border-t border-[#262936] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9499AD] font-mono-tabular">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Óptica: {analysisResult.technicalSummary.recommendedLens}</span>
                        <span aria-hidden="true">·</span>
                        <span>Luz: {analysisResult.technicalSummary.lightingTemp}</span>
                        <span aria-hidden="true">·</span>
                        <span>Formato: {analysisResult.technicalSummary.motionOrFormat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(analysisResult.negativePrompt, 'neg-prompt')
                        }
                        className="text-[#E2A03F] hover:underline cursor-pointer"
                      >
                        {copiedId === 'neg-prompt'
                          ? 'Prompt negativo copiado'
                          : 'Copiar Prompt Negativo'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications: Styles, Lighting & Composition */}
                <div
                  id="desglose"
                  className="bg-[#12141A] border border-[#262936] rounded-xl divide-y divide-[#262936]"
                >
                  {/* 01. Estilos */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#E2A03F]" />
                        <h3 className="font-display text-base font-bold text-[#F4F4F0]">
                          01. Estilos Visuales y Dirección de Arte
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${analysisResult.styles.mainStyle}. ${analysisResult.styles.colorAndTexture}. ${analysisResult.styles.artDirection}`,
                            'copy-styles'
                          )
                        }
                        className="text-xs text-[#9499AD] hover:text-[#F4F4F0] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'copy-styles' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === 'copy-styles' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Estilo Principal</span>
                        <p className="text-[#F4F4F0] font-medium leading-relaxed">
                          {analysisResult.styles.mainStyle}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Color Grading y Textura</span>
                        <p className="text-[#D5D8E2] leading-relaxed">
                          {analysisResult.styles.colorAndTexture}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Dirección de Arte</span>
                        <p className="text-[#D5D8E2] leading-relaxed">
                          {analysisResult.styles.artDirection}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 02. Iluminación */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-[#E2A03F]" />
                        <h3 className="font-display text-base font-bold text-[#F4F4F0]">
                          02. Iluminación Cinematográfica
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${analysisResult.lighting.scheme}. ${analysisResult.lighting.keyAndFill}. ${analysisResult.lighting.atmosphere}`,
                            'copy-light'
                          )
                        }
                        className="text-xs text-[#9499AD] hover:text-[#F4F4F0] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'copy-light' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === 'copy-light' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Esquema Lumínico</span>
                        <p className="text-[#F4F4F0] font-medium leading-relaxed">
                          {analysisResult.lighting.scheme}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Luz Principal y Contraluz</span>
                        <p className="text-[#D5D8E2] leading-relaxed">
                          {analysisResult.lighting.keyAndFill}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Atmósfera Volumétrica</span>
                        <p className="text-[#D5D8E2] leading-relaxed">
                          {analysisResult.lighting.atmosphere}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 03. Composición Técnica */}
                  <div id="composicion" className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Aperture className="w-4 h-4 text-[#E2A03F]" />
                        <h3 className="font-display text-base font-bold text-[#F4F4F0]">
                          03. Composición Técnica Recomendada
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${analysisResult.composition.shotAndAngle}. ${analysisResult.composition.lensAndOptics}. ${analysisResult.composition.cameraMotion}`,
                            'copy-comp'
                          )
                        }
                        className="text-xs text-[#9499AD] hover:text-[#F4F4F0] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === 'copy-comp' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === 'copy-comp' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Plano, Ángulo y Encuadre</span>
                        <p className="text-[#F4F4F0] font-medium leading-relaxed">
                          {analysisResult.composition.shotAndAngle}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Lente y Profundidad de Campo</span>
                        <p className="text-[#E2A03F] font-mono-tabular leading-relaxed">
                          {analysisResult.composition.lensAndOptics}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[#9499AD] block">Movimiento de Cámara (Flow)</span>
                        <p className="text-[#D5D8E2] leading-relaxed">
                          {analysisResult.composition.cameraMotion}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#262936] py-6 px-6 lg:px-10 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9499AD]">
          <div>Kinetix Flow — Generador de Prompts para Imagen y Video (5s – 30s)</div>
          <div className="font-mono-tabular">
            Estilos · Iluminación · Composición Técnica · Google Flow
          </div>
        </div>
      </footer>
    </div>
  );
}
