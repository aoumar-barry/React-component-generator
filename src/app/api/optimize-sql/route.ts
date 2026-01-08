import { NextRequest } from 'next/server';
import { 
  optimizeSQLStream as optimizeOpenAISQL,
  validateSQLRequest as validateOpenAISQL,
  generateHelpfulResponseStreamForSQL as generateOpenAIHelpfulResponse,
  generateSQLExplanationStream as generateOpenAIExplanation
} from '@/lib/openai';
import { 
  optimizeSQLStream as optimizeGeminiSQL,
  validateSQLRequest as validateGeminiSQL,
  generateHelpfulResponseStreamForSQL as generateGeminiHelpfulResponse,
  generateSQLExplanationStream as generateGeminiExplanation
} from '@/lib/gemini';
import { AIProvider } from '@/types';

interface OptimizeSQLRequest {
  query?: string;
  originalQuery?: string;
  optimizedQuery?: string;
  provider: AIProvider;
  mode: 'optimize' | 'explain';
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeSQLRequest = await request.json();
    const { query, originalQuery, optimizedQuery, provider, mode } = body;

    // Validate provider
    if (!provider || (provider !== 'openai' && provider !== 'gemini')) {
      return new Response(
        JSON.stringify({ error: 'Provider must be either "openai" or "gemini"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate mode
    if (!mode || (mode !== 'optimize' && mode !== 'explain')) {
      return new Response(
        JSON.stringify({ error: 'Mode must be either "optimize" or "explain"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mode-specific validation
    if (mode === 'optimize') {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'SQL query is required and must be a non-empty string' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (mode === 'explain') {
      if (!originalQuery || !optimizedQuery || 
          typeof originalQuery !== 'string' || typeof optimizedQuery !== 'string' ||
          originalQuery.trim().length === 0 || optimizedQuery.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Both originalQuery and optimizedQuery are required for explanation mode' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create a readable stream for SSE (Server-Sent Events)
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          if (mode === 'optimize') {
            // Step 1: Validate if the request is about SQL optimization
            const validateRequest = provider === 'openai' 
              ? validateOpenAISQL 
              : validateGeminiSQL;

            const validation = await validateRequest(query!.trim());

            let generator: AsyncGenerator<string, void, unknown>;
            let isHelpfulResponse = false;

            if (!validation.isValid) {
              // If not valid, generate a helpful response from the model
              isHelpfulResponse = true;
              const generateHelpfulResponse = provider === 'openai' 
                ? generateOpenAIHelpfulResponse 
                : generateGeminiHelpfulResponse;
              generator = generateHelpfulResponse(query!.trim());
            } else {
              // Step 2: Optimize SQL query
              generator = provider === 'openai' 
                ? optimizeOpenAISQL(query!.trim())
                : optimizeGeminiSQL(query!.trim());
            }

            let tokenLimitReached = false;
            let chunkIndex = 0;
            
            for await (const chunk of generator) {
              chunkIndex++;
              console.log(`[API] Generator yielded chunk #${chunkIndex}, length: ${chunk.length}`);
              // Check if token limit was reached
              if (chunk.includes('[TOKEN_LIMIT_REACHED]')) {
                tokenLimitReached = true;
                // Remove the marker and send the chunk without it
                const cleanChunk = chunk.replace('[TOKEN_LIMIT_REACHED]', '').trim();
                if (cleanChunk) {
                  const data = JSON.stringify({ 
                    chunk: cleanChunk,
                    isHelpfulResponse 
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                // Send token limit message
                const limitData = JSON.stringify({ 
                  tokenLimitReached: true,
                  message: 'Token limit reached (1500 tokens maximum). Generation stopped for security.'
                });
                controller.enqueue(encoder.encode(`data: ${limitData}\n\n`));
                break;
              }
              
              // Send each chunk as a data event
              const data = JSON.stringify({ 
                chunk,
                isHelpfulResponse 
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Send completion event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isHelpfulResponse, tokenLimitReached })}\n\n`));
          } else if (mode === 'explain') {
            // Generate explanations
            const generateExplanation = provider === 'openai' 
              ? generateOpenAIExplanation 
              : generateGeminiExplanation;

            const generator = generateExplanation(originalQuery!.trim(), optimizedQuery!.trim());

            let tokenLimitReached = false;
            
            for await (const chunk of generator) {
              // Check if token limit was reached
              if (chunk.includes('[TOKEN_LIMIT_REACHED]')) {
                tokenLimitReached = true;
                const cleanChunk = chunk.replace('[TOKEN_LIMIT_REACHED]', '').trim();
                if (cleanChunk) {
                  const data = JSON.stringify({ chunk: cleanChunk });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                const limitData = JSON.stringify({ 
                  tokenLimitReached: true,
                  message: 'Token limit reached. Explanation truncated.'
                });
                controller.enqueue(encoder.encode(`data: ${limitData}\n\n`));
                break;
              }
              
              // Send each chunk as a data event
              const data = JSON.stringify({ chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Send completion event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, tokenLimitReached })}\n\n`));
          }

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const errorData = JSON.stringify({ error: `Failed to process request: ${errorMessage}` });
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
