import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function initializeOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
}

export async function validateReactComponentRequest(description: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeOpenAIClient();

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
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON-only response assistant. Always respond with valid JSON only.' },
        { role: 'user', content: validationPrompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      // Default to valid if we can't validate
      return { isValid: true };
    }

    try {
      const result = JSON.parse(response);
      const relevance = result.relevance || 0;
      // Check if relevance is at least 70%
      const isValid = result.isValid === true && relevance >= 70;
      return {
        isValid,
        message: result.message || (isValid ? undefined : "I can only generate React components with TypeScript. Please describe a React component you'd like me to create."),
      };
    } catch {
      // Default to valid if JSON parsing fails
      return { isValid: true };
    }
  } catch (error) {
    // Default to valid if validation fails
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
  const client = initializeOpenAIClient();
  const MAX_TOKENS = 1000;

  const systemPrompt = `You are an expert React developer. Generate clean, production-ready React components with TypeScript. 
Return ONLY the component code, no explanations, no markdown code blocks, no additional text. 
The component should be a complete, functional React component that can be used directly.`;

  const userPrompt = `Generate a React component with TypeScript based on this description: ${description}`;

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    let fullCode = '';
    let isFirstChunk = true;
    let codeBlockStart = false;
    let currentTokenCount = 0;
    let limitReached = false;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Estimate tokens for this chunk
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        // Check if we've reached the limit
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          // Yield remaining content up to the limit
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
            // Approximate how much of this chunk we can use
            const charsPerToken = content.length / chunkTokens;
            const allowedChars = Math.floor(remainingTokens * charsPerToken);
            if (allowedChars > 0) {
              const partialContent = content.substring(0, allowedChars);
              fullCode += partialContent;
              
              if (isFirstChunk && partialContent.trim().startsWith('```')) {
                codeBlockStart = true;
                const remaining = partialContent.replace(/^```[a-z]*\n?/i, '');
                if (remaining) {
                  yield remaining;
                }
              } else if (codeBlockStart) {
                if (partialContent.includes('```')) {
                  const cleaned = partialContent.replace(/```\s*$/, '');
                  if (cleaned) {
                    yield cleaned;
                  }
                } else {
                  yield partialContent;
                }
              } else {
                yield partialContent;
              }
            }
          }
          // Signal that limit was reached
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += content;
          
          // Check if this is the start of a code block
          if (isFirstChunk && content.trim().startsWith('```')) {
            codeBlockStart = true;
            // Skip the code block marker
            const remaining = content.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
            // Check if this is the end of a code block
            if (content.includes('```')) {
              const cleaned = content.replace(/```\s*$/, '');
              if (cleaned) {
                yield cleaned;
              }
              codeBlockStart = false;
            } else {
              yield content;
            }
          } else {
            yield content;
          }
          
          isFirstChunk = false;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating component');
  }
}

export async function* generateHelpfulResponseStream(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();

  const systemPrompt = `You are an assistant for a React Component Generator app. 
When users ask questions that are NOT primarily about generating React components (less than 70% related), you must:
1. Politely inform them that this app can ONLY generate React components with TypeScript
2. Be direct and clear - do not provide lengthy explanations or answer their unrelated question
3. Encourage them to describe a React component they'd like to generate

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${description}"

Respond by letting them know you can only generate React components and ask them to describe a React component they'd like to create.`;

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
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
