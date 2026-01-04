'use client';

import { AIProvider } from '@/types';

interface ProviderToggleProps {
  selectedProvider: AIProvider;
  onChange: (provider: AIProvider) => void;
}

export default function ProviderToggle({ selectedProvider, onChange }: ProviderToggleProps) {
  return (
    <div className="flex gap-4 items-center">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        AI Provider:
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('openai')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedProvider === 'openai'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          aria-pressed={selectedProvider === 'openai'}
        >
          OpenAI
        </button>
        <button
          type="button"
          onClick={() => onChange('gemini')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedProvider === 'gemini'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          aria-pressed={selectedProvider === 'gemini'}
        >
          Gemini
        </button>
      </div>
    </div>
  );
}

