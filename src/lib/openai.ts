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

export async function validateUnitTestRequest(code: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeOpenAIClient();

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
      // Check if relevance indicates this contains code or is code-related
      const isValid = result.isValid === true && relevance >= 30;
      return {
        isValid,
        message: result.message || (isValid ? undefined : "I can only generate unit tests from code snippets. Please paste your code to generate unit tests."),
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

export async function* generateHelpfulResponseStreamForUnitTests(question: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();

  const systemPrompt = `You are an assistant for a Unit Test Generator app. 
When users ask questions that are NOT about generating unit tests from code, you must:
1. Politely inform them that this app can ONLY generate unit tests from code snippets
2. Be direct and clear - do not provide lengthy explanations
3. Encourage them to paste their code to generate unit tests

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${question}"

Respond by letting them know you can only generate unit tests from code snippets and ask them to paste their code.`;

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

export async function detectCodeLanguage(code: string): Promise<{ language: string; framework: string; displayName: string }> {
  const client = initializeOpenAIClient();

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
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON-only response assistant. Always respond with valid JSON only.' },
        { role: 'user', content: detectionPrompt },
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from language detection');
    }

    try {
      const result = JSON.parse(response);
      return {
        language: result.language || 'unknown',
        framework: result.framework || 'Unknown',
        displayName: result.displayName || 'Unknown',
      };
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
  const client = initializeOpenAIClient();
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
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
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
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += content;
          
          if (isFirstChunk && content.trim().startsWith('```')) {
            codeBlockStart = true;
            const remaining = content.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
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
    throw new Error('Unknown error occurred while generating unit tests');
  }
}

// SQL Query Optimizer Functions

export async function validateSQLRequest(query: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeOpenAIClient();

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
      return { isValid: true };
    }

    try {
      const result = JSON.parse(response);
      const relevance = result.relevance || 0;
      const isValid = result.isValid === true && relevance >= 70;
      return {
        isValid,
        message: result.message || (isValid ? undefined : "I can only optimize SQL queries. Please provide a SQL query to optimize."),
      };
    } catch {
      return { isValid: true };
    }
  } catch (error) {
    return { isValid: true };
  }
}

export async function* optimizeSQLStream(query: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();
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
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      // Check if stream finished
      if (chunk.choices[0]?.finish_reason) {
        break;
      }
      
      if (content) {
        chunkCount++;
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
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
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += content;
          
          if (isFirstChunk && content.trim().startsWith('```')) {
            codeBlockStart = true;
            const remaining = content.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
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
            // Yield immediately for streaming
            yield content;
          }
          
          isFirstChunk = false;
        }
      }
    }
    
    // Debug: log if no chunks were yielded
    if (chunkCount === 0) {
      console.error('No chunks received from OpenAI stream');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while optimizing SQL');
  }
}

export async function* generateHelpfulResponseStreamForSQL(query: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();

  const systemPrompt = `You are an assistant for a SQL Query Optimizer app. 
When users ask questions that are NOT primarily about SQL query optimization (less than 70% related), you must:
1. Politely inform them that this app can ONLY optimize SQL queries
2. Be direct and clear - do not provide lengthy explanations or answer their unrelated question
3. Encourage them to provide a SQL query to optimize

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${query}"

Respond by letting them know you can only optimize SQL queries and ask them to provide a SQL query.`;

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

export async function* generateSQLExplanationStream(
  originalQuery: string,
  optimizedQuery: string
): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();
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

    let currentTokenCount = 0;
    let limitReached = false;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
            const charsPerToken = content.length / chunkTokens;
            const allowedChars = Math.floor(remainingTokens * charsPerToken);
            if (allowedChars > 0) {
              yield content.substring(0, allowedChars);
            }
          }
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          yield content;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating explanation');
  }
}

// ==================== Dockerfile Generator Functions ====================

export async function validateDockerfileRequest(description: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeOpenAIClient();

  const validationPrompt = `You are a validation assistant for a Dockerfile Generator app. 
Your task is to determine if the user's request is AT LEAST 70% about generating a Dockerfile or containerization.

The app can ONLY generate Dockerfiles. It cannot:
- Answer general questions
- Generate non-Dockerfile code
- Provide explanations or tutorials
- Generate docker-compose files, Kubernetes manifests, or other container orchestration files
- Generate application code

IMPORTANT: The request must be at least 70% focused on Dockerfile generation or containerization. If it's less than 70% related, it's invalid.

Respond with ONLY a JSON object in this exact format:
{"isValid": true, "relevance": <number 0-100>} if the request is at least 70% about Dockerfile generation
{"isValid": false, "relevance": <number 0-100>, "message": "I can only generate Dockerfiles. Please describe your application or containerization needs."} if the request is less than 70% about Dockerfile generation

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
      return { isValid: true };
    }

    try {
      const result = JSON.parse(response);
      const relevance = result.relevance || 0;
      const isValid = result.isValid === true && relevance >= 70;
      return {
        isValid,
        message: result.message || (isValid ? undefined : "I can only generate Dockerfiles. Please describe your application or containerization needs."),
      };
    } catch {
      return { isValid: true };
    }
  } catch (error) {
    return { isValid: true };
  }
}

export async function* generateDockerfileStream(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();
  const MAX_TOKENS = 200;

  const systemPrompt = `You are an expert in Docker and containerization. Generate optimized, production-ready Dockerfiles.
Focus on:
- Multi-stage builds for smaller image sizes (when beneficial)
- Proper layer caching
- Security best practices (non-root user, minimal base images like alpine or distroless)
- Efficient dependency installation
- Health checks when appropriate
- Proper WORKDIR and ENV usage
- Build optimization

Return ONLY the Dockerfile code, no explanations, no markdown code blocks, no additional text.
The Dockerfile should be complete and production-ready.`;

  const userPrompt = `Generate an optimized Dockerfile for: ${description}`;

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

    let fullCode = '';
    let isFirstChunk = true;
    let codeBlockStart = false;
    let currentTokenCount = 0;
    let limitReached = false;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
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
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          fullCode += content;
          
          if (isFirstChunk && content.trim().startsWith('```')) {
            codeBlockStart = true;
            const remaining = content.replace(/^```[a-z]*\n?/i, '');
            if (remaining) {
              yield remaining;
            }
          } else if (codeBlockStart) {
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
    throw new Error('Unknown error occurred while generating Dockerfile');
  }
}

export async function* generateHelpfulResponseStreamForDockerfile(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();

  const systemPrompt = `You are an assistant for a Dockerfile Generator app. 
When users ask questions that are NOT primarily about generating Dockerfiles (less than 70% related), you must:
1. Politely inform them that this app can ONLY generate Dockerfiles
2. Be direct and clear - do not provide lengthy explanations or answer their unrelated question
3. Encourage them to describe their application or containerization needs

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${description}"

Respond by letting them know you can only generate Dockerfiles and ask them to describe their application or containerization needs.`;

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
      stream: true,
    });

    let currentTokenCount = 0;
    const MAX_TOKENS = 200;
    let limitReached = false;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
            const charsPerToken = content.length / chunkTokens;
            const allowedChars = Math.floor(remainingTokens * charsPerToken);
            if (allowedChars > 0) {
              yield content.substring(0, allowedChars);
            }
          }
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          yield content;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating response');
  }
}

// Network Troubleshooting Functions

export async function validateNetworkTroubleshootingRequest(description: string): Promise<{ isValid: boolean; message?: string }> {
  const client = initializeOpenAIClient();

  const validationPrompt = `You are a validation assistant for a Network Troubleshooting Assistant app. 
Your task is to determine if the user's request is AT LEAST 50% about network troubleshooting.

The app can help with ALL types of network problems:
- Connectivity issues (ping, traceroute, DNS)
- Latency and performance problems
- Network configuration (IP, subnet, gateway)
- Port and service issues
- Firewall and security problems
- Any network-related troubleshooting

The app can accept any kind of input:
- Text descriptions of network problems
- Network commands
- IP addresses or domains with issues
- Any network-related query

IMPORTANT: The request must be at least 50% focused on network troubleshooting. If it's less than 50% related, it's invalid.

Respond with ONLY a JSON object in this exact format:
{"isValid": true, "relevance": <number 0-100>} if the request is at least 50% about network troubleshooting
{"isValid": false, "relevance": <number 0-100>, "message": "I can only help with network troubleshooting. Please describe a network problem you're experiencing."} if the request is less than 50% about network troubleshooting

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
      return { isValid: true };
    }

    try {
      const result = JSON.parse(response);
      const relevance = result.relevance || 0;
      const isValid = result.isValid === true && relevance >= 50;
      return {
        isValid,
        message: result.message || (isValid ? undefined : "I can only help with network troubleshooting. Please describe a network problem you're experiencing."),
      };
    } catch {
      return { isValid: true };
    }
  } catch (error) {
    return { isValid: true };
  }
}

export async function* generateNetworkTroubleshootingStream(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();
  const MAX_TOKENS = 2000;

  const systemPrompt = `You are an expert network and system administrator specializing in network troubleshooting.
When a user describes a network problem, provide a comprehensive troubleshooting guide that includes:

1. **Diagnostic of the issue**: Analyze the problem and identify potential causes
2. **Step-by-step troubleshooting commands**: Provide actual network commands (ping, traceroute, nslookup, netstat, etc.) that the user can run
3. **Explanations**: Explain what each command does and what the results mean
4. **Recommended solutions**: Provide actionable solutions based on the diagnosis
5. **Best practices**: Include relevant network best practices

Format your response in Markdown with:
- Headers (##) for main sections
- Code blocks (\`\`\`) for commands (use appropriate language tags like bash, powershell, etc.)
- Bullet points for steps and lists
- Clear explanations in paragraphs
- Bold text for important points

Return ONLY the troubleshooting guide in Markdown format, no additional text, no meta-commentary.`;

  const userPrompt = `Provide a comprehensive network troubleshooting guide for the following issue: ${description}`;

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000, // Max tokens for the model, actual output limited by MAX_TOKENS constant
      stream: true,
    });

    let currentTokenCount = 0;
    let limitReached = false;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        const chunkTokens = estimateTokens(content);
        currentTokenCount += chunkTokens;
        
        if (currentTokenCount >= MAX_TOKENS && !limitReached) {
          limitReached = true;
          const remainingTokens = MAX_TOKENS - (currentTokenCount - chunkTokens);
          if (remainingTokens > 0) {
            const charsPerToken = content.length / chunkTokens;
            const allowedChars = Math.floor(remainingTokens * charsPerToken);
            if (allowedChars > 0) {
              yield content.substring(0, allowedChars);
            }
          }
          yield '\n\n[TOKEN_LIMIT_REACHED]';
          break;
        }
        
        if (!limitReached) {
          yield content;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error occurred while generating network troubleshooting guide');
  }
}

export async function* generateHelpfulResponseStreamForNetwork(description: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();

  const systemPrompt = `You are an assistant for a Network Troubleshooting Assistant app. 
When users ask questions that are NOT primarily about network troubleshooting (less than 50% related), you must:
1. Politely inform them that this app can ONLY help with network troubleshooting
2. Be direct and clear - do not provide lengthy explanations or answer their unrelated question
3. Encourage them to describe a network problem they're experiencing

Keep your response brief, clear, and focused. Maximum 2-3 sentences.`;

  const userPrompt = `The user asked: "${description}"

Respond by letting them know you can only help with network troubleshooting and ask them to describe a network problem.`;

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

export async function* extractNetworkCodeStream(troubleshootingGuide: string): AsyncGenerator<string, void, unknown> {
  const client = initializeOpenAIClient();

  const systemPrompt = `You are a code extraction assistant for network troubleshooting guides.
Your task is to extract ONLY the executable code/commands from a network troubleshooting guide.

Extract:
- Network commands (ping, traceroute, nslookup, netstat, ipconfig, ifconfig, etc.)
- Configuration scripts (bash, powershell, batch, etc.)
- Configuration files content (if applicable)
- Any executable code blocks that can be copied and run

DO NOT extract:
- Explanatory text
- Comments that are not part of code
- Markdown formatting
- Headers or descriptions

Format the output as clean, ready-to-copy code blocks. If there are multiple code blocks, separate them clearly.
If no executable code is found, return an empty string.

Return ONLY the code, no explanations, no markdown code block markers (\`\`\`), no additional text.`;

  const userPrompt = `Extract all executable code/commands from this network troubleshooting guide:

${troubleshootingGuide}

Return only the code that can be copied and executed.`;

  try {
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
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
    throw new Error('Unknown error occurred while extracting code');
  }
}