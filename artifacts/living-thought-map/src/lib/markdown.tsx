import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-200">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n');

        // Check if this paragraph is a heading
        const firstLine = lines[0];
        if (firstLine.startsWith('### ')) {
          return <h3 key={pi} className="text-sm font-semibold text-slate-200 mt-1">{renderInline(firstLine.slice(4))}</h3>;
        }
        if (firstLine.startsWith('## ')) {
          return <h2 key={pi} className="text-sm font-bold text-slate-100 mt-1">{renderInline(firstLine.slice(3))}</h2>;
        }
        if (firstLine.startsWith('# ')) {
          return <h1 key={pi} className="text-base font-bold text-slate-100 mt-1">{renderInline(firstLine.slice(2))}</h1>;
        }

        // Check if all lines are list items
        const isUL = lines.every((l) => l.match(/^[-*] /));
        const isOL = lines.every((l) => l.match(/^\d+\. /));

        if (isUL) {
          return (
            <ul key={pi} className="list-disc list-inside space-y-0.5 pl-1">
              {lines.map((l, li) => (
                <li key={li} className="text-xs text-slate-400 leading-relaxed">{renderInline(l.replace(/^[-*] /, ''))}</li>
              ))}
            </ul>
          );
        }
        if (isOL) {
          return (
            <ol key={pi} className="list-decimal list-inside space-y-0.5 pl-1">
              {lines.map((l, li) => (
                <li key={li} className="text-xs text-slate-400 leading-relaxed">{renderInline(l.replace(/^\d+\. /, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={pi} className="text-xs text-slate-400 leading-relaxed">
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
