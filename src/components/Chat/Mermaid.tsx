import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

export default function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart)
        .then((result) => {
          if (ref.current) ref.current.innerHTML = result.svg;
        })
        .catch((e) => {
          if (ref.current) ref.current.innerHTML = `<div class="text-red-500 text-xs">Mermaid lỗi: ${e.message}</div>`;
        });
    }
  }, [chart]);

  return <div ref={ref} className="mermaid-renderer flex justify-center py-4 overflow-x-auto min-h-[100px]" />;
}
