import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

type TranscriptUploaderProps = {
  onTranscriptReceived: (transcript: string) => void;
  isLoading: boolean;
};

export default function TranscriptUploader({ onTranscriptReceived, isLoading }: TranscriptUploaderProps) {
  const [transcript, setTranscript] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transcript.trim()) {
      onTranscriptReceived(transcript);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    try {
      const file = acceptedFiles[0];
      const content = await file.text();
      setTranscript(content);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/vtt': ['.vtt'],
      'text/srt': ['.srt'],
      'text/markdown': ['.md']
    },
    multiple: false
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Upload Podcast Transcript</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="transcript" className="block font-medium text-gray-700">
            Paste your transcript here
          </label>
          <textarea
            id="transcript"
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your podcast transcript here..."
            disabled={isLoading}
          />
        </div>

        <div 
          {...getRootProps()} 
          className={`p-8 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-500">Drop the transcript file here...</p>
          ) : (
            <div>
              <p className="mb-2">Drag and drop a transcript file here, or click to select a file</p>
              <p className="text-sm text-gray-500">Supported formats: .txt, .vtt, .srt, .md</p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!transcript.trim() || isLoading}
          >
            {isLoading ? 'Generating Show Notes...' : 'Generate Show Notes'}
          </button>
        </div>
      </form>
    </div>
  );
}
