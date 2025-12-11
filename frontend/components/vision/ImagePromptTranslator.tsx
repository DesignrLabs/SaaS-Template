'use client';

import { useState, useCallback, useRef } from 'react';
import {
  translateFileToPrompt,
  ImageToPromptResponse,
  OutputTarget,
  Framework,
  Styling,
  DetailLevel,
  Provider,
} from '@/services/vision';

interface Settings {
  targetPlatform: OutputTarget;
  framework: Framework;
  styling: Styling;
  detailLevel: DetailLevel;
  includeInteractions: boolean;
  provider: Provider;
}

export default function ImagePromptTranslator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [response, setResponse] = useState<ImageToPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'prompts' | 'markdown'>('prompts');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings>({
    targetPlatform: 'generic',
    framework: 'react',
    styling: 'tailwind',
    detailLevel: 'detailed',
    includeInteractions: true,
    provider: 'anthropic',
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResponse(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResponse(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleTranslate = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await translateFileToPrompt(
        selectedFile,
        {
          target_platform: settings.targetPlatform,
          framework: settings.framework,
          styling: settings.styling,
          detail_level: settings.detailLevel,
          include_interactions: settings.includeInteractions,
        },
        settings.provider
      );

      setResponse(result);
      setActiveTab('prompts');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to translate image';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setResponse(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Visual-to-Prompt Translation</h1>
        <p className="mt-2 text-gray-600">
          Upload a design screenshot and get precise prompts to recreate it with AI coding assistants.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Upload & Settings */}
        <div className="space-y-6">
          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Design Input</h2>

            {!preview ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <div className="space-y-3">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <p className="text-gray-600">
                      Drop your design screenshot here, or{' '}
                      <span className="text-primary-600 font-medium">browse</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, WebP up to 10MB</p>
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
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={preview}
                    alt="Design preview"
                    className="w-full h-auto max-h-80 object-contain bg-gray-100"
                  />
                  <button
                    onClick={clearSelection}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  {selectedFile?.name} ({(selectedFile?.size ?? 0 / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Translation Settings</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Platform
                </label>
                <select
                  value={settings.targetPlatform}
                  onChange={(e) => handleSettingChange('targetPlatform', e.target.value as OutputTarget)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="vercel_v0">Vercel v0</option>
                  <option value="claude_code">Claude Code</option>
                  <option value="cursor">Cursor</option>
                  <option value="generic">Generic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Provider
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) => handleSettingChange('provider', e.target.value as Provider)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="anthropic">Claude (Anthropic)</option>
                  <option value="openai">GPT-4 Vision (OpenAI)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Framework
                </label>
                <select
                  value={settings.framework}
                  onChange={(e) => handleSettingChange('framework', e.target.value as Framework)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                  <option value="html">HTML</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Styling
                </label>
                <select
                  value={settings.styling}
                  onChange={(e) => handleSettingChange('styling', e.target.value as Styling)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="tailwind">Tailwind CSS</option>
                  <option value="css">Plain CSS</option>
                  <option value="styled-components">Styled Components</option>
                  <option value="scss">SCSS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detail Level
                </label>
                <select
                  value={settings.detailLevel}
                  onChange={(e) => handleSettingChange('detailLevel', e.target.value as DetailLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="basic">Basic (~2000 tokens)</option>
                  <option value="detailed">Detailed (~4000 tokens)</option>
                  <option value="comprehensive">Comprehensive (~8000 tokens)</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeInteractions}
                    onChange={(e) => handleSettingChange('includeInteractions', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include interactions</span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleTranslate}
                disabled={!selectedFile || isLoading}
                className="w-full px-4 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing Design...
                  </span>
                ) : (
                  'Translate to Prompt'
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="space-y-6">
          {response ? (
            <div className="bg-white rounded-lg shadow-md">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {(['prompts', 'analysis', 'markdown'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        activeTab === tab
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Prompts Tab */}
                {activeTab === 'prompts' && (
                  <div className="space-y-6">
                    {/* Recommended Setup */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommended Setup</h3>
                      <div className="bg-gray-50 rounded-md p-3 text-sm">
                        <p><span className="text-gray-500">Platform:</span> {response.prompt_package.recommended_platform}</p>
                        <p><span className="text-gray-500">Model:</span> <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">{response.prompt_package.recommended_model}</code></p>
                        <p><span className="text-gray-500">Temperature:</span> {response.prompt_package.temperature}</p>
                        <p><span className="text-gray-500">Max Tokens:</span> {response.prompt_package.max_tokens}</p>
                      </div>
                    </div>

                    {/* Foundation Prompt */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Step 1: Foundation Prompt</h3>
                        <button
                          onClick={() => handleCopy(response.prompt_package.foundation_prompt, 'foundation')}
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          {copied === 'foundation' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {response.prompt_package.foundation_prompt}
                      </div>
                    </div>

                    {/* Refinement Prompt */}
                    {response.prompt_package.refinement_prompt && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">Step 2: Refinement Prompt</h3>
                          <button
                            onClick={() => handleCopy(response.prompt_package.refinement_prompt!, 'refinement')}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            {copied === 'refinement' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {response.prompt_package.refinement_prompt}
                        </div>
                      </div>
                    )}

                    {/* Interaction Prompt */}
                    {response.prompt_package.interaction_prompt && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">Step 3: Interaction Prompt</h3>
                          <button
                            onClick={() => handleCopy(response.prompt_package.interaction_prompt!, 'interaction')}
                            className="text-xs text-primary-600 hover:text-primary-700"
                          >
                            {copied === 'interaction' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {response.prompt_package.interaction_prompt}
                        </div>
                      </div>
                    )}

                    {/* Common Pitfalls */}
                    {response.prompt_package.common_pitfalls.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Common Pitfalls</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {response.prompt_package.common_pitfalls.map((pitfall, i) => (
                            <li key={i}>{pitfall}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Design Pattern</h3>
                      <p className="text-lg font-medium text-primary-600">{response.prompt_package.design_pattern_name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Layout</h3>
                        <p className="text-sm text-gray-600">{response.analysis.layout_type}</p>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-1">
                          {response.analysis.container_specs}
                        </code>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Grid</h3>
                        <p className="text-sm text-gray-600">{response.analysis.grid_config || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Colors */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Color Palette</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(response.analysis.colors).map(([name, color]) => (
                          <div
                            key={name}
                            className="flex items-center space-x-2 cursor-pointer"
                            onClick={() => handleCopy(color, name)}
                          >
                            <div
                              className="w-8 h-8 rounded-md border border-gray-200"
                              style={{ backgroundColor: color }}
                            />
                            <div>
                              <p className="text-xs text-gray-500">{name.replace('_', ' ')}</p>
                              <p className="text-xs font-mono">{color}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Components */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Components Detected</h3>
                      <div className="flex flex-wrap gap-2">
                        {response.analysis.components.map((component, i) => (
                          <span key={i} className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {component}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Design Patterns */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Design Patterns</h3>
                      <div className="flex flex-wrap gap-2">
                        {response.analysis.design_patterns.map((pattern, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interactions */}
                    {response.analysis.interactions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Inferred Interactions</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {response.analysis.interactions.map((interaction, i) => (
                            <li key={i}>{interaction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Markdown Tab */}
                {activeTab === 'markdown' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Full Prompt Package (Markdown)</h3>
                      <button
                        onClick={() => handleCopy(response.raw_markdown, 'markdown')}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                      >
                        {copied === 'markdown' ? 'Copied!' : 'Copy All'}
                      </button>
                    </div>
                    <div className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      {response.raw_markdown}
                    </div>
                  </div>
                )}
              </div>

              {/* Token Usage */}
              <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-lg">
                <p className="text-xs text-gray-500">
                  Tokens used: {response.usage.total_tokens} ({response.usage.input_tokens} input, {response.usage.output_tokens} output)
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Analysis Yet</h3>
              <p className="mt-2 text-gray-500">
                Upload a design screenshot and click &quot;Translate to Prompt&quot; to see the magic.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
