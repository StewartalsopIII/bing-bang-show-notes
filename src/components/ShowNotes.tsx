import { useState } from 'react';

type ShowNotesProps = {
  showNotes: string;
  onBack: () => void;
};

export default function ShowNotes({ showNotes, onBack }: ShowNotesProps) {
  const [format, setFormat] = useState<'markdown' | 'text'>('markdown');

  const downloadShowNotes = () => {
    const element = document.createElement('a');
    const file = new Blob([showNotes], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `podcast-show-notes.${format === 'markdown' ? 'md' : 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Show Notes</h2>
        <div className="flex space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Transcript
          </button>
          
          <div className="relative inline-block">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'markdown' | 'text')}
              className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="markdown">Markdown (.md)</option>
              <option value="text">Text (.txt)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <button
            onClick={downloadShowNotes}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Download
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-md border border-gray-200 prose prose-blue max-w-none">
        {format === 'markdown' ? (
          <div className="whitespace-pre-wrap">{showNotes}</div>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm">{showNotes}</pre>
        )}
      </div>
    </div>
  );
}
