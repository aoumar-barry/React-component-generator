export type AIProvider = 'openai' | 'gemini';

export interface GenerateRequest {
  description: string;
  provider: AIProvider;
}

export interface GenerateResponse {
  code: string;
  provider: AIProvider;
  timestamp: string;
}

export interface ComponentGeneratorState {
  description: string;
  generatedCode: string | null;
  isLoading: boolean;
  selectedProvider: AIProvider;
  error: string | null;
}

