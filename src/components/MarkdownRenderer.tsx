'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Split by lines for processing
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) {
        elements.push(<div key={`empty-${key++}`} className="h-2" />);
        continue;
      }

      // Headers (# ## ### etc)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const sizeClasses = {
          1: 'text-xl font-bold text-white mt-4 mb-2',
          2: 'text-lg font-bold text-white mt-3 mb-2',
          3: 'text-base font-semibold text-white mt-2 mb-1',
          4: 'text-sm font-semibold text-gray-200 mt-2 mb-1',
          5: 'text-sm font-medium text-gray-300 mt-1 mb-1',
          6: 'text-xs font-medium text-gray-400 mt-1 mb-1',
        };
        elements.push(
          <div key={`h${level}-${key++}`} className={sizeClasses[level as keyof typeof sizeClasses]}>
            {processInlineMarkdown(text)}
          </div>
        );
        continue;
      }

      // Bullet lists (- or * or •)
      const bulletMatch = line.match(/^[\s]*[-*•]\s+(.+)$/);
      if (bulletMatch) {
        elements.push(
          <div key={`bullet-${key++}`} className="flex gap-2 text-gray-300 mb-1 ml-4">
            <span className="text-[#3a8bfd] flex-shrink-0">•</span>
            <span>{processInlineMarkdown(bulletMatch[1])}</span>
          </div>
        );
        continue;
      }

      // Numbered lists (1. 2. etc)
      const numberedMatch = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        elements.push(
          <div key={`numbered-${key++}`} className="flex gap-2 text-gray-300 mb-1 ml-4">
            <span className="text-[#3a8bfd] flex-shrink-0">{numberedMatch[1]}.</span>
            <span>{processInlineMarkdown(numberedMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Code blocks (```language or ```)
      if (line.trim().startsWith('```')) {
        const codeLines: string[] = [];
        i++; // Move to next line
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <pre key={`code-${key++}`} className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-3 my-2 overflow-x-auto">
            <code className="text-sm text-gray-200 font-mono">
              {codeLines.join('\n')}
            </code>
          </pre>
        );
        continue;
      }

      // Blockquotes (> text)
      const quoteMatch = line.match(/^>\s+(.+)$/);
      if (quoteMatch) {
        elements.push(
          <div key={`quote-${key++}`} className="border-l-4 border-[#3a8bfd] pl-4 py-1 my-2 text-gray-300 italic">
            {processInlineMarkdown(quoteMatch[1])}
          </div>
        );
        continue;
      }

      // Horizontal rule (--- or ***)
      if (line.match(/^[\s]*[-*]{3,}[\s]*$/)) {
        elements.push(
          <hr key={`hr-${key++}`} className="border-t border-[#3a3a3a] my-4" />
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${key++}`} className="text-gray-300 mb-2 leading-relaxed">
          {processInlineMarkdown(line)}
        </p>
      );
    }

    return elements;
  };

  const processInlineMarkdown = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let remaining = text;
    let key = 0;

    while (remaining) {
      // Bold (**text** or __text__)
      const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.+?)\2/);
      if (boldMatch) {
        if (boldMatch[1]) parts.push(boldMatch[1]);
        parts.push(<strong key={`bold-${key++}`} className="font-semibold text-white">{boldMatch[3]}</strong>);
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // Italic (*text* or _text_)
      const italicMatch = remaining.match(/^(.*?)([*_])(.+?)\2/);
      if (italicMatch) {
        if (italicMatch[1]) parts.push(italicMatch[1]);
        parts.push(<em key={`italic-${key++}`} className="italic text-gray-200">{italicMatch[3]}</em>);
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // Inline code (`code`)
      const codeMatch = remaining.match(/^(.*?)`(.+?)`/);
      if (codeMatch) {
        if (codeMatch[1]) parts.push(codeMatch[1]);
        parts.push(
          <code key={`code-${key++}`} className="bg-[#1a1a1a] text-[#3a8bfd] px-1.5 py-0.5 rounded text-sm font-mono">
            {codeMatch[2]}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        continue;
      }

      // Links [text](url)
      const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        if (linkMatch[1]) parts.push(linkMatch[1]);
        parts.push(
          <a 
            key={`link-${key++}`} 
            href={linkMatch[3]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#3a8bfd] hover:text-[#4a9bff] underline"
          >
            {linkMatch[2]}
          </a>
        );
        remaining = remaining.substring(linkMatch[0].length);
        continue;
      }

      // No more markdown, add remaining text
      parts.push(remaining);
      break;
    }

    return parts;
  };

  return (
    <div className="markdown-content">
      {renderMarkdown(content)}
    </div>
  );
}

