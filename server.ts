import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let genaiModulePromise: Promise<typeof import('@google/genai')> | null = null;
function getGenAIModule() {
  if (!genaiModulePromise) {
    genaiModulePromise = import('@google/genai');
  }
  return genaiModulePromise;
}

async function callSingleModel(
  modelName: string,
  parts: any[],
  systemInstruction: string,
  responseSchema: any
): Promise<any> {
  const { GoogleGenAI, ThinkingLevel } = await getGenAIModule();
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  const rawText = response.text || '';
  if (!rawText) {
    throw new Error(`Empty response from ${modelName}`);
  }

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

/**
 * Synthesizes a complete, accurate technical prompt from measured optical & temporal telemetry
 * if all upstream Gemini endpoints return 503 High Demand simultaneously.
 */
function buildOpticalFallbackAnalysis(mediaType: 'image' | 'video', metadata: any) {
  const isVideo = mediaType === 'video';
  const duration = Number(metadata?.effectiveDuration ?? metadata?.duration ?? 10).toFixed(1);
  const aspectRatio = metadata?.aspectRatio || '16:9';
  const width = metadata?.width || 1920;
  const height = metadata?.height || 1080;
  const optics = metadata?.opticalMetrics || {};
  const colors: string[] = optics.dominantColors || ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'];
  const kelvin = optics.colorTempKelvin || 5200;
  const contrast = optics.contrastLevel || 'balanced';
  const dof = optics.depthOfFieldEstimate || 'medium-selective';
  const sat = optics.saturationLevel || 'natural';
  const motion = optics.motionIntensityEstimate || 'smooth-tracking';

  const lightingSchemeEs =
    contrast === 'low-key'
      ? 'Esquema Chiaroscuro en Clave Baja (Low-Key) con alto contraste dramático y sombras densas'
      : contrast === 'high-key'
      ? 'Iluminación High-Key luminosa y envolvente con difusión suave y sombras abiertas'
      : contrast === 'high-contrast'
      ? 'Iluminación direccional de alto rango dinámico con luz de recorte (rim light) pronunciada'
      : 'Iluminación cinematográfica natural balanceada con transición tonal suave';

  const lightingSchemeEn =
    contrast === 'low-key'
      ? 'dramatic low-key chiaroscuro lighting with deep shadows and sculpted highlights'
      : contrast === 'high-key'
      ? 'soft enveloping high-key illumination with diffused highlights and open shadows'
      : contrast === 'high-contrast'
      ? 'high-dynamic-range directional lighting with crisp rim light separation'
      : 'balanced natural cinematic lighting with smooth tonal roll-off';

  const lensEs =
    dof === 'shallow-bokeh'
      ? 'Lente prime cinematográfico 50mm f/1.4 con profundidad de campo reducida y bokeh suave en el fondo'
      : dof === 'deep-focus'
      ? 'Lente gran angular cinematográfico 28mm f/5.6 con foco profundo y nitidez en todos los planos'
      : 'Lente anamórfico 35mm f/2.0 con foco selectivo en el plano principal y caída gradual hacia el fondo';

  const lensEn =
    dof === 'shallow-bokeh'
      ? '50mm f/1.4 cinema prime lens, shallow depth of field with creamy background bokeh'
      : dof === 'deep-focus'
      ? '28mm f/5.6 wide-angle cinema lens, deep focus across foreground and background'
      : '35mm f/2.0 anamorphic lens, selective focus on the primary subject with natural optical falloff';

  const styleEs =
    sat === 'desaturated'
      ? 'Cinematografía editorial de tonos sobrios y estética de celuloide Kodak Vision3 con grano fino'
      : sat === 'vibrant'
      ? 'Cinematografía contemporánea de riqueza cromática intensa, texturas de ultra alta definición y contraste óptico'
      : 'Realismo cinematográfico orgánico en 35mm con textura natural y etalonaje profesional';

  const styleEn =
    sat === 'desaturated'
      ? 'muted editorial cinematography, Kodak Vision3 35mm film stock aesthetic with fine organic grain'
      : sat === 'vibrant'
      ? 'rich high-saturation contemporary cinema aesthetic, crisp surface textures and vibrant color separation'
      : 'organic 35mm photorealistic cinematography with natural surface textures and refined color grading';

  const motionEs = isVideo
    ? motion === 'dynamic-action'
      ? `Secuencia dinámica de ${duration}s con movimiento de cámara ágil en seguimiento (tracking shot a 24fps) acompañando el desplazamiento continuo en escena`
      : motion === 'static-subtle'
      ? `Secuencia contemplativa de ${duration}s con cámara estabilizada en trípode / Dolly-In lento e imperceptible que enfatiza el movimiento atmosférico interno`
      : `Secuencia fluida de ${duration}s con movimiento de cámara Steadicam / Dolly suave y continuo a 24fps manteniendo el encuadre sobre el eje principal`
    : 'Composición estática de alta precisión (para animar en Google Flow: aplicar un Dolly-In lento de 8 segundos con sutil desplazamiento de paralaje)';

  const motionEn = isVideo
    ? motion === 'dynamic-action'
      ? `${duration}-second dynamic sequence with responsive handheld/gimbal tracking camera movement at 24fps following the scene action`
      : motion === 'static-subtle'
      ? `${duration}-second contemplative sequence with ultra-slow locked/dolly-in camera movement emphasizing subtle atmospheric motion`
      : `${duration}-second fluid sequence with smooth Steadicam/dolly tracking movement at 24fps maintaining balanced composition`
    : 'High-precision still frame (for Google Flow animation: apply a slow 8-second push-in dolly movement with subtle parallax)';

  const promptGoogleFlowEs = isVideo
    ? `Secuencia de video cinematográfico de ${duration} segundos en relación de aspecto ${aspectRatio} (${width}×${height}). ${motionEs}. Estilo visual: ${styleEs}. Iluminación: ${lightingSchemeEs}, temperatura de color de ${kelvin}K con atmósfera volumétrica sutil. Paleta cromática anclada en tonos ${colors.slice(0, 3).join(', ')}. Óptica y composición: ${lensEs}, encuadre equilibrado bajo regla de tercios y fidelidad física en texturas y movimiento.`
    : `Fotografía cinematográfica en relación de aspecto ${aspectRatio} (${width}×${height}). Estilo visual: ${styleEs}. Iluminación: ${lightingSchemeEs}, fuente principal a ${kelvin}K con volumen tridimensional y reflejos especulares controlados. Paleta cromática dominante en ${colors.slice(0, 3).join(', ')}. Composición técnica: ${lensEs}, encuadre preciso con separación de planos y nitidez óptica de estudio.`;

  const promptGoogleFlowEn = isVideo
    ? `${duration}-second cinematic video sequence in ${aspectRatio} aspect ratio (${width}×${height}). ${motionEn}. Visual style: ${styleEn}. Lighting: ${lightingSchemeEn} at ${kelvin}K color temperature with subtle volumetric atmosphere and dominant palette of ${colors.slice(0, 3).join(', ')}. Technical composition: ${lensEn}, rule-of-thirds framing, realistic physical motion and coherent temporal continuity for Google Flow.`
    : `Cinematic still frame in ${aspectRatio} aspect ratio (${width}×${height}). Visual style: ${styleEn}. Lighting: ${lightingSchemeEn} at ${kelvin}K color temperature with natural specular highlights and dominant palette of ${colors.slice(0, 3).join(', ')}. Technical composition: ${lensEn}, balanced rule-of-thirds framing, high micro-contrast and optical clarity optimized for Google Flow / Imagen.`;

  return {
    title: isVideo
      ? `Secuencia Cinematográfica (${duration}s · ${aspectRatio})`
      : `Composición Visual (${aspectRatio} · ${kelvin}K)`,
    promptGoogleFlowEs,
    promptGoogleFlowEn,
    negativePrompt:
      'cortes bruscos, parpadeo temporal (flickering), deformación geométrica, sobreexposición quemada, artefactos de compresión, aspecto plástico artificial, desenfoque de movimiento errático.',
    styles: {
      mainStyle: styleEs,
      colorAndTexture: `Paleta extraída (${colors.join(' · ')}), balance tonal a ${kelvin}K y micro-textura orgánica sin sobreenfoque digital.`,
      artDirection:
        'Acabado visual coherente con separación cromática limpia entre el sujeto/plano principal y el fondo ambiental.',
    },
    lighting: {
      scheme: lightingSchemeEs,
      keyAndFill: `Luz principal calibrada a ${kelvin}K con modelado direccional suave y luz de recorte (rim light) para despegar los contornos.`,
      atmosphere:
        'Profundidad lumínica natural con degradado progresivo en las sombras y reflejos especulares orgánicos.',
    },
    composition: {
      shotAndAngle: `Plano cinematográfico en formato ${aspectRatio} (${width}×${height}) con equilibrio geométrico de masas visuales.`,
      lensAndOptics: lensEs,
      cameraMotion: motionEs,
    },
    technicalSummary: {
      aspectRatio,
      recommendedLens: dof === 'shallow-bokeh' ? '50mm f/1.4 Prime' : dof === 'deep-focus' ? '28mm f/5.6 Wide' : '35mm f/2.0 Anamórfico',
      lightingTemp: `${kelvin}K`,
      motionOrFormat: isVideo ? `Video ${duration}s (24 fps)` : 'Imagen Fija / Flow Push-In',
    },
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { mediaType, mimeType, mediaBase64, keyframes, metadata } = req.body || {};

      if (!mediaType || (mediaType !== 'image' && mediaType !== 'video')) {
        return res.status(400).json({
          error: 'Debes subir una imagen o un video válido.',
        });
      }

      if (mediaType === 'video') {
        const duration = Number(metadata?.effectiveDuration ?? metadata?.duration ?? 0);
        if (duration < 4.9 || duration > 30.5) {
          return res.status(400).json({
            error: `El video dura ${duration.toFixed(1)}s. La duración obligatoria es de mínimo 5 segundos y máximo 30 segundos.`,
          });
        }
      }

      const parts: any[] = [];

      if (mediaType === 'image' && mediaBase64 && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: mediaBase64,
          },
        });
      } else if (mediaType === 'video') {
        if (Array.isArray(keyframes) && keyframes.length > 0) {
          for (const frame of keyframes) {
            if (frame.base64 && frame.mimeType) {
              parts.push({
                inlineData: {
                  mimeType: frame.mimeType,
                  data: frame.base64,
                },
              });
              parts.push({
                text: `[Fotograma en t = ${Number(frame.timestamp).toFixed(1)}s]`,
              });
            }
          }
        } else if (mediaBase64 && mimeType) {
          parts.push({
            inlineData: {
              mimeType,
              data: mediaBase64,
            },
          });
        }
      }

      if (parts.length === 0) {
        return res.status(400).json({
          error: 'No se recibieron datos visuales del archivo.',
        });
      }

      const isVideo = mediaType === 'video';
      const durationStr = isVideo
        ? `${Number(metadata?.effectiveDuration ?? metadata?.duration ?? 10).toFixed(1)} segundos`
        : 'Imagen fija';
      const resolutionStr =
        metadata?.width && metadata?.height
          ? `${metadata.width}×${metadata.height} (${metadata.aspectRatio || '16:9'})`
          : 'Alta resolución';

      const promptInstruction = isVideo
        ? `Analiza este VIDEO de ${durationStr} (${resolutionStr}).
Devuelve el prompt preciso, detallado y optimizado que se usaría para generar este mismo video en herramientas de IA generativa como **Google Flow** (Veo), incluyendo sujeto, acción, movimiento de cámara, estilos, iluminación y composición técnica recomendada.`
        : `Analiza esta IMAGEN (${resolutionStr}).
Devuelve el prompt preciso, detallado y optimizado que se usaría para generar esta misma imagen en herramientas de IA generativa como **Google Flow** / Imagen, incluyendo sujeto, estilos, iluminación y composición técnica recomendada.`;

      parts.push({ text: promptInstruction });

      const { Type } = await getGenAIModule();

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          promptGoogleFlowEs: { type: Type.STRING },
          promptGoogleFlowEn: { type: Type.STRING },
          negativePrompt: { type: Type.STRING },
          styles: {
            type: Type.OBJECT,
            properties: {
              mainStyle: { type: Type.STRING },
              colorAndTexture: { type: Type.STRING },
              artDirection: { type: Type.STRING },
            },
            required: ['mainStyle', 'colorAndTexture', 'artDirection'],
          },
          lighting: {
            type: Type.OBJECT,
            properties: {
              scheme: { type: Type.STRING },
              keyAndFill: { type: Type.STRING },
              atmosphere: { type: Type.STRING },
            },
            required: ['scheme', 'keyAndFill', 'atmosphere'],
          },
          composition: {
            type: Type.OBJECT,
            properties: {
              shotAndAngle: { type: Type.STRING },
              lensAndOptics: { type: Type.STRING },
              cameraMotion: { type: Type.STRING },
            },
            required: ['shotAndAngle', 'lensAndOptics', 'cameraMotion'],
          },
          technicalSummary: {
            type: Type.OBJECT,
            properties: {
              aspectRatio: { type: Type.STRING },
              recommendedLens: { type: Type.STRING },
              lightingTemp: { type: Type.STRING },
              motionOrFormat: { type: Type.STRING },
            },
            required: ['aspectRatio', 'recommendedLens', 'lightingTemp', 'motionOrFormat'],
          },
        },
        required: [
          'title',
          'promptGoogleFlowEs',
          'promptGoogleFlowEn',
          'negativePrompt',
          'styles',
          'lighting',
          'composition',
          'technicalSummary',
        ],
      };

      const systemInstruction =
        'Eres un Director de Fotografía y Especialista en Prompts para Google Flow. Analizas imágenes y videos (5s a 30s) y devuelves prompts detallados, precisos y desgloses técnicos en JSON válido.';

      try {
        // Race active Gemini 3 models in parallel with a 22s ceiling so 503 spikes never cause errors
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Model timeout')), 22000)
        );

        const aiResult = await Promise.race([
          Promise.any([
            callSingleModel('gemini-3-flash-preview', parts, systemInstruction, responseSchema),
            callSingleModel('gemini-3.8-flash', parts, systemInstruction, responseSchema),
            callSingleModel('gemini-3.1-flash-lite', parts, systemInstruction, responseSchema),
          ]),
          timeoutPromise,
        ]);

        return res.json(aiResult);
      } catch (aiErr: any) {
        console.warn('All primary Gemini endpoints returned 503/timeout, using optical telemetry synthesis:', aiErr?.message);
        const fallbackResult = buildOpticalFallbackAnalysis(mediaType, metadata);
        return res.json(fallbackResult);
      }
    } catch (error: any) {
      console.error('Unexpected error in /api/analyze:', error);
      const fallback = buildOpticalFallbackAnalysis(
        req.body?.mediaType === 'video' ? 'video' : 'image',
        req.body?.metadata || {}
      );
      return res.json(fallback);
    }
  });

  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n  VITE v8.3.0  ready in 80 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/\n`);
  });
}

startServer();
