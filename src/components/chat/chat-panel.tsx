"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  companyId: string;
  companyName: string;
  floating?: boolean; // 플로팅 패널 모드 (헤더 숨김, flex 레이아웃)
}

// 추천 질문 칩
const SUGGESTED_QUESTIONS = [
  "최근 핵심 이슈가 뭐야?",
  "KPT에서 미해결 문제는?",
  "다음 미팅 전략 추천해줘",
  "멘토링 반복 지적 사항 정리해줘",
];

export function ChatPanel({ companyId, companyName, floating = false }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 메시지 끝으로 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // textarea 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      // 이전 요청 취소
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = { role: "user", content: content.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);
      setError(null);
      setStreamingText("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, messages: updatedMessages }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          try {
            const data = JSON.parse(text);
            setError(data.error || `서버 오류 (${res.status})`);
          } catch {
            setError(`서버 오류가 발생했습니다 (${res.status})`);
          }
          return;
        }

        // SSE 스트림 읽기
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "heartbeat") continue;

                if (data.type === "delta") {
                  accumulated += data.text;
                  setStreamingText(accumulated);
                }

                if (data.type === "done") {
                  // 스트리밍 완료 → 메시지 배열에 추가
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: accumulated },
                  ]);
                  setStreamingText("");
                }

                if (data.type === "error") {
                  setError(data.message);
                }
              } catch {
                // SSE 파싱 실패 무시
              }
            }
          }

          // 스트림 종료 후 accumulated가 남아있으면 메시지에 추가
          if (accumulated && !error) {
            setMessages((prev) => {
              // done 이벤트로 이미 추가되었는지 확인
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.content === accumulated) {
                return prev;
              }
              return [...prev, { role: "assistant", content: accumulated }];
            });
            setStreamingText("");
          }
        } catch (streamErr) {
          if (controller.signal.aborted) return;
          console.warn("[ChatPanel] 스트림 읽기 중단:", streamErr);
          // 부분 응답이라도 저장
          if (accumulated) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: accumulated },
            ]);
            setStreamingText("");
          } else {
            setError("서버 연결이 끊어졌습니다. 다시 시도해주세요.");
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[ChatPanel] 전송 실패:", err);
        setError("서버에 연결할 수 없습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    },
    [companyId, messages, loading, error],
  );

  // 중단 버튼
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    // 스트리밍 중이던 텍스트를 메시지에 저장
    if (streamingText) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: streamingText },
      ]);
      setStreamingText("");
    }
  }, [streamingText]);

  // Enter로 전송, Shift+Enter로 줄바꿈
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  // 언마운트 시 요청 취소
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const hasMessages = messages.length > 0 || streamingText;

  return (
    <div className={floating ? "flex flex-col h-full" : "space-y-4"}>
      {/* 헤더 — 플로팅 모드에서는 FloatingChat이 제공하므로 숨김 */}
      {!floating && (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <svg
              className="h-4 w-4 text-white"
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
          <h2 className="text-lg font-bold">
            AI에게 {companyName}에 대해 물어보세요
          </h2>
        </div>
      )}

      {/* 챗 영역 */}
      <div className={`${floating ? "flex-1 flex flex-col min-h-0" : "rounded-2xl border border-purple-100 bg-gradient-to-b from-purple-50/50 to-white dark:border-purple-900 dark:from-purple-950/30 dark:to-gray-950"}`}>
        {/* 추천 질문 (대화 시작 전) */}
        {!hasMessages && (
          <div className="p-5">
            <p className="mb-3 text-sm text-muted-foreground">
              추천 질문으로 시작해보세요
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="rounded-full border border-purple-200 bg-white px-3.5 py-1.5 text-sm text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 dark:border-purple-800 dark:bg-gray-900 dark:text-purple-300 dark:hover:border-purple-600 dark:hover:bg-purple-950"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {hasMessages && (
          <div className={`${floating ? "flex-1" : "max-h-[500px]"} overflow-y-auto p-4 space-y-4`}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {/* 스트리밍 중인 AI 응답 */}
            {streamingText && (
              <MessageBubble
                message={{ role: "assistant", content: streamingText }}
                isStreaming
              />
            )}

            {/* 로딩 인디케이터 (스트리밍 시작 전) */}
            {loading && !streamingText && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-md bg-gray-100 dark:bg-gray-800 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="mx-4 mb-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive dark:bg-red-950 dark:text-red-200">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="border-t border-purple-100 dark:border-purple-900 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈)"
              disabled={loading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-purple-500 dark:focus:ring-purple-500"
            />
            {loading ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                className="shrink-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                중단
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50"
              >
                전송
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메시지 버블 컴포넌트 ────────────────────────

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <div
        className={`max-w-[85%] rounded-2xl rounded-tl-md bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm prose prose-sm dark:prose-invert max-w-none ${isStreaming ? "animate-pulse-subtle" : ""}`}
      >
        <MarkdownContent content={message.content} />
      </div>
    </div>
  );
}

// ── 간이 마크다운 렌더러 ────────────────────────
// 외부 라이브러리 없이 기본적인 마크다운 지원

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 제목 (## / ###)
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {formatInline(line.slice(4))}
        </h4>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="font-bold text-sm mt-3 mb-1">
          {formatInline(line.slice(3))}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="font-bold text-base mt-3 mb-1">
          {formatInline(line.slice(2))}
        </h2>,
      );
    }
    // 리스트 아이템 (- / * / 숫자.)
    else if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && (/^[-*] /.test(lines[i]) || /^\d+\. /.test(lines[i]))) {
        listItems.push(lines[i].replace(/^[-*] /, "").replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {listItems.map((item, j) => (
            <li key={j}>{formatInline(item)}</li>
          ))}
        </ul>,
      );
      continue; // i는 이미 증가됨
    }
    // 빈 줄
    else if (line.trim() === "") {
      // 무시
    }
    // 일반 텍스트
    else {
      elements.push(
        <p key={i} className="my-0.5">
          {formatInline(line)}
        </p>,
      );
    }

    i++;
  }

  return <>{elements}</>;
}

// 인라인 마크다운: **볼드**, *이탤릭*, `코드`
function formatInline(text: string): React.ReactNode {
  // **볼드** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-gray-200 dark:bg-gray-700 px-1 text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
