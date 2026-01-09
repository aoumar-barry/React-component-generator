export type DetectedLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'java' 
  | 'csharp' 
  | 'go' 
  | 'ruby'
  | 'unknown';

export interface LanguageInfo {
  language: DetectedLanguage;
  framework: string;
  displayName: string;
  fileExtension: string;
}

const languagePatterns: Record<DetectedLanguage, { patterns: RegExp[]; framework: string; displayName: string; extension: string }> = {
  typescript: {
    patterns: [
      /import\s+.*from\s+['"].*['"]/,
      /export\s+(const|function|class|interface|type|enum)/,
      /:\s*(string|number|boolean|any|void|object|Array<|Promise<)/,
      /interface\s+\w+|type\s+\w+\s*=/,
      /<[A-Z]\w*>/,
    ],
    framework: 'Jest',
    displayName: 'TypeScript',
    extension: '.test.ts',
  },
  javascript: {
    patterns: [
      /(const|let|var)\s+\w+\s*=\s*(require|import)/,
      /function\s+\w+\s*\(/,
      /module\.(exports|import)/,
      /console\.(log|error|warn)/,
      /document\.|window\./,
    ],
    framework: 'Jest',
    displayName: 'JavaScript',
    extension: '.test.js',
  },
  python: {
    patterns: [
      /def\s+\w+\s*\(/,
      /import\s+\w+|from\s+\w+\s+import/,
      /class\s+\w+.*:/,
      /:\s*#/,
      /print\s*\(/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
    ],
    framework: 'pytest',
    displayName: 'Python',
    extension: '_test.py',
  },
  java: {
    patterns: [
      /public\s+(class|interface|enum)/,
      /(public|private|protected)\s+(static\s+)?(void|int|String|boolean|long|double)/,
      /@Override|@Deprecated|@SuppressWarnings/,
      /import\s+java\./,
      /package\s+\w+/,
      /System\.out\.println/,
    ],
    framework: 'JUnit 5',
    displayName: 'Java',
    extension: 'Test.java',
  },
  csharp: {
    patterns: [
      /using\s+System/,
      /namespace\s+\w+/,
      /public\s+(class|interface|enum)/,
      /(public|private|protected)\s+(static\s+)?(void|int|string|bool|long|double)/,
      /Console\.(WriteLine|Write)/,
    ],
    framework: 'xUnit',
    displayName: 'C#',
    extension: '.Tests.cs',
  },
  go: {
    patterns: [
      /package\s+\w+/,
      /func\s+\w+\s*\(/,
      /import\s*\(/,
      /fmt\.(Print|Println|Printf)/,
      /:=\s*/,
    ],
    framework: 'Testing',
    displayName: 'Go',
    extension: '_test.go',
  },
  ruby: {
    patterns: [
      /def\s+\w+/,
      /class\s+\w+/,
      /module\s+\w+/,
      /require\s+['"]/,
      /puts\s+/,
      /end\s*$/,
    ],
    framework: 'RSpec',
    displayName: 'Ruby',
    extension: '_spec.rb',
  },
  unknown: {
    patterns: [],
    framework: 'Unknown',
    displayName: 'Unknown',
    extension: '',
  },
};

export function detectLanguage(code: string): LanguageInfo {
  if (!code || code.trim().length === 0) {
    return {
      language: 'unknown',
      framework: 'Unknown',
      displayName: 'Unknown',
      fileExtension: '',
    };
  }

  // Normalize code - remove comments and extra whitespace for better detection
  const normalizedCode = code.trim();
  
  // Score each language based on pattern matches
  const scores: Record<DetectedLanguage, number> = {
    typescript: 0,
    javascript: 0,
    python: 0,
    java: 0,
    csharp: 0,
    go: 0,
    ruby: 0,
    unknown: 0,
  };

  // Check TypeScript first (more specific patterns)
  if (languagePatterns.typescript.patterns.some(pattern => pattern.test(normalizedCode))) {
    scores.typescript += 1;
    // TypeScript-specific checks
    if (/:\s*(string|number|boolean|any|void)/.test(normalizedCode) || /interface\s+\w+|type\s+\w+\s*=/.test(normalizedCode)) {
      scores.typescript += 2;
    }
  }

  // Check JavaScript (fallback if not TypeScript)
  if (scores.typescript === 0 && languagePatterns.javascript.patterns.some(pattern => pattern.test(normalizedCode))) {
    scores.javascript += 1;
  }

  // Check other languages
  for (const [lang, config] of Object.entries(languagePatterns)) {
    if (lang === 'typescript' || lang === 'javascript' || lang === 'unknown') continue;
    
    const matchCount = config.patterns.filter(pattern => pattern.test(normalizedCode)).length;
    scores[lang as DetectedLanguage] = matchCount;
  }

  // Find language with highest score
  let detectedLang: DetectedLanguage = 'unknown';
  let maxScore = 0;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang as DetectedLanguage;
    }
  }

  // If TypeScript has any score, prefer it (more specific)
  if (scores.typescript > 0) {
    detectedLang = 'typescript';
  } else if (scores.javascript > 0 && maxScore <= 1) {
    detectedLang = 'javascript';
  }

  const langConfig = languagePatterns[detectedLang];

  return {
    language: detectedLang,
    framework: langConfig.framework,
    displayName: langConfig.displayName,
    fileExtension: langConfig.extension,
  };
}




