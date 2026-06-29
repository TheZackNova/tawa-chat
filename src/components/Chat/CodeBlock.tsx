import React, { Suspense } from 'react';
import { Check, Copy, TestTube2, ShieldAlert, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SyntaxHighlighter = React.lazy(() => 
  import('react-syntax-highlighter').then(module => ({ default: module.Prism }))
);

interface CodeBlockProps {
  language: string;
  codeString: string;
  onGenerateTests?: (code: string, language: string) => void;
  [key: string]: any;
}

const LazyMermaid = React.lazy(() => import('./Mermaid'));

export const CodeBlock = React.memo(({ language, codeString, onGenerateTests, ...props }: CodeBlockProps) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  if (language === 'mermaid') {
    return (
      <div className="my-4 bg-zinc-950/50 rounded-lg p-2 border border-zinc-800">
        <Suspense fallback={<div className="text-zinc-500 font-mono text-xs text-center py-4">Đang vẽ biểu đồ Diagram...</div>}>
          <LazyMermaid chart={codeString} />
        </Suspense>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const checkSecurityRisk = (code: string) => {
    const riskPattern = /sk-[a-zA-Z0-9]{20,}|(password|secret|token|api_key)\s*[:=]\s*['"][a-zA-Z0-9_]+['"]/i;
    return riskPattern.test(code);
  };

  const checkSyntax = (code: string, lang: string) => {
    if (!['javascript', 'typescript', 'js', 'ts'].includes(lang)) return null;
    let openBraces = (code.match(/\{/g) || []).length;
    let closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return "Cảnh báo: Số lượng dấu ngoặc nhọn {} không khớp.";
    }
    return null;
  };

  const hasSecurityRisk = checkSecurityRisk(codeString);
  const syntaxWarning = checkSyntax(codeString, language);

  return (
    <div className="relative group/code my-4 rounded-lg overflow-hidden bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
        <div className="flex items-center gap-3">
          {(language === 'html' || language === 'css' || language === 'javascript' || language === 'js') && (
            <button 
              onClick={() => useStore.getState().openCanvas(codeString)}
              className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors bg-pink-900/30 px-2 py-1 rounded"
            >
              <span className="text-sm">🎨</span> Mở Canvas
            </button>
          )}
          {onGenerateTests && (
            <button 
              onClick={() => onGenerateTests(codeString, language)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <TestTube2 className="h-3 w-3" />
              Tạo Unit Test
            </button>
          )}
          <button 
            onClick={() => handleCopy(codeString)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {copiedCode === codeString ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copiedCode === codeString ? 'Đã chép' : 'Sao chép'}
          </button>
        </div>
      </div>
      {hasSecurityRisk && (
        <div className="bg-red-950/50 border-b border-red-900/50 px-4 py-2 flex items-start gap-2 text-red-400 text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Cảnh báo: Đoạn mã này có thể chứa thông tin nhạy cảm (API Key, mật khẩu). Hãy cẩn thận trước khi sử dụng.</span>
        </div>
      )}
      {syntaxWarning && (
        <div className="bg-amber-950/50 border-b border-amber-900/50 px-4 py-2 flex items-start gap-2 text-amber-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{syntaxWarning}</span>
        </div>
      )}
      <Suspense fallback={<div className="p-4 text-xs text-zinc-500 font-mono">Đang tải trình hiển thị code...</div>}>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </Suspense>
    </div>
  );
});
