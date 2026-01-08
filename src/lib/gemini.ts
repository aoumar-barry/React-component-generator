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

export async function validateUnitTestRequest(code: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeGeminiClient();

  const validationPrompt = `You are a validation assistant for a Unit Test Generator app. 
Your task is to determine if the user's input contains code or is related to programming (programming languages, frameworks, code snippets, functions, classes, etc.).

The app can generate unit tests for ANY code or code-related content. It accepts:
- Code snippets in any programming language
- Functions, classes, methods
- Code blocks
- Programming concepts (frameworks, libraries)
- Any content that is code or code-related

The app CANNOT handle:
- General questions unrelated to code
- Pure text without code elements
- Non-programming content
- Empty input

IMPORTANT: If the input contains code or is related to programming (even partially), it's valid. Only reject if it's completely unrelated to code/programming.

Respond with ONLY a JSON object in this exact format:
{"isValid": true, "relevance": <number 0-100>} if the input contains code or is code-related
{"isValid": false, "relevance": <number 0-100>, "message": "I can only generate unit tests from code snippets. Please paste your code to generate unit tests."} if the input is not code or code-related

User input: "${code.substring(0, 500)}"

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
        // Check if relevance indicates this contains code or is code-related
        const isValid = result.isValid === true && relevance >= 30;
        return {
          isValid,
          message: result.message || (isValid ? undefined : "I can only generate unit tests from code snippets. Please paste your code to generate unit tests."),
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

export async function* generateHelpfulResponseStreamForUnitTests(question: string): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();

  const systemPrompt = `You are an assistant for a Unit Test Generator app. 
When users provide input that is NOT code or code-related, you must:
1. Politely inform them that this app can generate unit tests from code snippets, functions, classes, or any programming-related content
2. Be direct and clear - do not provide lengthy explanations
3. Encourage them to paste their code to generate unit tests

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user provided: "${question}"

Respond by letting them know you can generate unit tests from code snippets, functions, classes, or any programming-related content, and ask them to paste their code.`;

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

export async function detectCodeLanguage(code: string): Promise<{ language: string; framework: string; displayName: string }> {
  const client = initializeGeminiClient();

  const detectionPrompt = `You are a code language detector. Analyze the provided code and determine its programming language.

Supported languages and their test frameworks:
- JavaScript/TypeScript -> Jest
- Python -> pytest
- Java -> JUnit 5
- C# -> xUnit
- Go -> Testing
- Ruby -> RSpec

Respond with ONLY a JSON object in this exact format:
{
  "language": "<language_code>",
  "framework": "<test_framework>",
  "displayName": "<display_name>"
}

Language codes: "javascript", "typescript", "python", "java", "csharp", "go", "ruby"
If you cannot determine the language, use "unknown".

Code:
\`\`\`
${code.substring(0, 1000)}
\`\`\`

Respond with ONLY the JSON, no additional text:`;

  try {
    const model = client.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 100,
      },
    });

    const result = await model.generateContent(detectionPrompt);
    const response = result.response.text();

    if (!response) {
      throw new Error('No response from language detection');
    }

    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          language: parsed.language || 'unknown',
          framework: parsed.framework || 'Unknown',
          displayName: parsed.displayName || 'Unknown',
        };
      }
      throw new Error('No JSON found in response');
    } catch {
      throw new Error('Failed to parse language detection response');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Language detection error: ${error.message}`);
    }
    throw new Error('Unknown error during language detection');
  }
}

export async function* generateUnitTestStream(
  code: string,
  language: string,
  framework: string
): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();
  const MAX_TOKENS = 1000;

  const frameworkInstructions: Record<string, string> = {
    'Jest': 'Use Jest with TypeScript/JavaScript. Include describe/it blocks, expect assertions, and proper imports.',
    'pytest': 'Use pytest with Python. Include test functions starting with "test_", use assert statements, and import necessary modules.',
    'JUnit 5': 'Use JUnit 5 with Java. Include @Test annotations, use Assertions class for assertions, and proper class structure.',
    'xUnit': 'Use xUnit with C#. Include [Fact] or [Theory] attributes, use Assert class for assertions, and proper namespace structure.',
    'Testing': 'Use Go testing package. Include test functions starting with "Test", use t.Run for subtests, and proper package declarations.',
    'RSpec': 'Use RSpec with Ruby. Include describe/it blocks, use expect().to syntax, and proper require statements.',
  };

  const frameworkInstruction = frameworkInstructions[framework] || 'Generate appropriate unit tests for the given code.';

  const systemPrompt = `You are an expert in writing unit tests. Generate comprehensive, production-ready unit tests using ${framework} for ${language} code.
${frameworkInstruction}
Return ONLY the test code, no explanations, no markdown code blocks, no additional text. 
The tests should cover edge cases, error handling, and main functionality. Tests should be complete and runnable.`;

  const userPrompt = `Generate unit tests using ${framework} for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Generate comprehensive unit tests that cover all functions, edge cases, and error scenarios.`;

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
        const chunkTokens = estimateTokens(text);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
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
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += text;
          
          if (isFirstChunk && text.trim().startsWith('```')) {
            codeBlockStart = true;
            const remaining = text.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
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
    throw new Error('Unknown error occurred while generating unit tests');
  }
}

// SQL Query Optimizer Functions

export async function validateSQLRequest(query: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeGeminiClient();

  const validationPrompt = `You are a validation assistant for a SQL Query Optimizer app.
Your task is to determine if the user's request is AT LEAST 70% about SQL query optimization.
The app can ONLY optimize SQL queries. It cannot:
- Answer general questions
- Generate non-SQL code
- Provide tutorials
- Optimize other types of queries

IMPORTANT: The request must be at least 70% focused on SQL query optimization. If it's less than 70% related, it's invalid.

Respond with ONLY a JSON object in this exact format:
{"isValid": true, "relevance": <number 0-100>} if the request is at least 70% about SQL query optimization
{"isValid": false, "relevance": <number 0-100>, "message": "I can only optimize SQL queries. Please provide a SQL query to optimize."} if the request is less than 70% about SQL query optimization

User request: "${query.substring(0, 500)}"

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
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const relevance = result.relevance || 0;
        const isValid = result.isValid === true && relevance >= 70;
        return {
          isValid,
          message: result.message || (isValid ? undefined : "I can only optimize SQL queries. Please provide a SQL query to optimize."),
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

export async function* optimizeSQLStream(query: string): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();
  const MAX_TOKENS = 1500;

  const systemPrompt = `You are a SQL query optimization expert. Given the following SQL query, provide an optimized version.
Focus on:
- Index usage
- Query performance
- Best practices
- Reducing execution time
- Proper JOIN strategies
- Subquery optimization

Return ONLY the optimized SQL query, no explanations, no markdown code blocks, no additional text.`;

  const userPrompt = `Optimize this SQL query:

\`\`\`sql
${query}
\`\`\`

Return ONLY the optimized SQL query:`;

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
        const chunkTokens = estimateTokens(text);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
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
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += text;
          
          if (isFirstChunk && text.trim().startsWith('```')) {
            codeBlockStart = true;
            const remaining = text.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
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
    throw new Error('Unknown error occurred while optimizing SQL');
  }
}

export async function* generateHelpfulResponseStreamForSQL(query: string): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();

  const systemPrompt = `You are an assistant for a SQL Query Optimizer app. 
When users ask questions that are NOT primarily about SQL query optimization (less than 70% related), you must:
1. Politely inform them that this app can ONLY optimize SQL queries
2. Be direct and clear - do not provide lengthy explanations or answer their unrelated question
3. Encourage them to provide a SQL query to optimize

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${query}"

Respond by letting them know you can only optimize SQL queries and ask them to provide a SQL query.`;

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

export async function* generateSQLExplanationStream(
  originalQuery: string,
  optimizedQuery: string
): AsyncGenerator<string, void, unknown> {
  const client = initializeGeminiClient();
  const MAX_TOKENS = 1500;

  const systemPrompt = `You are a SQL optimization expert. Compare the original and optimized queries.
Provide detailed explanations in Markdown format covering:
- What was changed
- Why each change improves performance
- Performance impact estimates
- Best practices applied

Use headers, bullet points, and code blocks for clarity.`;

  const userPrompt = `Compare these SQL queries and explain the optimizations:

Original Query:
\`\`\`sql
${originalQuery}
\`\`\`

Optimized Query:
\`\`\`sql
${optimizedQuery}
\`\`\`

Provide detailed explanations in Markdown format.`;

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
    
    let currentTokenCount = 0;
    let limitReached = false;
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        const chunkTokens = estimateTokens(text);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
            const charsPerToken = text.length / chunkTokens;
            const allowedChars = Math.floor(remainingTokens * charsPerToken);
            if (allowedChars > 0) {
              yield text.substring(0, allowedChars);
            }
          }
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          yield text;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating explanation');
  }
}