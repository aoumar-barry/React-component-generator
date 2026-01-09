'use client';

import { useState, useRef, useEffect } from 'react';
import { AIProvider } from '@/types';
import CodeDisplay from './CodeDisplay';
import { detectLanguage, LanguageInfo } from '@/lib/language-detection';
import { useSidebar } from '@/contexts/SidebarContext';

export default function UnitTestGenerator() {
  const [code, setCode] = useState('');
  const [generatedTests, setGeneratedTests] = useState<string | null>(null);
  const [helpfulResponse, setHelpfulResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [error, setError] = useState<string | null>(null);
  const [isValidationMessage, setIsValidationMessage] = useState(false);
  const [showAttentionGuide, setShowAttentionGuide] = useState(false);
  const [tokenLimitReached, setTokenLimitReached] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageInfo | null>(null);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [isLeftSectionCollapsed, setIsLeftSectionCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { collapseSidebar } = useSidebar();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Clear detected language when code changes or is empty
  useEffect(() => {
    if (!code.trim()) {
      setDetectedLanguage(null);
      setIsDetectingLanguage(false);
    }
  }, [code]);

  const handleGenerate = async () => {
    if (!code.trim()) {
      setError('Please paste your code to generate unit tests');
      return;
    }

    // Validate line count (max 1000 lines)
    const lineCount = code.split('\n').length;
    if (lineCount > 1000) {
      setError(`Code exceeds maximum limit of 1000 lines. Your code has ${lineCount} lines. Please reduce the code size.`);
      return;
    }

    // Save the code before clearing
    const codeToSend = code.trim();

    // Collapse sidebar when generating
    collapseSidebar();

    setIsLoading(true);
    setIsDetectingLanguage(true);
    setError(null);
    setIsValidationMessage(false);
    setGeneratedTests('');
    setHelpfulResponse('');
    setTokenLimitReached(false);
    // Clear previous detection when starting new generation
    setDetectedLanguage(null);
    
    // Clear the textarea
    setCode('');

    try {
      const response = await fetch('/api/generate-unit-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: codeToSend,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate unit tests');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let accumulatedTests = '';
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
              
              // Handle language detection result
              if (data.languageDetected) {
                setIsDetectingLanguage(false);
                setDetectedLanguage({
                  language: data.language as any,
                  framework: data.framework,
                  displayName: data.displayName,
                  fileExtension: '',
                });
                continue;
              }
              
              if (data.error) {
                setIsValidationMessage(false);
                throw new Error(data.error);
              }
              
              if (data.tokenLimitReached) {
                setTokenLimitReached(true);
                setError(data.message || 'Token limit reached (1000 tokens maximum). Generation stopped for security.');
                setIsValidationMessage(true);
                setIsLoading(false);
                setIsDetectingLanguage(false);
                // Clear detection if not detected
                if (!detectedLanguage || detectedLanguage.language === 'unknown') {
                  setDetectedLanguage(null);
                }
                break;
              }
              
              if (data.done) {
                setIsLoading(false);
                setIsDetectingLanguage(false);
                if (data.tokenLimitReached) {
                  setTokenLimitReached(true);
                }
                // If streaming finished but no language was detected, clear detection state
                if (!detectedLanguage || detectedLanguage.language === 'unknown') {
                  setDetectedLanguage(null);
                }
                break;
              }
              
              if (data.chunk) {
                if (data.isHelpfulResponse) {
                  isHelpfulResponseType = true;
                  accumulatedResponse += data.chunk;
                  setHelpfulResponse(accumulatedResponse);
                  setGeneratedTests(null);
                  if (accumulatedResponse.length === data.chunk.length) {
                    setShowAttentionGuide(true);
                    setTimeout(() => setShowAttentionGuide(false), 3000);
                  }
                } else {
                  accumulatedTests += data.chunk;
                  setGeneratedTests(accumulatedTests);
                  setHelpfulResponse(null);
                  if (accumulatedTests.length === data.chunk.length) {
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
      setGeneratedTests(null);
      setIsLoading(false);
      setIsDetectingLanguage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && !isLoading && code.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const getLanguageDisplayName = () => {
    if (!detectedLanguage) return null;
    return `${detectedLanguage.displayName} (${detectedLanguage.framework})`;
  };

  const getLanguageForSyntaxHighlighting = (): string => {
    if (!detectedLanguage) return 'text';
    const lang = detectedLanguage.language;
    // Map to Prism-supported language aliases
    const languageMap: Record<string, string> = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'csharp': 'cs',
      'go': 'go',
      'ruby': 'ruby',
    };
    return languageMap[lang] || 'text';
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main Content - Split Layout */}
      <div className="flex-1 flex gap-6 px-4 pb-4 overflow-hidden relative">
        {/* Left Side - Input Section */}
        <div 
          className={`transition-all duration-700 ease-in-out ${
            isLeftSectionCollapsed 
              ? 'w-0 opacity-0 pointer-events-none' 
              : generatedTests || isLoading 
                ? 'w-[70%]' 
                : 'w-full max-w-2xl mx-auto'
          } flex flex-col`}
        >
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            {/* Title */}
            <div className="w-full max-w-2xl mb-6 px-4">
              <h1 className="text-3xl font-semibold text-white text-center mb-2">
                Unit Test Generator
              </h1>
              <p className="text-sm text-gray-400 text-center">
                Paste your code to automatically generate comprehensive unit tests
              </p>
            </div>
            
            {/* Input Section */}
            <div className="w-full max-w-2xl px-4 relative">
              {/* Language Detection Badge */}
              {isDetectingLanguage && (
                <div className="mb-4 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3a8bfd]/20 border border-[#3a8bfd]/50 rounded-lg">
                    <svg className="w-4 h-4 text-[#3a8bfd] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium text-[#3a8bfd]">
                      Detecting language...
                    </span>
                  </div>
                </div>
              )}
              {!isDetectingLanguage && detectedLanguage && detectedLanguage.language !== 'unknown' && code.trim() && (
                <div className="mb-4 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3a8bfd]/20 border border-[#3a8bfd]/50 rounded-lg">
                    <svg className="w-4 h-4 text-[#3a8bfd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-[#3a8bfd]">
                      Detected: {getLanguageDisplayName()}
                    </span>
                  </div>
                </div>
              )}

              {/* Code Input Container with Controls */}
              <div className="bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] focus-within:border-[#4a4a4a] transition-colors overflow-hidden shadow-sm flex flex-col">
                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Paste your code here... (Ctrl+Enter to generate)"
                  disabled={isLoading}
                  className="w-full h-72 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm px-5 pt-5 pb-2 resize-none font-mono"
                  style={{ lineHeight: '1.75' }}
                />
                
                {/* Footer with Line count and Controls */}
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

                  {/* Line count indicator - Middle */}
                  <div className="flex-1 text-xs text-gray-500 text-center">
                    {code.trim() && (
                      <>
                        {code.split('\n').length} / 1000 lines
                        {code.split('\n').length > 1000 && (
                          <span className="text-red-400 ml-2">(Exceeds limit)</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right side - Submit button */}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading || !code.trim()}
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors ml-auto"
                    title="Generate Tests"
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

        {/* Right Side - Generated Tests Display */}
        {(generatedTests || helpfulResponse || isLoading) && (
          <div className={`flex flex-col animate-slide-in-right relative transition-all duration-700 ${
            isLeftSectionCollapsed ? 'w-full' : 'w-[30%]'
          }`}>
            {/* Attention Guide Arrow */}
            {showAttentionGuide && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-4 animate-pulse-slow pointer-events-none z-10">
                <div className="flex items-center gap-3 bg-[#2a2a2a]/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#3a8bfd]/50 shadow-lg">
                  <div className="text-white/80 text-sm font-medium">
                    {helpfulResponse ? 'Response ready!' : 'Tests generated!'}
                  </div>
                  <svg className="w-6 h-6 text-[#3a8bfd] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            )}

            <div className="bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] overflow-hidden h-full flex flex-col shadow-2xl relative">
              {/* Collapse/Expand Button - Top Right */}
              {!isLoading && (generatedTests || helpfulResponse) && (
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
                  {helpfulResponse ? 'Response' : 'Generated Unit Tests'}
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
                ) : generatedTests ? (
                  <CodeDisplay 
                    code={generatedTests} 
                    language={getLanguageForSyntaxHighlighting()}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#3a8bfd]/30 border-t-[#3a8bfd] rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Generating tests...</p>
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

