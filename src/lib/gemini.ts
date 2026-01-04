import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

function initializeGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export async function validateReactComponentRequest(description: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeGeminiClient();

  const validationPrompt = `You are a validation assistant for a React Component Generator app. 
Your task is to determine if the user's request is AT LEAST 70% about generating a React component.

The app can ONLY generate React components with TypeScript. It cannot:
- Answer general questions
- Generate non-React code
- Provide explanations or tutorials
- Generate backend code, APIs, or server-side code
- Generate CSS files, configuration files, or other non-component code

IMPORTANT: The request must be at least 70% focused on React component generation. If it's less than 70% related, it's invalid.

Respond with ONLY a JSON object in this exact format:
{"isValid": true, "relevance": <number 0-100>} if the request is at least 70% about React component generation
{"isValid": false, "relevance": <number 0-100>, "message": "I can only generate React components with TypeScript. Please describe a React component you'd like me to create."} if the request is less than 70% about React component generation

User request: "${description}"

Respond with ONLY the JSON, no additional text:`;

  try {
    const model = client.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
      },
    });

    const result = await model.generateContent(validationPrompt);
    const response = result.response.text();

    if (!response) {
      return { isValid: true };
    }

    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const relevance = result.relevance || 0;
        // Check if relevance is at least 70%
        const isValid = result.isValid === true && relevance >= 70;
        return {
          isValid,
          message: result.message || (isValid ? undefined : "I can only generate React components with TypeScript. Please describe a React component you'd like me to create."),
        };
      }
      return { isValid: true };
    } catch {
      return { isValid: true };
    }
  } catch (error) {
    return { isValid: true };
  }
}

// Helper function to estimate token count (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  // More accurate: count words and common code patterns
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const codeTokens = (text.match(/[{}();,\[\]]/g) || []).length;
  // Rough estimate: words contribute ~0.75 tokens each, code symbols ~1 token each
  return Math.ceil(words.length * 0.75 + codeTokens);
}

export async function* generateComponentStream(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();
  const MAX_TOKENS = 1000;

  const systemPrompt = `You are an expert React developer. Generate clean, production-ready React components with TypeScript. 
Return ONLY the component code, no explanations, no markdown code blocks, no additional text. 
The component should be a complete, functional React component that can be used directly.`;

  const userPrompt = `Generate a React component with TypeScript based on this description: ${description}`;

  try {
    const model = client.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const result = await model.generateContentStream(prompt);
    
    let fullCode = '';
    let isFirstChunk = true;
    let codeBlockStart = false;
    let currentTokenCount = 0;
    let limitReached = false;
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        // Estimate tokens for this chunk
        const chunkTokens = estimateTokens(text);
        currentTokenCount += chunkTokens;
        
        // Check if we've reached the limit
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          // Yield remaining content up to the limit
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
            // Approximate how much of this chunk we can use
            const charsPerToken = text.length / chunkTokens;
            const allowedChars = Math.floor(remainingTokens * charsPerToken);
            if (allowedChars > 0) {
              const partialText = text.substring(0, allowedChars);
              fullCode += partialText;
              
              if (isFirstChunk && partialText.trim().startsWith('```')) {
                codeBlockStart = true;
                const remaining = partialText.replace(/^```[a-z]*\n?/i, '');
                if (remaining) {
                  yield remaining;
                }
              } else if (codeBlockStart) {
                if (partialText.includes('```')) {
                  const cleaned = partialText.replace(/```\s*$/, '');
                  if (cleaned) {
                    yield cleaned;
                  }
                } else {
                  yield partialText;
                }
              } else {
                yield partialText;
              }
            }
          }
          // Signal that limit was reached
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += text;
          
          // Check if this is the start of a code block
          if (isFirstChunk && text.trim().startsWith('```')) {
            codeBlockStart = true;
            // Skip the code block marker
            const remaining = text.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
            // Check if this is the end of a code block
            if (text.includes('```')) {
              const cleaned = text.replace(/```\s*$/, '');
              if (cleaned) {
                yield cleaned;
              }
              codeBlockStart = false;
            } else {
              yield text;
            }
          } else {
            yield text;
          }
          
          isFirstChunk = false;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating component');
  }
}

export async function* generateHelpfulResponseStream(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();

  const systemPrompt = `You are an assistant for a React Component Generator app. 
When users ask questions that are NOT primarily about generating React components (less than 70% related), you must:
1. Politely inform them that this app can ONLY generate React components with TypeScript
2. Be direct and clear - do not provide lengthy explanations or answer their unrelated question
3. Encourage them to describe a React component they'd like to generate

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${description}"

Respond by letting them know you can only generate React components and ask them to describe a React component they'd like to create.`;

  try {
    const model = client.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating response');
  }
}

// Keep the non-streaming version for backward compatibility
export async function generateComponent(description: string): Promise<string> {
  let fullCode = '';
  for await (const chunk of generateComponentStream(description)) {
    fullCode += chunk;
  }
  return fullCode;
}
