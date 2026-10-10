export type MediaType = 'image' | 'video';

export interface KeyframeItem {
  timestamp: number;
  dataUrl: string;
  base64: string;
  mimeType: string;
}

export interface OpticalMetrics {
  avgLuminance: number; // 0 - 255
  contrastLevel: 'low-key' | 'balanced' | 'high-key' | 'high-contrast';
  colorTempKelvin: number; // e.g. 2800 - 7500
  colorTempLabel: string;
  saturationLevel: 'desaturated' | 'natural' | 'vibrant';
  depthOfFieldEstimate: 'shallow-bokeh' | 'medium-selective' | 'deep-focus';
  motionIntensityEstimate?: 'static-subtle' | 'smooth-tracking' | 'dynamic-action';
  dominantColors: string[];
}

export interface MediaMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: string;
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
  effectiveDuration?: number;
  opticalMetrics: OpticalMetrics;
}

export interface SceneContent {
  descriptionEs: string;
  descriptionEn: string;
  subjects: string[];
  action: string;
  setting: string;
}

export interface AnalysisResult {
  title: string;
  content?: SceneContent;
  promptGoogleFlowEs: string;
  promptGoogleFlowEn: string;
  negativePrompt: string;
  styles: {
    mainStyle: string;
    colorAndTexture: string;
    artDirection: string;
  };
  lighting: {
    scheme: string;
    keyAndFill: string;
    atmosphere: string;
  };
  composition: {
    shotAndAngle: string;
    lensAndOptics: string;
    cameraMotion: string;
  };
  technicalSummary: {
    aspectRatio: string;
    recommendedLens: string;
    lightingTemp: string;
    motionOrFormat: string;
  };
}
