import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('keeps the code-block toolbar wrapping inside narrow containers', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });

  try {
    const { CodeBlock } = await vite.ssrLoadModule('/src/components/Chat/CodeBlock.tsx');
    const markup = renderToStaticMarkup(
      React.createElement(CodeBlock, {
        language: 'javascript',
        codeString: "console.log('mobile');",
        onGenerateTests: () => undefined,
      }),
    );

    assert.match(markup, /flex-wrap[^\"]*items-center[^\"]*justify-between/);
    assert.match(markup, /min-w-0[^\"]*max-w-full[^\"]*flex-wrap[^\"]*justify-end/);
  } finally {
    await vite.close();
  }
});
