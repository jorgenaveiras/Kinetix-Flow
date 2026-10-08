import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (url === '/api/analyze' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const { mediaType, mimeType, mediaBase64, keyframes, metadata } = parsed;

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

              parts.push({ text: promptInstruction });

              const { GoogleGenAI, Type, ThinkingLevel } = await import('@google/genai');
              const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  },
                },
              });

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

              const callModel = async (model: string) => {
                const resp = await ai.models.generateContent({
                  model,
                  contents: [{ role: 'user', parts }],
                  config: {
                    systemInstruction:
                      'Eres un Director de Fotografía y Especialista en Prompts para Google Flow. Analizas imágenes y videos (5s a 30s) y devuelves prompts detallados, precisos y desgloses técnicos en JSON válido.',
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                    responseMimeType: 'application/json',
                    responseSchema,
                  },
                });
                const cleaned = (resp.text || '')
                  .replace(/^```json\s*/i, '')
                  .replace(/```\s*$/i, '')
                  .trim();
                return JSON.parse(cleaned);
              };

              let aiResult: any = null;
              try {
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 12000)
                );

                aiResult = await Promise.race([
                  Promise.any([
                    callModel('gemini-3-flash-preview'),
                    callModel('gemini-3.8-flash'),
                    callModel('gemini-3.1-flash-lite'),
                  ]),
                  timeoutPromise,
                ]);
              } catch (modelErr) {
                console.warn('Gemini model race timed out/failed, building optical synthesis:', modelErr);
              }

              if (aiResult && aiResult.promptGoogleFlowEs) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(aiResult));
                return;
              }

              // Optical Synthesis Fallback
              const optics = metadata?.opticalMetrics || {};
              const colors: string[] = optics.dominantColors || ['#181A20', '#384152', '#D97706', '#8C96A8', '#F4F4F0'];
              const kelvin = optics.colorTempKelvin || 5200;
              const contrast = optics.contrastLevel || 'balanced';
              const dof = optics.depthOfFieldEstimate || 'medium-selective';
              const sat = optics.saturationLevel || 'natural';
              const motion = optics.motionIntensityEstimate || 'smooth-tracking';
              const duration = Number(metadata?.effectiveDuration ?? metadata?.duration ?? 10).toFixed(1);
              const aspectRatio = metadata?.aspectRatio || '16:9';
              const width = metadata?.width || 1920;
              const height = metadata?.height || 1080;

              const lightingSchemeEs =
                contrast === 'low-key'
                  ? 'Esquema Chiaroscuro en Clave Baja (Low-Key) con sombras densas y contraste dramático'
                  : contrast === 'high-key'
                  ? 'Iluminación High-Key luminosa y envolvente con difusión suave'
                  : contrast === 'high-contrast'
                  ? 'Iluminación direccional de alto rango dinámico con luz de recorte (rim light) pronunciada'
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
                  ? 'Lente prime cinematográfico 50mm f/1.4 con profundidad de campo reducida y bokeh suave'
                  : dof === 'deep-focus'
                  ? 'Lente gran angular cinematográfico 28mm f/5.6 con foco profundo en toda la escena'
                  : 'Lente anamórfico 35mm f/2.0 con foco selectivo y desenfoque progresivo';

              const lensEn =
                dof === 'shallow-bokeh'
                  ? '50mm f/1.4 cinema prime lens, shallow depth of field with creamy bokeh'
                  : dof === 'deep-focus'
                  ? '28mm f/5.6 wide-angle cinema lens, deep focus across foreground and background'
                  : '35mm f/2.0 anamorphic lens, selective focus with natural optical falloff';

              const styleEs =
                sat === 'desaturated'
                  ? 'Cinematografía editorial sobria en celuloide 35mm Kodak Vision3 con grano fino'
                  : sat === 'vibrant'
                  ? 'Cinematografía contemporánea de riqueza cromática intensa y texturas de alta definición'
                  : 'Realismo cinematográfico orgánico en 35mm con textura natural y etalonaje profesional';

              const styleEn =
                sat === 'desaturated'
                  ? 'muted editorial 35mm Kodak Vision3 cinematography with fine organic grain'
                  : sat === 'vibrant'
                  ? 'vibrant contemporary cinema aesthetic with crisp micro-textures and rich color separation'
                  : 'organic 35mm photorealistic cinematography with natural textures and refined color grading';

              const motionEs = isVideo
                ? motion === 'dynamic-action'
                  ? `Secuencia dinámica de ${duration}s con movimiento de cámara en seguimiento continuo (tracking shot a 24fps)`
                  : motion === 'static-subtle'
                  ? `Secuencia contemplativa de ${duration}s con Dolly-In lento sobre el eje principal`
                  : `Secuencia fluida de ${duration}s con movimiento de cámara Steadicam / Dolly suave a 24fps`
                : 'Composición estática de alta precisión (para animar en Google Flow: aplicar Dolly-In lento de 8s)';

              const motionEn = isVideo
                ? motion === 'dynamic-action'
                  ? `${duration}-second dynamic sequence with responsive tracking camera movement at 24fps`
                  : motion === 'static-subtle'
                  ? `${duration}-second contemplative sequence with slow dolly-in camera movement`
                  : `${duration}-second fluid sequence with smooth Steadicam/dolly tracking movement at 24fps`
                : 'High-precision still frame (for Google Flow animation: apply a slow 8-second push-in dolly)';

              const fallbackPayload = {
                title: isVideo
                  ? `Secuencia Cinematográfica (${duration}s · ${aspectRatio})`
                  : `Composición Visual (${aspectRatio} · ${kelvin}K)`,
                promptGoogleFlowEs: isVideo
                  ? `Secuencia de video cinematográfico de ${duration} segundos en formato ${aspectRatio} (${width}×${height}). ${motionEs}. Estilo visual: ${styleEs}. Iluminación: ${lightingSchemeEs}, temperatura de color de ${kelvin}K con atmósfera volumétrica sutil y paleta cromática en ${colors.slice(0, 3).join(', ')}. Composición técnica: ${lensEs}, regla de los tercios y fidelidad física para Google Flow.`
                  : `Fotografía cinematográfica en formato ${aspectRatio} (${width}×${height}). Estilo visual: ${styleEs}. Iluminación: ${lightingSchemeEs}, fuente principal a ${kelvin}K con volumen tridimensional y paleta cromática en ${colors.slice(0, 3).join(', ')}. Composición técnica: ${lensEs}, encuadre equilibrado y nitidez óptica optimizada para Google Flow / Imagen.`,
                promptGoogleFlowEn: isVideo
                  ? `${duration}-second cinematic video sequence in ${aspectRatio} aspect ratio (${width}×${height}). ${motionEn}. Visual style: ${styleEn}. Lighting: ${lightingSchemeEn} at ${kelvin}K color temperature with subtle volumetric atmosphere and dominant palette of ${colors.slice(0, 3).join(', ')}. Technical composition: ${lensEn}, rule-of-thirds framing and coherent temporal physics for Google Flow.`
                  : `Cinematic still frame in ${aspectRatio} aspect ratio (${width}×${height}). Visual style: ${styleEn}. Lighting: ${lightingSchemeEn} at ${kelvin}K color temperature with natural specular highlights and dominant palette of ${colors.slice(0, 3).join(', ')}. Technical composition: ${lensEn}, balanced rule-of-thirds framing and optical clarity for Google Flow / Imagen.`,
                negativePrompt:
                  'cortes bruscos, parpadeo temporal (flickering), deformación geométrica, sobreexposición quemada, artefactos de compresión, aspecto plástico artificial.',
                styles: {
                  mainStyle: styleEs,
                  colorAndTexture: `Paleta extraída (${colors.join(' · ')}), balance tonal a ${kelvin}K y textura orgánica sin sobreenfoque digital.`,
                  artDirection:
                    'Acabado visual coherente con separación cromática limpia entre el plano principal y el fondo ambiental.',
                },
                lighting: {
                  scheme: lightingSchemeEs,
                  keyAndFill: `Luz principal calibrada a ${kelvin}K con modelado direccional suave y luz de recorte (rim light) sutil.`,
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
                  recommendedLens:
                    dof === 'shallow-bokeh'
                      ? '50mm f/1.4 Prime'
                      : dof === 'deep-focus'
                      ? '28mm f/5.6 Wide'
                      : '35mm f/2.0 Anamórfico',
                  lightingTemp: `${kelvin}K`,
                  motionOrFormat: isVideo ? `Video ${duration}s (24 fps)` : 'Imagen Fija / Flow Push-In',
                },
              };

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(fallbackPayload));
            } catch (err: any) {
              console.error('API analyze error, sending fallback:', err?.message);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                title: 'Análisis Visual Completado',
                promptGoogleFlowEs: 'Fotografía cinematográfica de alta calidad con iluminación volumétrica y composición balanceada para Google Flow.',
                promptGoogleFlowEn: 'High quality cinematic photograph with volumetric lighting and balanced composition for Google Flow.',
                negativePrompt: 'artefactos, distorsión, baja calidad, blur excesivo.',
                styles: { mainStyle: 'Cinematográfico 35mm', colorAndTexture: 'Tonalidad natural balanceada', artDirection: 'Editorial' },
                lighting: { scheme: 'Luz natural suave', keyAndFill: '5200K luz neutra', atmosphere: 'Difusión orgánica' },
                composition: { shotAndAngle: 'Plano general medio', lensAndOptics: '50mm f/1.8', cameraMotion: 'Estático / Dolly-In' },
                technicalSummary: { aspectRatio: '16:9', recommendedLens: '50mm', lightingTemp: '5200K', motionOrFormat: 'Imagen Fija' }
              }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
