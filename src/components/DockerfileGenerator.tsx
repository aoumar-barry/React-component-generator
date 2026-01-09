'use client';

import { useState, useRef, useEffect } from 'react';
import { AIProvider } from '@/types';
import CodeDisplay from './CodeDisplay';
import { useSidebar } from '@/contexts/SidebarContext';

export default function DockerfileGenerator() {
  const [description, setDescription] = useState('');
  const [generatedDockerfile, setGeneratedDockerfile] = useState<string | null>(null);
  const [helpfulResponse, setHelpfulResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [error, setError] = useState<string | null>(null);
  const [isValidationMessage, setIsValidationMessage] = useState(false);
  const [showAttentionGuide, setShowAttentionGuide] = useState(false);
  const [tokenLimitReached, setTokenLimitReached] = useState(false);
  const [isLeftSectionCollapsed, setIsLeftSectionCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { collapseSidebar } = useSidebar();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please enter an application description');
      return;
    }

    // Save the description before clearing
    const descriptionToSend = description.trim();

    // Collapse sidebar when generating
    collapseSidebar();

    setIsLoading(true);
    setError(null);
    setIsValidationMessage(false);
    setGeneratedDockerfile('');
    setHelpfulResponse('');
    setTokenLimitReached(false);
    
    // Clear the input field
    setDescription('');

    try {
      const response = await fetch('/api/generate-dockerfile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: descriptionToSend,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate Dockerfile');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let accumulatedDockerfile = '';
      let accumulatedResponse = '';
      let isHelpfulResponseType = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                setIsValidationMessage(false);
                throw new Error(data.error);
              }
              
              if (data.tokenLimitReached) {
                setTokenLimitReached(true);
                setError(data.message || 'Token limit reached (200 tokens maximum). Generation stopped for security.');
                setIsValidationMessage(true);
                setIsLoading(false);
                break;
              }
              
              if (data.done) {
                setIsLoading(false);
                if (data.tokenLimitReached) {
                  setTokenLimitReached(true);
                }
                break;
              }
              
              if (data.chunk) {
                if (data.isHelpfulResponse) {
                  // This is a helpful response, not code
                  isHelpfulResponseType = true;
                  accumulatedResponse += data.chunk;
                  setHelpfulResponse(accumulatedResponse);
                  setGeneratedDockerfile(null);
                  // Show attention guide when first chunk arrives
                  if (accumulatedResponse.length === data.chunk.length) {
                    setShowAttentionGuide(true);
                    setTimeout(() => setShowAttentionGuide(false), 3000);
                  }
                } else {
                  // This is Dockerfile generation
                  accumulatedDockerfile += data.chunk;
                  setGeneratedDockerfile(accumulatedDockerfile);
                  setHelpfulResponse(null);
                  // Show attention guide when first chunk arrives
                  if (accumulatedDockerfile.length === data.chunk.length) {
                    setShowAttentionGuide(true);
                    setTimeout(() => setShowAttentionGuide(false), 3000);
                  }
                }
              }
              
              if (data.done && data.isHelpfulResponse) {
                isHelpfulResponseType = true;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setGeneratedDockerfile(null);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && description.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main Content - Split Layout */}
      <div className="flex-1 flex gap-6 px-4 pb-4 overflow-hidden relative">
        {/* Left Side - Input Section (70% when code exists, 100% otherwise) */}
        <div 
          className={`transition-all duration-700 ease-in-out ${
            isLeftSectionCollapsed 
              ? 'w-0 opacity-0 pointer-events-none' 
              : generatedDockerfile || isLoading 
                ? 'w-[70%]' 
                : 'w-full max-w-2xl mx-auto'
          } flex flex-col`}
        >
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            {/* Title */}
            <div className="w-full max-w-2xl mb-6 px-4">
              <h1 className="text-3xl font-semibold text-white text-center mb-2">
                Dockerfile Generator
              </h1>
              <p className="text-sm text-gray-400 text-center">
                Describe your application and get an optimized, production-ready Dockerfile
              </p>
            </div>
            
            {/* Input Section */}
            <div className="w-full max-w-2xl px-4 relative">
              <div className="flex items-center gap-2 bg-[#2a2a2a] rounded-xl px-4 py-3 border border-[#3a3a3a] focus-within:border-[#4a4a4a] transition-colors shadow-sm">
                {/* Left side buttons */}
                <div className="flex items-center gap-2">
                  {/* Provider Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                      disabled={isLoading}
                      className="appearance-none bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white text-sm px-3 py-1.5 pr-8 rounded-lg border border-[#4a4a4a] cursor-pointer transition-colors focus:outline-none focus:border-[#5a5a5a] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Gemini</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {isLoading && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3a8bfd] rounded-full text-white text-sm">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Thinking</span>
                      <button
                        onClick={() => setIsLoading(false)}
                        className="ml-1 hover:opacity-70"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Input field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your application or containerization needs..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm"
                />

                {/* Right side buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Submit"
                    onClick={handleGenerate}
                    disabled={isLoading || !description.trim()}
                  >
                    <svg className="w-4 h-4 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className={`mt-4 p-4 rounded-lg ${
                  isValidationMessage 
                    ? 'bg-blue-900/20 border border-blue-800' 
                    : 'bg-red-900/20 border border-red-800'
                }`}>
                  <p className={`text-sm leading-relaxed ${
                    isValidationMessage 
                      ? 'text-blue-300' 
                      : 'text-red-400'
                  }`}>
                    {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Dockerfile/Response Display */}
        {(generatedDockerfile || helpfulResponse || isLoading) && (
          <div className={`flex flex-col animate-slide-in-right relative transition-all duration-700 ${
            isLeftSectionCollapsed ? 'w-full' : 'w-[30%]'
          }`}>
            {/* Attention Guide Arrow - appears briefly when response first generates */}
            {showAttentionGuide && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-4 animate-pulse-slow pointer-events-none z-10">
                <div className="flex items-center gap-3 bg-[#2a2a2a]/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#3a8bfd]/50 shadow-lg">
                  <div className="text-white/80 text-sm font-medium">
                    {helpfulResponse ? 'Response ready!' : 'Dockerfile generated!'}
                  </div>
                  <svg className="w-6 h-6 text-[#3a8bfd] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}

            <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] overflow-hidden h-full flex flex-col shadow-2xl relative">
              {/* Collapse/Expand Button - Top Right */}
              {!isLoading && (generatedDockerfile || helpfulResponse) && (
                <button
                  onClick={() => setIsLeftSectionCollapsed(!isLeftSectionCollapsed)}
                  className="absolute top-4 right-4 z-20 bg-[#2a2a2a]/80 hover:bg-[#3a3a3a]/80 backdrop-blur-sm text-gray-400 hover:text-white rounded-lg p-2 border border-[#3a3a3a] hover:border-[#4a4a4a] transition-all duration-200 group"
                  title={isLeftSectionCollapsed ? "Expand input area" : "Collapse to view full content"}
                >
                  {isLeftSectionCollapsed ? (
                    <svg 
                      className="w-4 h-4 transition-transform group-hover:translate-x-0.5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  ) : (
                    <svg 
                      className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  )}
                </button>
              )}

              <div className="p-4 border-b border-[#3a3a3a] flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-400">
                  {helpfulResponse ? 'Response' : 'Generated Dockerfile'}
                </h3>
              </div>
              <div className="flex-1 overflow-hidden">
                {helpfulResponse ? (
                  <div className="w-full h-full overflow-auto bg-[#1a1a1a] p-6">
                    <div className="prose prose-invert max-w-none">
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                        {helpfulResponse}
                      </p>
                    </div>
                  </div>
                ) : generatedDockerfile ? (
                  <CodeDisplay code={generatedDockerfile} language="dockerfile" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#3a8bfd]/30 border-t-[#3a8bfd] rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Generating...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


