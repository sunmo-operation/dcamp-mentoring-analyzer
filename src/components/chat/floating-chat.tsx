"use client";

import { useState, useEffect } from "react";
import { ChatPanel } from "./chat-panel";

interface FloatingChatProps {
  companyId: string;
  companyName: string;
}

export function FloatingChat({ companyId, companyName }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  return (
    <>
      {/* ── 플로팅 버튼 (우하단 고정) ────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="AI 챗 열기"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full
          bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3.5
          text-white shadow-lg shadow-purple-500/25
          transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105
          ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="text-sm font-medium">AI 챗</span>
      </button>

      {/* ── 배경 오버레이 ────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/10 transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ── 슬라이드업 챗 패널 ───────────────────────── */}
      <div
        role="dialog"
        aria-label={`${companyName} AI 챗`}
        className={`fixed z-50
          bottom-0 right-0 w-full
          sm:bottom-6 sm:right-6 sm:w-[420px]
          h-[85vh] sm:h-auto sm:max-h-[640px]
          rounded-t-2xl sm:rounded-2xl
          bg-white dark:bg-gray-950
          shadow-2xl border border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-out
          flex flex-col overflow-hidden
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-[105%] opacity-0 pointer-events-none"}`}
      >
        {/* 상단 바: 회사명 + 닫기 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <svg
                className="h-3.5 w-3.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {companyName} AI 챗
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ChatPanel (플로팅 모드) */}
        <div className="flex-1 min-h-0">
          <ChatPanel
            companyId={companyId}
            companyName={companyName}
            floating
          />
        </div>
      </div>
    </>
  );
}
