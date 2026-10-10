import { AnalysisResult, MediaMetadata, MediaType } from '../types';

interface GeminiModel {
  name: string;
  thinkingBudget?: number;
}

const MODELS: GeminiModel[] = [
  { name: 'gemini-3.5-flash', thinkingBudget: 0 },
  { name: 'gemini-flash-lite-latest' },
];

interface FramePart {
  base64: string;
  mimeType: string;
  timestamp: number;
}

export interface AnalyzeWithGeminiParams {
  apiKey: string;
  mediaType: MediaType;
  metadata: MediaMetadata;
  imageBase64?: string;
  imageMimeType?: string;
  frames?: FramePart[];
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    content: {
      type: 'OBJECT',
      properties: {
        descriptionEs: { type: 'STRING' },
        descriptionEn: { type: 'STRING' },
        subjects: { type: 'ARRAY', items: { type: 'STRING' } },
        action: { type: 'STRING' },
        setting: { type: 'STRING' },
      },
      required: ['descriptionEs', 'descriptionEn', 'subjects', 'action', 'setting'],
    },
    promptGoogleFlowEs: { type: 'STRING' },
    promptGoogleFlowEn: { type: 'STRING' },
    negativePrompt: { type: 'STRING' },
    styles: {
      type: 'OBJECT',
      properties: {
        mainStyle: { type: 'STRING' },
        colorAndTexture: { type: 'STRING' },
        artDirection: { type: 'STRING' },
      },
      required: ['mainStyle', 'colorAndTexture', 'artDirection'],
    },
    lighting: {
      type: 'OBJECT',
      properties: {
        scheme: { type: 'STRING' },
        keyAndFill: { type: 'STRING' },
        atmosphere: { type: 'STRING' },
      },
      required: ['scheme', 'keyAndFill', 'atmosphere'],
    },
    composition: {
      type: 'OBJECT',
      properties: {
        shotAndAngle: { type: 'STRING' },
        lensAndOptics: { type: 'STRING' },
        cameraMotion: { type: 'STRING' },
      },
      required: ['shotAndAngle', 'lensAndOptics', 'cameraMotion'],
    },
    technicalSummary: {
      type: 'OBJECT',
      properties: {
        aspectRatio: { type: 'STRING' },
        recommendedLens: { type: 'STRING' },
        lightingTemp: { type: 'STRING' },
        motionOrFormat: { type: 'STRING' },
      },
      required: ['aspectRatio', 'recommendedLens', 'lightingTemp', 'motionOrFormat'],
    },
  },
  required: [
    'title',
    'content',
    'promptGoogleFlowEs',
    'promptGoogleFlowEn',
    'negativePrompt',
    'styles',
    'lighting',
    'composition',
    'technicalSummary',
  ],
} as const;

const SYSTEM_INSTRUCTION =
  'Eres un director de fotografía y redactor experto de prompts para Google Flow (Veo / Imagen). ' +
  'PRIMERO describes el CONTENIDO real y literal de la escena (sujetos concretos, apariencia, acción, entorno y atmósfera) ' +
  'y DESPUÉS el estilo técnico (estilos visuales, iluminación, óptica y composición). ' +
  'Nunca inventes elementos que no aparezcan en la imagen o los fotogramas. ' +
  'Devuelves únicamente JSON válido que cumpla el esquema indicado.';

function buildInstruction(isVideo: boolean, durationText: string, resText: string): string {
  if (isVideo) {
    return (
      `Analiza esta secuencia de VIDEO de ${durationText}s (${resText}) a partir de los fotogramas adjuntos en orden cronológico.\n` +
      'PASO 1 — CONTENIDO: describe con máxima precisión QUÉ se ve y QUÉ sucede: sujetos concretos (personas, animales, objetos), ' +
      'su apariencia, la acción/movimiento principal, el entorno/escenario, la época y la atmósfera narrativa. ' +
      'Si algo cambia entre fotogramas (desplazamiento, gesto, cambio de escena), indícalo.\n' +
      'PASO 2 — TÉCNICA: estilos visuales y dirección de arte, esquema de iluminación, óptica/lente y composición.\n' +
      'PASO 3 — PROMPT: redacta promptGoogleFlowEs y promptGoogleFlowEn que EMPIECEN describiendo el contenido concreto ' +
      '(sujeto + acción + entorno) y después añadan cámara, estilo, iluminación y composición, de modo que al generarlo ' +
      'se reproduzca la MISMA escena. Sé literal y específico; evita frases genéricas.\n' +
      'Rellena el resto de campos del esquema con el análisis técnico.'
    );
  }
  return (
    `Analiza esta IMAGEN (${resText}).\n` +
    'PASO 1 — CONTENIDO: describe con máxima precisión el contenido: sujeto(s) concretos, su apariencia, la acción/pose, ' +
    'el entorno/escenario y la atmósfera. Sé literal y específico.\n' +
    'PASO 2 — TÉCNICA: estilos visuales y dirección de arte, esquema de iluminación, óptica/lente y composición.\n' +
    'PASO 3 — PROMPT: redacta promptGoogleFlowEs y promptGoogleFlowEn que EMPIECEN con la descripción del contenido concreto ' +
    '(sujeto + acción + entorno) y después añadan la técnica, para reproducir la MISMA escena. Evita frases genéricas.\n' +
    'Rellena el resto de campos del esquema con el análisis técnico.'
  );
}

export async function analyzeWithGemini(params: AnalyzeWithGeminiParams): Promise<AnalysisResult> {
  const { apiKey, mediaType, metadata, imageBase64, imageMimeType, frames } = params;
  const isVideo = mediaType === 'video';

  const durationValue =
    metadata.effectiveDuration ?? metadata.duration ?? metadata.trimEnd ?? 4;
  const durationText = Number(durationValue || 4).toFixed(1);
  const resText =
    metadata.width && metadata.height
      ? `${metadata.width}×${metadata.height} (${metadata.aspectRatio})`
      : 'alta resolución';

  const parts: Array<Record<string, unknown>> = [];
  if (isVideo && frames && frames.length) {
    frames.forEach((frame) => {
      parts.push({ inline_data: { mime_type: frame.mimeType, data: frame.base64 } });
      parts.push({ text: `[Fotograma en t=${frame.timestamp}s]` });
    });
  } else if (imageBase64) {
    parts.push({
      inline_data: { mime_type: imageMimeType || 'image/jpeg', data: imageBase64 },
    });
  }
  parts.push({ text: buildInstruction(isVideo, durationText, resText) });

  const baseGenerationConfig = {
    temperature: 0.5,
    responseMimeType: 'application/json',
    responseSchema,
  };

  let lastError: unknown = null;

  for (const model of MODELS) {
    const generationConfig =
      model.thinkingBudget === undefined
        ? baseGenerationConfig
        : { ...baseGenerationConfig, thinkingConfig: { thinkingBudget: model.thinkingBudget } };

    const requestBody = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts }],
      generationConfig,
    };

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        const text = await response.text();
        if (/API_KEY_INVALID|API key not valid|api key not valid/i.test(text)) {
          throw new Error(
            'La clave de Gemini no es válida. Comprueba que la copiaste completa y sin espacios.'
          );
        }
        if (response.status === 404 || response.status === 400) {
          lastError = new Error(`El modelo "${model.name}" no está disponible con esta clave.`);
          continue;
        }
        throw new Error(`Gemini respondió ${response.status}: ${text.slice(0, 200)}`);
      }
      if (response.status === 429) {
        lastError = new Error('Se agotó la cuota gratuita de Gemini. Inténtalo más tarde.');
        continue;
      }
      if (response.status === 503) {
        lastError = new Error('Gemini está saturado en este momento. Reintenta en unos segundos.');
        continue;
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini respondió ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .filter(Boolean)
          .join('') || '';
      if (!text) {
        lastError = new Error('Gemini devolvió una respuesta vacía.');
        continue;
      }

      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned) as AnalysisResult;
      if (!parsed.promptGoogleFlowEs) {
        lastError = new Error('La respuesta de Gemini no contiene un prompt válido.');
        continue;
      }
      if (!parsed.content) {
        parsed.content = {
          descriptionEs: '',
          descriptionEn: '',
          subjects: [],
          action: '',
          setting: '',
        };
      }
      return parsed;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('no es válida') ||
          error.message.includes('no tiene permiso') ||
          error.message.startsWith('Gemini respondió'))
      ) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo analizar el contenido con Gemini.');
}
