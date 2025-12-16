export type TargetModel = 'midjourney' | 'stable_diffusion' | 'firefly' | 'dalle';
export type KeywordDensity = 'low' | 'standard' | 'high';

export interface PromptConfig {
  targetModel: TargetModel;
  aspectRatio: string;
  includeTechnical: boolean;
  keywordDensity: KeywordDensity;
}

export interface StockMetadata {
  title: string;
  description: string;
  ai_prompt: string;
  keywords: string[];
  category: string;
  technical_settings?: string;
  used_model?: TargetModel;
}

export interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data: StockMetadata | null;
  error: string | null;
}

export interface AnalysisState {
  items: BatchItem[];
  isProcessing: boolean;
  activeItemId: string | null;
}

export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';