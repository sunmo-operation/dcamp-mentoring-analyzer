"use client";

import { useState } from "react";

// ── 복사 버튼 ────────────────────────────────────
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
      title="복사"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
