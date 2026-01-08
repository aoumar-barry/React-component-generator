'use client';

import { useState, useRef, useEffect } from 'react';
import { AIProvider } from '@/types';
import CodeDisplay from './CodeDisplay';
import { useSidebar } from '@/contexts/SidebarContext';
import MarkdownRenderer from './MarkdownRenderer';

export default function SQLOptimizer() {
  const [sqlQuery, setSqlQuery] = useState('');
  const [originalQuery, setOriginalQuery] = useState<string | null>(null);
  const [optimizedQuery, setOptimizedQuery] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<string | null>(null);
  const [helpfulResponse, setHelpfulResponse] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [error, setError] = useState<string | null>(null);
  const [isValidationMessage, setIsValidationMessage] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isLeftSectionCollapsed, setIsLeftSectionCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { collapseSidebar } = useSidebar();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleOptimize = () => {
    if (!sqlQuery.trim()) {
      setError('Please enter a SQL query to optimize');
      return;
    }

    // Collapse sidebar when generating
    collapseSidebar();

    // Start fade-out animation
    setIsFadingOut(true);
    
    // Clear previous state
    setError(null);
    setIsValidationMessage(false);
    setOptimizedQuery(null);
    setExplanations(null);
    setHelpfulResponse(null);
    
    // Set original query immediately (before transition)
    setOriginalQuery(sqlQuery.trim());
    
    // Clear the textarea
    setSqlQuery('');
    
    // Wait for fade-out animation, then show new layout
    setTimeout(() => {
      setHasSubmitted(true);
      setIsFadingOut(false);
      setIsOptimizing(true);
      
      // Start API request immediately
      const makeRequest = async () => {
        try {
          // Send request to API
          const requestBody = {
            query: sqlQuery.trim(),
            provider: selectedProvider,
            mode: 'optimize' as const,
          };

          console.log('Sending request to API...', requestBody);
          const response = await fetch('/api/optimize-sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('Response received, status:', response.status, 'ok:', response.ok);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Failed to optimize SQL query (Status: ${response.status})`);
          }

          // Handle streaming response for optimization
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          console.log('Stream reader created, starting to read...');

          let buffer = '';
          let accumulatedCode = '';
          let accumulatedResponse = '';
          let isHelpfulResponseType = false;
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('Stream reading complete. Total chunks:', chunkCount, 'Accumulated code length:', accumulatedCode.length);
              break;
            }

            const decoded = decoder.decode(value, { stream: true });
            console.log('Raw stream chunk received, bytes:', value.length, 'decoded length:', decoded.length);
            buffer += decoded;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue; // Skip empty lines
              
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr) continue; // Skip empty data lines
                  
                  const data = JSON.parse(jsonStr);
                  
                  // Debug: log all data events
                  if (data.chunk) {
                    chunkCount++;
                    console.log(`[Chunk #${chunkCount}] Length: ${data.chunk.length}, Preview: "${data.chunk.substring(0, 30)}...", isHelpfulResponse: ${data.isHelpfulResponse}`);
                  }
                  
                  if (data.done) {
                    console.log('[Done] Event received, isHelpfulResponse:', data.isHelpfulResponse);
                  }
                  
                  if (data.error) {
                    setIsValidationMessage(false);
                    throw new Error(data.error);
                  }
                  
                  if (data.tokenLimitReached) {
                    setError(data.message || 'Token limit reached. Generation stopped for security.');
                    setIsValidationMessage(true);
                    setIsOptimizing(false);
                    break;
                  }
                  
                  // Process chunks FIRST for immediate streaming
                  if (data.chunk) {
                    // Process chunk immediately for streaming effect
                    if (data.isHelpfulResponse) {
                      isHelpfulResponseType = true;
                      accumulatedResponse += data.chunk;
                      setHelpfulResponse(accumulatedResponse);
                      setOptimizedQuery(null);
                    } else {
                      accumulatedCode += data.chunk;
                      // Update state immediately for streaming
                      setOptimizedQuery(accumulatedCode);
                      setHelpfulResponse(null);
                      // Debug log
                      if (accumulatedCode.length === data.chunk.length) {
                        console.log('First chunk received, length:', data.chunk.length);
                      }
                    }
                  }
                  
                  // Check for completion AFTER processing chunks
                  if (data.done) {
                    setIsOptimizing(false);
                    isHelpfulResponseType = data.isHelpfulResponse || false;
                    
                    // If we got an optimized query (not a helpful response), start generating explanations
                    if (!isHelpfulResponseType && accumulatedCode.trim()) {
                      // Start explanation generation
                      generateExplanations(sqlQuery.trim(), accumulatedCode.trim());
                    } else if (isHelpfulResponseType && accumulatedResponse.trim()) {
                      // If it was a helpful response, make sure it's set
                      setHelpfulResponse(accumulatedResponse);
                    } else if (!accumulatedCode.trim() && !accumulatedResponse.trim()) {
                      // No data received - show error
                      setError('No response received from the server. Please try again.');
                    }
                    break;
                  }
                } catch (e) {
                  // Skip invalid JSON lines but don't break the stream
                  // Only log if it's a real error, not just malformed JSON
                  if (e instanceof SyntaxError) {
                    // Skip - likely incomplete JSON
                    continue;
                  }
                  console.error('Error parsing SSE data:', e, 'Line:', line);
                }
              }
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          console.error('Error optimizing SQL:', err);
          setError(errorMessage);
          setOptimizedQuery(null);
          setIsOptimizing(false);
        }
      };
      
      // Start the API request immediately
      makeRequest();
    }, 400);
  };

  const generateExplanations = async (original: string, optimized: string) => {
    setIsExplaining(true);
    setExplanations('');

    try {
      const response = await fetch('/api/optimize-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalQuery: original,
          optimizedQuery: optimized,
          provider: selectedProvider,
          mode: 'explain',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate explanations');
      }

      // Handle streaming response for explanations
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let accumulatedExplanation = '';

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
                throw new Error(data.error);
              }
              
              if (data.done) {
                setIsExplaining(false);
                break;
              }
              
              if (data.chunk) {
                accumulatedExplanation += data.chunk;
                setExplanations(accumulatedExplanation);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate explanations';
      setError(errorMessage);
      setIsExplaining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && !isOptimizing && sqlQuery.trim()) {
      e.preventDefault();
      handleOptimize();
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Title Bar - Only visible when submitted */}
      {hasSubmitted && (
        <div className={`flex-shrink-0 px-4 pt-4 pb-2 transition-all duration-700 animate-slide-in-from-bottom ${
          isLeftSectionCollapsed ? 'w-full' : 'w-[70%]'
        }`}>
          <h1 className="text-3xl font-semibold text-white mb-2">
            SQL Query Optimizer
          </h1>
          <p className="text-sm text-gray-400">
            Optimized query with detailed explanations
          </p>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex gap-6 px-4 pb-4 overflow-hidden relative">
        {/* Left Side - Explanations (70%) - Only visible when submitted */}
        {hasSubmitted && (
          <div className={`flex flex-col overflow-hidden transition-all duration-700 ${
            isLeftSectionCollapsed 
              ? 'w-0 opacity-0 pointer-events-none' 
              : 'w-[70%] animate-slide-in-from-left'
          }`}>
            {/* Explanations Section (Top, scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 mb-4">
              {/* Original Query - Always shown in copyable zone */}
              {originalQuery && (
                <div className="mb-6 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-[#3a3a3a] flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-400">Original Query</h3>
                  </div>
                  <div className="p-4">
                    <CodeDisplay code={originalQuery} language="sql" />
                  </div>
                </div>
              )}
              
              {explanations ? (
                <div className="prose prose-invert max-w-none">
                  <MarkdownRenderer content={explanations} />
                </div>
              ) : isExplaining ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating explanations...</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 text-sm">
                    Waiting for optimization to complete...
                  </div>
                </div>
              )}
            </div>

            {/* Input Section (Bottom, fixed) */}
            <div className="flex-shrink-0 animate-slide-in-from-bottom" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              {error && (
                <div className={`mb-4 p-4 rounded-lg ${
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

              {/* Code Input Container with Controls */}
              <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] focus-within:border-[#4a4a4a] transition-colors overflow-hidden shadow-sm flex flex-col">
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Paste your SQL query here... (Ctrl+Enter to optimize)"
                  disabled={isOptimizing}
                  className="w-full h-20 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm px-5 pt-3 pb-2 resize-none font-mono"
                  style={{ lineHeight: '1.75' }}
                  rows={3}
                />
                
                {/* Footer with Controls */}
                <div className="border-t border-[#3a3a3a] px-5 py-3 flex items-center gap-2">
                  {/* Left side - Provider Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                      disabled={isOptimizing}
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

                  {(isOptimizing || isExplaining) && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3a8bfd] rounded-full text-white text-sm">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{isExplaining ? 'Explaining' : 'Optimizing'}</span>
                    </div>
                  )}

                  {/* Right side - Submit button */}
                  <button
                    type="button"
                    onClick={handleOptimize}
                    disabled={isOptimizing || !sqlQuery.trim()}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors ml-auto"
                    title="Optimize SQL"
                  >
                    <svg className="w-4 h-4 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side - Queries (30%) - Only visible when submitted */}
        {hasSubmitted && (
          <div className={`flex flex-col gap-4 transition-all duration-700 ${
            isLeftSectionCollapsed 
              ? 'w-full animate-slide-in-from-right' 
              : 'w-[30%] animate-slide-in-from-right'
          }`} style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            {/* Optimized Query - Streamed */}
            {(optimizedQuery || helpfulResponse || isOptimizing) && (
              <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] overflow-hidden flex flex-col shadow-2xl flex-1 min-h-0 relative">
                {/* Collapse/Expand Button - Top Right */}
                {!isOptimizing && (optimizedQuery || helpfulResponse) && (
                  <button
                    onClick={() => setIsLeftSectionCollapsed(!isLeftSectionCollapsed)}
                    className="absolute top-4 right-4 z-20 bg-[#2a2a2a]/80 hover:bg-[#3a3a3a]/80 backdrop-blur-sm text-gray-400 hover:text-white rounded-lg p-2 border border-[#3a3a3a] hover:border-[#4a4a4a] transition-all duration-200 group"
                    title={isLeftSectionCollapsed ? "Expand explanations area" : "Collapse to view full query"}
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
                {helpfulResponse ? (
                  <>
                    <div className="p-4 border-b border-[#3a3a3a] flex-shrink-0">
                      <h3 className="text-sm font-medium text-gray-400">Response</h3>
                    </div>
                    <div className="flex-1 overflow-auto bg-[#1a1a1a] p-6">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                          {helpfulResponse}
                        </p>
                      </div>
                    </div>
                  </>
                ) : optimizedQuery ? (
                  <>
                    <div className="p-4 border-b border-[#3a3a3a] flex-shrink-0">
                      <h3 className="text-sm font-medium text-gray-400">Optimized Query</h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <CodeDisplay code={optimizedQuery} language="sql" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 border-b border-[#3a3a3a] flex-shrink-0">
                      <h3 className="text-sm font-medium text-gray-400">Optimized Query</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-[#3a8bfd]/30 border-t-[#3a8bfd] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">Optimizing query...</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Initial State - Centered Textarea */}
        {!hasSubmitted && (
          <div className={`w-full h-full flex items-center justify-center absolute inset-0 ${isFadingOut ? 'animate-slide-out-center' : ''}`}>
            <div className="w-full max-w-2xl px-4">
              {/* Title */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-semibold text-white mb-2">
                  SQL Query Optimizer
                </h1>
                <p className="text-sm text-gray-400">
                  Paste your SQL query below to get an optimized version with detailed explanations
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className={`mb-4 p-4 rounded-lg ${
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

              {/* Code Input Container with Controls */}
              <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] focus-within:border-[#4a4a4a] transition-colors overflow-hidden shadow-sm flex flex-col">
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Paste your SQL query here... (Ctrl+Enter to optimize)"
                  disabled={isOptimizing}
                  className="w-full h-72 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm px-5 pt-5 pb-2 resize-none font-mono"
                  style={{ lineHeight: '1.75' }}
                />
                
                {/* Footer with Controls */}
                <div className="border-t border-[#3a3a3a] px-5 py-3 flex items-center gap-2">
                  {/* Left side - Provider Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                      disabled={isOptimizing}
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

                  {(isOptimizing || isExplaining) && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3a8bfd] rounded-full text-white text-sm">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{isExplaining ? 'Explaining' : 'Optimizing'}</span>
                    </div>
                  )}

                  {/* Right side - Submit button */}
                  <button
                    type="button"
                    onClick={handleOptimize}
                    disabled={isOptimizing || !sqlQuery.trim()}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors ml-auto"
                    title="Optimize SQL"
                  >
                    <svg className="w-4 h-4 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
