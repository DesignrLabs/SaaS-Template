'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  translateFileToPrompt,
  ImageToPromptResponse,
  OutputTarget,
  Framework,
  Styling,
  DetailLevel,
  Provider,
} from '@/services/vision';

// Simple settings - sensible defaults, minimal options exposed
interface Settings {
  targetPlatform: OutputTarget;
  framework: Framework;
  styling: Styling;
  provider: Provider;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ImagePromptTranslator() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageToPromptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<Settings>({
    targetPlatform: 'generic',
    framework: 'react',
    styling: 'tailwind',
    provider: 'anthropic',
  });

  // Process any image input (file, paste, drop)
  const processImage = useCallback((imageFile: File) => {
    // Validate
    if (!imageFile.type.startsWith('image/')) {
      setError('Please use an image file (PNG, JPG, WebP)');
      return;
    }
    if (imageFile.size > MAX_FILE_SIZE) {
      setError('Image must be under 10MB');
      return;
    }

    setFile(imageFile);
    setError(null);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(imageFile);
  }, []);

  // Clipboard paste handler (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            e.preventDefault();
            processImage(pastedFile);
            return;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processImage]);

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processImage(droppedFile);
  }, [processImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processImage(selectedFile);
  }, [processImage]);

  // Translate image to prompt
  const handleTranslate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const response = await translateFileToPrompt(
        file,
        {
          target_platform: settings.targetPlatform,
          framework: settings.framework,
          styling: settings.styling,
          detail_level: 'detailed',
          include_interactions: true,
        },
        settings.provider
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear everything
  const clear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Design to Prompt</h1>
        <p className="text-gray-600">Drop an image, paste a screenshot, or click to upload</p>
      </div>

      {/* Input Area */}
      {!preview ? (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all"
        >
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg text-gray-700">Drop image here</p>
              <p className="text-sm text-gray-500 mt-1">or paste from clipboard (Cmd+V) or click to browse</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <img
              src={preview}
              alt="Design preview"
              className="max-h-64 mx-auto rounded-lg"
            />
            <button
              onClick={clear}
              className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              title="Clear"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Settings */}
          <div className="flex flex-wrap gap-3">
            <select
              value={settings.targetPlatform}
              onChange={(e) => setSettings({ ...settings, targetPlatform: e.target.value as OutputTarget })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="generic">Any AI</option>
              <option value="vercel_v0">Vercel v0</option>
              <option value="claude_code">Claude Code</option>
              <option value="cursor">Cursor</option>
            </select>

            <select
              value={settings.framework}
              onChange={(e) => setSettings({ ...settings, framework: e.target.value as Framework })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="react">React</option>
              <option value="vue">Vue</option>
              <option value="svelte">Svelte</option>
              <option value="html">HTML</option>
            </select>

            <select
              value={settings.styling}
              onChange={(e) => setSettings({ ...settings, styling: e.target.value as Styling })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="tailwind">Tailwind</option>
              <option value="css">CSS</option>
              <option value="styled-components">Styled Components</option>
            </select>

            <select
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value as Provider })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="anthropic">Claude</option>
              <option value="openai">GPT-4 Vision</option>
            </select>
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Generate Prompt'
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Copy All Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Generated Prompt</h2>
            <button
              onClick={() => copyToClipboard(result.raw_markdown)}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy All'}
            </button>
          </div>

          {/* Design Pattern */}
          <div className="bg-primary-50 px-4 py-3 rounded-lg">
            <span className="text-sm text-primary-700 font-medium">
              {result.prompt_package.design_pattern_name}
            </span>
          </div>

          {/* Main Prompt */}
          <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono">
              {result.prompt_package.foundation_prompt}
            </pre>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {result.usage.total_tokens} tokens
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded">
              {result.analysis.components.length} components
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded">
              {Object.keys(result.analysis.colors).length} colors
            </span>
          </div>

          {/* Colors Preview */}
          {Object.keys(result.analysis.colors).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.analysis.colors).slice(0, 8).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => copyToClipboard(color)}
                  className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  title={`Click to copy: ${color}`}
                >
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600 font-mono">{color}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
