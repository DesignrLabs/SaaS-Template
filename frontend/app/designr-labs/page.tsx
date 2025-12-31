'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, signOut } from '@/services/supabase';
import LoginForm from '@/components/auth/LoginForm';
import ImagePromptTranslator from '@/components/vision/ImagePromptTranslator';

export default function DesignrLabs() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-xl text-primary-600">
            Designr Labs
          </Link>

          {user ? (
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign Out
            </button>
          ) : (
            <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {user ? (
          <ImagePromptTranslator />
        ) : (
          <div className="max-w-md mx-auto">
            {/* Simple explanation for non-coders */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Show AI What You Want to Build
              </h1>
              <p className="text-lg text-gray-600">
                Drop a screenshot of any design you like.
                Get back the exact words to tell AI to build it for you.
              </p>
            </div>

            {/* How it works - no jargon */}
            <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 text-center">How it works</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Find something you like</p>
                    <p className="text-sm text-gray-500">Screenshot any website, app, or design</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Drop it here</p>
                    <p className="text-sm text-gray-500">Paste or drag your screenshot</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Copy the instructions</p>
                    <p className="text-sm text-gray-500">Give them to any AI tool to build it</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign in */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-center text-sm text-gray-500 mb-4">
                Sign in to start
              </p>
              <LoginForm />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
