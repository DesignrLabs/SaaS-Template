'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, signOut } from '@/services/supabase';
import LoginForm from '@/components/auth/LoginForm';
import ImagePromptTranslator from '@/components/vision/ImagePromptTranslator';

type ViewMode = 'translator' | 'canvas' | 'library';

export default function DesignrLabs() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('translator');
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Designr Labs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="font-bold text-xl text-primary-600">
                Designr Labs
              </Link>
              <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full font-medium">
                Visual-to-Prompt Engine
              </span>
            </div>

            <nav className="flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* View Mode Tabs */}
      {user && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setViewMode('translator')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'translator'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Prompt Translator
              </button>
              <button
                onClick={() => setViewMode('canvas')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'canvas'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Infinite Canvas
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Soon</span>
              </button>
              <button
                onClick={() => setViewMode('library')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'library'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inspiration Library
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Soon</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <>
            {viewMode === 'translator' && <ImagePromptTranslator />}

            {viewMode === 'canvas' && (
              <InfiniteCanvasPlaceholder />
            )}

            {viewMode === 'library' && (
              <InspirationLibraryPlaceholder />
            )}
          </>
        ) : (
          <div className="max-w-xl mx-auto mt-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome to Designr Labs
              </h1>
              <p className="mt-3 text-gray-600">
                Transform any design screenshot into precise AI prompts. Sign in to start translating visual designs into code.
              </p>
            </div>

            {/* Feature Preview */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <div className="w-10 h-10 mx-auto mb-2 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Upload Design</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <div className="w-10 h-10 mx-auto mb-2 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">AI Analysis</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <div className="w-10 h-10 mx-auto mb-2 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Copy Prompt</p>
              </div>
            </div>

            <LoginForm />
          </div>
        )}
      </main>
    </div>
  );
}

// Placeholder component for Infinite Canvas (future feature)
function InfiniteCanvasPlaceholder() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">Infinite Canvas</h2>
        <p className="text-gray-600 mb-6">
          Coming soon! An infinite workspace to arrange, annotate, and organize your design references.
          Drag and drop screenshots, draw connections, and build visual prompt workflows.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">Planned Features:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Drag-and-drop design screenshots
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Annotation tools (arrows, highlights, notes)
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connect designs to show component relationships
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Export visual boards as prompt workflows
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Real-time collaboration (Pro feature)
            </li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-primary-700">
            <strong>Tech Stack:</strong> Built with Tldraw or Excalidraw for the canvas,
            integrated with Claude Vision for on-canvas analysis.
          </p>
        </div>
      </div>
    </div>
  );
}

// Placeholder component for Inspiration Library (future feature)
function InspirationLibraryPlaceholder() {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">Inspiration Library</h2>
        <p className="text-gray-600 mb-6">
          Coming soon! Save and organize your favorite design references. Tag them, search them,
          and reuse prompts across projects.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">Planned Features:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Save designs with auto-generated prompts
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Tag and categorize (e.g., &quot;Hero sections&quot;, &quot;Pricing pages&quot;)
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Search by design pattern or color scheme
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Share collections with team members
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-primary-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Browser extension to capture designs from any site
            </li>
          </ul>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {/* Mock library cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
