import { NextRequest } from 'next/server';
import { 
  generateNetworkTroubleshootingStream as generateOpenAITroubleshooting, 
  validateNetworkTroubleshootingRequest as validateOpenAI,
  generateHelpfulResponseStreamForNetwork as generateOpenAIHelpfulResponse,
  extractNetworkCodeStream as extractOpenAICode
} from '@/lib/openai';
import { 
  generateNetworkTroubleshootingStream as generateGeminiTroubleshooting, 
  validateNetworkTroubleshootingRequest as validateGemini,
  generateHelpfulResponseStreamForNetwork as generateGeminiHelpfulResponse,
  extractNetworkCodeStream as extractGeminiCode
} from '@/lib/gemini';
import { AIProvider } from '@/types';

interface NetworkTroubleshootingRequest {
  description: string;
  provider: AIProvider;
  mode?: 'troubleshoot' | 'extract-code';
  troubleshootingGuide?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NetworkTroubleshootingRequest = await request.json();
    const { description, provider, mode = 'troubleshoot', troubleshootingGuide } = body;

    // Validate provider
    if (!provider || (provider !== 'openai' && provider !== 'gemini')) {
      return new Response(
        JSON.stringify({ error: 'Provider must be either "openai" or "gemini"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mode-specific validation
    if (mode === 'troubleshoot') {
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Description is required and must be a non-empty string' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (mode === 'extract-code') {
      if (!troubleshootingGuide || typeof troubleshootingGuide !== 'string' || troubleshootingGuide.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Troubleshooting guide is required for code extraction' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create a readable stream for SSE (Server-Sent Events)
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          if (mode === 'troubleshoot') {
            // First, validate if the request is network troubleshooting related
            const validation = provider === 'openai' 
              ? await validateOpenAI(description!.trim())
              : await validateGemini(description!.trim());

            let generator: AsyncGenerator<string, void, unknown>;
            let isHelpfulResponse = false;

            if (!validation.isValid) {
              // If not valid, generate a helpful response from the model
              isHelpfulResponse = true;
              generator = provider === 'openai' 
                ? generateOpenAIHelpfulResponse(description!.trim())
                : generateGeminiHelpfulResponse(description!.trim());
            } else {
              // If valid, proceed with troubleshooting guide generation
              generator = provider === 'openai' 
                ? generateOpenAITroubleshooting(description!.trim())
                : generateGeminiTroubleshooting(description!.trim());
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
                    isHelpfulResponse: isHelpfulResponse 
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                // Send token limit message
                const limitData = JSON.stringify({ 
                  tokenLimitReached: true,
                  message: 'Token limit reached (2000 tokens maximum). Generation stopped for security.'
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, isHelpfulResponse, tokenLimitReached })}\n\n`));
          } else if (mode === 'extract-code') {
            // Extract code from troubleshooting guide
            const extractCode = provider === 'openai' 
              ? extractOpenAICode 
              : extractGeminiCode;

            const generator = extractCode(troubleshootingGuide!.trim());

            for await (const chunk of generator) {
              // Send each chunk as a data event
              const data = JSON.stringify({ chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Send completion event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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

