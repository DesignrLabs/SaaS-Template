import { supabase } from './supabase';

// Type declaration for process.env
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};

// API Base URL
const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : 'http://backend:8000';

// Output target platforms
export type OutputTarget = 'vercel_v0' | 'claude_code' | 'cursor' | 'generic';
export type Framework = 'react' | 'vue' | 'svelte' | 'html';
export type Styling = 'tailwind' | 'css' | 'styled-components' | 'scss';
export type DetailLevel = 'basic' | 'detailed' | 'comprehensive';
export type ImageType = 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif';
export type Provider = 'anthropic' | 'openai';

// Design Analysis types
export interface TypographySpec {
  classes: string;
  color: string;
}

export interface DesignAnalysis {
  layout_type: string;
  container_specs: string;
  grid_config: string | null;
  spacing_system: string;
  typography: Record<string, TypographySpec>;
  colors: Record<string, string>;
  components: string[];
  design_patterns: string[];
  interactions: string[];
}

// Prompt Package types
export interface PromptPackage {
  recommended_platform: OutputTarget;
  recommended_model: string;
  temperature: number;
  max_tokens: number;
  foundation_prompt: string;
  refinement_prompt: string | null;
  interaction_prompt: string | null;
  design_pattern_name: string;
  similar_examples: string[];
  common_pitfalls: string[];
  framework_notes: string;
}

// Request/Response types
export interface ImageToPromptRequest {
  image_base64: string;
  image_type?: ImageType;
  target_platform?: OutputTarget;
  framework?: Framework;
  styling?: Styling;
  include_interactions?: boolean;
  detail_level?: DetailLevel;
}

export interface ImageToPromptResponse {
  success: boolean;
  analysis: DesignAnalysis;
  prompt_package: PromptPackage;
  raw_markdown: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface AnalyzeDesignRequest {
  image_base64: string;
  image_type?: ImageType;
}

export interface AnalyzeDesignResponse {
  success: boolean;
  analysis: DesignAnalysis;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface PlatformInfo {
  id: OutputTarget;
  name: string;
  description: string;
  recommended_model: string;
  features: string[];
}

export interface DetailLevelInfo {
  id: DetailLevel;
  tokens: string;
  description: string;
}

export interface PlatformsResponse {
  platforms: PlatformInfo[];
  frameworks: Framework[];
  styling: Styling[];
  detail_levels: DetailLevelInfo[];
}

// Helper to get authentication token
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// Helper to make authenticated API requests
async function apiRequest<T>(endpoint: string, method: string, body?: unknown): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    console.log(`Making vision request to ${API_URL}${endpoint}`);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      mode: 'cors',
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // If we can't parse the error as JSON, just use the status message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    console.error('Vision API request error:', error);
    throw error;
  }
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URI prefix to get just the base64 data
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Get image type from file
export function getImageType(file: File): ImageType {
  const mimeType = file.type.toLowerCase();
  const typeMap: Record<string, ImageType> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return typeMap[mimeType] || 'png';
}

// Vision API functions

/**
 * Translate a design image into a comprehensive prompt package
 */
export async function translateImageToPrompt(
  request: ImageToPromptRequest,
  provider: Provider = 'anthropic'
): Promise<ImageToPromptResponse> {
  return apiRequest<ImageToPromptResponse>(
    `/api/vision/translate?provider=${provider}`,
    'POST',
    {
      image_base64: request.image_base64,
      image_type: request.image_type || 'png',
      target_platform: request.target_platform || 'generic',
      framework: request.framework || 'react',
      styling: request.styling || 'tailwind',
      include_interactions: request.include_interactions ?? true,
      detail_level: request.detail_level || 'detailed',
    }
  );
}

/**
 * Analyze a design image without generating full prompts
 */
export async function analyzeDesign(
  request: AnalyzeDesignRequest,
  provider: Provider = 'anthropic'
): Promise<AnalyzeDesignResponse> {
  return apiRequest<AnalyzeDesignResponse>(
    `/api/vision/analyze?provider=${provider}`,
    'POST',
    {
      image_base64: request.image_base64,
      image_type: request.image_type || 'png',
    }
  );
}

/**
 * Get supported platforms and configuration options
 */
export async function getSupportedPlatforms(): Promise<PlatformsResponse> {
  // This endpoint doesn't require auth
  const response = await fetch(`${API_URL}/api/vision/platforms`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch supported platforms');
  }

  return response.json();
}

/**
 * Helper to translate a file directly
 */
export async function translateFileToPrompt(
  file: File,
  options: Omit<ImageToPromptRequest, 'image_base64' | 'image_type'> = {},
  provider: Provider = 'anthropic'
): Promise<ImageToPromptResponse> {
  const base64 = await fileToBase64(file);
  const imageType = getImageType(file);

  return translateImageToPrompt(
    {
      image_base64: base64,
      image_type: imageType,
      ...options,
    },
    provider
  );
}
