'use client';

import { useState } from 'react';
import TranscriptUploader from '@/components/TranscriptUploader';
import ShowNotes from '@/components/ShowNotes';
import { generateShowNotes } from '@/lib/geminiService';
import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs';

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [showNotes, setShowNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranscriptReceived = async (text: string) => {
    setTranscript(text);
    setIsLoading(true);
    setError('');
    
    try {
      const notes = await generateShowNotes(text);
      setShowNotes(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error generating show notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowNotes('');
  };

  return (
    <>
      <SignedOut>
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <SignIn afterSignInUrl="/" />
        </main>
      </SignedOut>

      <SignedIn>
        <main className="flex min-h-screen flex-col items-center justify-between p-8 bg-gray-50">
          <div className="w-full max-w-5xl">
            <h1 className="text-4xl font-bold text-center mb-8">Bing Bang Show Notes</h1>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Transform your podcast transcripts into professional show notes using Google Gemini AI.
            </p>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {!showNotes ? (
              <TranscriptUploader 
                onTranscriptReceived={handleTranscriptReceived} 
                isLoading={isLoading} 
              />
            ) : (
              <ShowNotes showNotes={showNotes} onBack={handleBack} />
            )}
          </div>
        </main>
      </SignedIn>
    </>
  );
}
