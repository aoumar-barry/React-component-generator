'use client';

import { useState, useRef, useEffect } from 'react';
import { AIProvider } from '@/types';
import { useSidebar } from '@/contexts/SidebarContext';
import MarkdownRenderer from './MarkdownRenderer';
import CodeDisplay from './CodeDisplay';

export default function NetworkTroubleshooting() {
  const [description, setDescription] = useState('');
  const [troubleshootingResponse, setTroubleshootingResponse] = useState<string | null>(null);
  const [helpfulResponse, setHelpfulResponse] = useState<string | null>(null);
  const [extractedCode, setExtractedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingCode, setIsExtractingCode] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [error, setError] = useState<string | null>(null);
  const [isValidationMessage, setIsValidationMessage] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isLeftSectionCollapsed, setIsLeftSectionCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { collapseSidebar } = useSidebar();

  // Helper function to detect if markdown contains code blocks
  const hasCodeBlocks = (markdown: string): boolean => {
    // Check for code blocks with ``` or ```
    const codeBlockRegex = /```[\s\S]*?```/g;
    return codeBlockRegex.test(markdown);
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTroubleshoot = () => {
    if (!description.trim()) {
      setError('Please describe a network problem');
      return;
    }

    // Collapse sidebar when generating
    collapseSidebar();

    // Start fade-out animation
    setIsFadingOut(true);
    
    // Save the description before clearing
    const descriptionToSend = description.trim();
    
    // Clear previous state
    setError(null);
    setIsValidationMessage(false);
    setTroubleshootingResponse(null);
    setHelpfulResponse(null);
    setExtractedCode(null);
    setIsExtractingCode(false);
    
    // Clear the textarea
    setDescription('');
    
    // Wait for fade-out animation, then show new layout
    setTimeout(() => {
      setHasSubmitted(true);
      setIsFadingOut(false);
      setIsLoading(true);
      
      // Start API request immediately
      const makeRequest = async () => {
        try {
          const response = await fetch('/api/network-troubleshooting', {
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
            throw new Error(errorText || `Failed to generate troubleshooting guide (Status: ${response.status})`);
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          let buffer = '';
          let accumulatedResponse = '';
          let accumulatedTroubleshooting = '';
          let isHelpfulResponseType = false;

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr) continue;
                  
                  const data = JSON.parse(jsonStr);
                  
                  if (data.error) {
                    setIsValidationMessage(false);
                    throw new Error(data.error);
                  }
                  
                  if (data.tokenLimitReached) {
                    setError(data.message || 'Token limit reached (2000 tokens maximum). Generation stopped for security.');
                    setIsValidationMessage(true);
                    setIsLoading(false);
                    break;
                  }
                  
                  if (data.done) {
                    setIsLoading(false);
                    if (data.tokenLimitReached) {
                      setError('Token limit reached (2000 tokens maximum). Generation stopped for security.');
                      setIsValidationMessage(true);
                    }
                    
                    // If we got a troubleshooting guide (not a helpful response), check for code and extract it
                    if (!isHelpfulResponseType && accumulatedTroubleshooting.trim() && hasCodeBlocks(accumulatedTroubleshooting)) {
                      // Extract code from the troubleshooting guide
                      extractCode(accumulatedTroubleshooting);
                    }
                    break;
                  }
                  
                  if (data.chunk) {
                    if (data.isHelpfulResponse) {
                      // This is a helpful response, not troubleshooting guide
                      isHelpfulResponseType = true;
                      accumulatedResponse += data.chunk;
                      setHelpfulResponse(accumulatedResponse);
                      setTroubleshootingResponse(null);
                    } else {
                      // This is troubleshooting guide
                      accumulatedTroubleshooting += data.chunk;
                      setTroubleshootingResponse(accumulatedTroubleshooting);
                      setHelpfulResponse(null);
                    }
                  }
                  
                  if (data.done && data.isHelpfulResponse) {
                    isHelpfulResponseType = true;
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                  if (!(e instanceof SyntaxError)) {
                    console.error('Error parsing SSE data:', e, 'Line:', line);
                  }
                }
              }
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          console.error('Error generating troubleshooting guide:', err);
          setError(errorMessage);
          setTroubleshootingResponse(null);
          setIsLoading(false);
        }
      };
      
      // Start the API request immediately
      makeRequest();
    }, 400);
  };

  const extractCode = async (guide: string) => {
    setIsExtractingCode(true);
    setExtractedCode('');

    try {
      const response = await fetch('/api/network-troubleshooting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          troubleshootingGuide: guide,
          provider: selectedProvider,
          mode: 'extract-code',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to extract code');
      }

      // Handle streaming response for code extraction
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let accumulatedCode = '';

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
                setIsExtractingCode(false);
                break;
              }
              
              if (data.chunk) {
                accumulatedCode += data.chunk;
                setExtractedCode(accumulatedCode);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract code';
      console.error('Error extracting code:', err);
      setIsExtractingCode(false);
      // Don't show error to user, just silently fail
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && !isLoading && description.trim()) {
      e.preventDefault();
      handleTroubleshoot();
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Title Bar - Only visible when submitted */}
      {hasSubmitted && (
        <div className={`flex-shrink-0 px-4 pt-4 pb-2 transition-all duration-700 animate-slide-in-from-bottom ${
          isLeftSectionCollapsed ? 'w-full' : extractedCode ? 'w-[70%]' : 'w-full'
        }`}>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Network Troubleshooting Assistant
          </h1>
          <p className="text-sm text-gray-400">
            Comprehensive network troubleshooting guide
          </p>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex gap-6 px-4 pb-4 overflow-hidden relative">
        {/* Left Side - Explanations (70% when code exists, 100% otherwise) - Only visible when submitted */}
        {hasSubmitted && (
          <div className={`flex flex-col overflow-hidden transition-all duration-700 ${
            isLeftSectionCollapsed 
              ? 'w-0 opacity-0 pointer-events-none' 
              : extractedCode 
                ? 'w-[70%] animate-slide-in-from-left' 
                : 'w-full animate-slide-in-from-left'
          }`}>
            {/* Explanations Section (Top, scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 mb-4">
              {troubleshootingResponse ? (
                <div className="prose prose-invert max-w-none">
                  <MarkdownRenderer content={troubleshootingResponse} />
                </div>
              ) : helpfulResponse ? (
                <div className="prose prose-invert max-w-none">
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {helpfulResponse}
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating troubleshooting guide...</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 text-sm">
                    Waiting for response...
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

              {/* Input Container with Controls */}
              <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] focus-within:border-[#4a4a4a] transition-colors overflow-hidden shadow-sm flex flex-col">
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe your network problem or paste a network command... (Ctrl+Enter to troubleshoot)"
                  disabled={isLoading}
                  className="w-full h-20 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm px-5 pt-3 pb-2 resize-none"
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
                      <span>Analyzing</span>
                    </div>
                  )}

                  {/* Right side - Submit button */}
                  <button
                    type="button"
                    onClick={handleTroubleshoot}
                    disabled={isLoading || !description.trim()}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors ml-auto"
                    title="Troubleshoot Network"
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

        {/* Right Side - Extracted Code (30%) - Only visible when code is extracted */}
        {extractedCode && (
          <div className={`flex flex-col gap-4 transition-all duration-700 ${
            isLeftSectionCollapsed 
              ? 'w-full animate-slide-in-from-right' 
              : 'w-[30%] animate-slide-in-from-right'
          }`} style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] overflow-hidden flex flex-col shadow-2xl flex-1 min-h-0 relative">
              {/* Collapse/Expand Button - Top Right */}
              {!isExtractingCode && extractedCode && (
                <button
                  onClick={() => setIsLeftSectionCollapsed(!isLeftSectionCollapsed)}
                  className="absolute top-4 right-4 z-20 bg-[#2a2a2a]/80 hover:bg-[#3a3a3a]/80 backdrop-blur-sm text-gray-400 hover:text-white rounded-lg p-2 border border-[#3a3a3a] hover:border-[#4a4a4a] transition-all duration-200 group"
                  title={isLeftSectionCollapsed ? "Expand explanations area" : "Collapse to view full code"}
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
                <h3 className="text-sm font-medium text-gray-400">Extracted Code</h3>
              </div>
              <div className="flex-1 overflow-hidden">
                {extractedCode ? (
                  <CodeDisplay code={extractedCode} language="bash" />
                ) : isExtractingCode ? (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#3a8bfd]/30 border-t-[#3a8bfd] rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Extracting code...</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Initial State - Centered Textarea */}
        {!hasSubmitted && (
          <div className={`w-full h-full flex items-center justify-center absolute inset-0 ${isFadingOut ? 'animate-slide-out-center' : ''}`}>
            <div className="w-full max-w-2xl px-4">
              {/* Title */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-semibold text-white mb-2">
                  Network Troubleshooting Assistant
                </h1>
                <p className="text-sm text-gray-400">
                  Describe your network problem or paste a network command to get a comprehensive troubleshooting guide
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

              {/* Input Container with Controls */}
              <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] focus-within:border-[#4a4a4a] transition-colors overflow-hidden shadow-sm flex flex-col">
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe your network problem or paste a network command... (Ctrl+Enter to troubleshoot)"
                  disabled={isLoading}
                  className="w-full h-72 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm px-5 pt-5 pb-2 resize-none"
                  style={{ lineHeight: '1.75' }}
                />
                
                {/* Footer with Controls */}
                <div className="border-t border-[#3a3a3a] px-5 py-3 flex items-center gap-2">
                  {/* Left side - Provider Dropdown */}
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
                      <span>Analyzing</span>
                    </div>
                  )}

                  {/* Right side - Submit button */}
                  <button
                    type="button"
                    onClick={handleTroubleshoot}
                    disabled={isLoading || !description.trim()}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors ml-auto"
                    title="Troubleshoot Network"
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

