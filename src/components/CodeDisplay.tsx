'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CopyButton from './CopyButton';

interface CodeDisplayProps {
  code: string;
  language?: string;
}

export default function CodeDisplay({ code, language = 'tsx' }: CodeDisplayProps) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 overflow-auto bg-[#1a1a1a]">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            background: '#1a1a1a',
            fontSize: '0.875rem',
            lineHeight: '1.6',
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      </div>
      <CopyButton code={code} />
    </div>
  );
}

