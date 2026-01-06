import { NextRequest } from 'next/server';
import { 
  generateUnitTestStream as generateOpenAIUnitTests,
  detectCodeLanguage as detectOpenAILanguage,
  validateUnitTestRequest as validateOpenAIUnitTest,
  generateHelpfulResponseStreamForUnitTests as generateOpenAIHelpfulResponse
} from '@/lib/openai';
import { 
  generateUnitTestStream as generateGeminiUnitTests,
  detectCodeLanguage as detectGeminiLanguage,
  validateUnitTestRequest as validateGeminiUnitTest,
  generateHelpfulResponseStreamForUnitTests as generateGeminiHelpfulResponse
} from '@/lib/gemini';
import { AIProvider } from '@/types';

interface GenerateUnitTestRequest {
  code: string;
  provider: AIProvider;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateUnitTestRequest = await request.json();
    const { code, provider } = body;

    // Validate input
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Code is required and must be a non-empty string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate line count (max 1000 lines)
    const lineCount = code.trim().split('\n').length;
    if (lineCount > 1000) {
      return new Response(
        JSON.stringify({ error: `Code exceeds maximum limit of 1000 lines. Your code has ${lineCount} lines. Please reduce the code size.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!provider || (provider !== 'openai' && provider !== 'gemini')) {
      return new Response(
        JSON.stringify({ error: 'Provider must be either "openai" or "gemini"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a readable stream for SSE (Server-Sent Events)
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Step 1: Validate if the request is about unit test generation
          const validateRequest = provider === 'openai' 
            ? validateOpenAIUnitTest 
            : validateGeminiUnitTest;

          const validation = await validateRequest(code.trim());

          let generator: AsyncGenerator<string, void, unknown>;
          let isHelpfulResponse = false;

          if (!validation.isValid) {
            // If not valid, generate a helpful response from the model
            isHelpfulResponse = true;
            const generateHelpfulResponse = provider === 'openai' 
              ? generateOpenAIHelpfulResponse 
              : generateGeminiHelpfulResponse;
            generator = generateHelpfulResponse(code.trim());
          } else {
            // Step 2: Detect language using AI
            const detectLanguage = provider === 'openai' 
              ? detectOpenAILanguage 
              : detectGeminiLanguage;

            let detectedLangInfo;
            try {
              detectedLangInfo = await detectLanguage(code.trim());
              
              // Send language detection result to client
              const langDetectionData = JSON.stringify({
                languageDetected: true,
                language: detectedLangInfo.language,
                framework: detectedLangInfo.framework,
                displayName: detectedLangInfo.displayName,
              });
              controller.enqueue(encoder.encode(`data: ${langDetectionData}\n\n`));

              // If language is unknown, return error
              if (detectedLangInfo.language === 'unknown') {
                const errorData = JSON.stringify({
                  error: 'Could not detect code language. Please ensure your code is valid and recognizable.',
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                controller.close();
                return;
              }

              // Step 3: Generate unit tests with detected language
              generator = provider === 'openai' 
                ? generateOpenAIUnitTests(code.trim(), detectedLangInfo.language, detectedLangInfo.framework)
                : generateGeminiUnitTests(code.trim(), detectedLangInfo.language, detectedLangInfo.framework);
            } catch (detectionError) {
              const errorMessage = detectionError instanceof Error ? detectionError.message : 'Unknown error';
              const errorData = JSON.stringify({
                error: `Language detection failed: ${errorMessage}`,
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              controller.close();
              return;
            }
          }

          let tokenLimitReached = false;
          
          for await (const chunk of generator) {
            // Check if token limit was reached
            if (chunk.includes('[TOKEN_LIMIT_REACHED]')) {
              tokenLimitReached = true;
              // Remove the marker and send the chunk without it
              const cleanChunk = chunk.replace('[TOKEN_LIMIT_REACHED]', '').trim();
              if (cleanChunk) {
                const data = JSON.stringify({ 
                  chunk: cleanChunk,
                  isHelpfulResponse: false 
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              // Send token limit message
              const limitData = JSON.stringify({ 
                tokenLimitReached: true,
                message: 'Token limit reached (1000 tokens maximum). Generation stopped for security.'
              });
              controller.enqueue(encoder.encode(`data: ${limitData}\n\n`));
              break;
            }
            
            // Send each chunk as a data event
            const data = JSON.stringify({ 
              chunk,
              isHelpfulResponse: isHelpfulResponse 
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isHelpfulResponse: isHelpfulResponse, tokenLimitReached })}\n\n`));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const errorData = JSON.stringify({ error: `Failed to generate unit tests: ${errorMessage}` });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    // Handle JSON parsing errors or other unexpected errors
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

