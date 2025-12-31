'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { translateFileToPrompt, ImageToPromptResponse } from '@/services/vision';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ImagePromptTranslator() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageToPromptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle any image input
  const processImage = useCallback((imageFile: File) => {
    if (!imageFile.type.startsWith('image/')) {
      setError('Please use an image (screenshot, photo, etc.)');
      return;
    }
    if (imageFile.size > MAX_FILE_SIZE) {
      setError('Image is too large. Try a smaller one.');
      return;
    }

    setFile(imageFile);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(imageFile);
  }, []);

  // Paste from clipboard (Cmd+V)
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

  // Drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processImage(droppedFile);
  }, [processImage]);

  // Click to upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processImage(selectedFile);
  }, [processImage]);

  // Generate the instructions
  const handleGenerate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Use sensible defaults - user doesn't need to choose
      const response = await translateFileToPrompt(file, {
        target_platform: 'generic',
        framework: 'react',
        styling: 'tailwind',
        detail_level: 'detailed',
        include_interactions: true,
      }, 'anthropic');

      setResult(response);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.prompt_package.foundation_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start over
  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto">

      {/* Step 1: No image yet - show drop zone */}
      {!preview && !result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xl text-gray-700 font-medium">Drop your image here</p>
              <p className="text-gray-500 mt-2">or paste (Cmd+V) or click to browse</p>
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
      )}

      {/* Step 2: Image uploaded - show preview and generate button */}
      {preview && !result && (
        <div className="space-y-6">
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <img
              src={preview}
              alt="Your design"
              className="max-h-80 mx-auto rounded-lg"
            />
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 p-2 bg-white rounded-full shadow hover:bg-gray-100"
              title="Remove"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-primary-600 text-white text-lg font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Looking at your design...
              </span>
            ) : (
              'Get Instructions'
            )}
          </button>
        </div>
      )}

      {/* Step 3: Result - show the instructions to copy */}
      {result && (
        <div className="space-y-6">
          {/* Success message */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Here are your instructions</h2>
            <p className="text-gray-500 mt-1">Copy and paste these to any AI to build this design</p>
          </div>

          {/* The instructions */}
          <div className="bg-gray-900 rounded-xl p-5 max-h-80 overflow-auto">
            <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
              {result.prompt_package.foundation_prompt}
            </pre>
          </div>

          {/* Copy button - big and obvious */}
          <button
            onClick={handleCopy}
            className="w-full py-4 bg-primary-600 text-white text-lg font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Instructions'}
          </button>

          {/* Start over */}
          <button
            onClick={handleClear}
            className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Try another design
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
