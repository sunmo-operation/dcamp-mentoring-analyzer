"use client";

import { useReducer, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company, Mentor, MentoringSession } from "@/types";

// ── 상태 타입 정의 ────────────────────────────────
interface FormFields {
  companyId: string;
  mentorName: string;
  topic: string;
  mentoringDate: string;
  transcript: string;
  sessionId: string;
}

interface FormState {
  fields: FormFields;
  companyMentors: Mentor[];
  otherMentors: Mentor[];
  sessions: MentoringSession[];
  loadingMentors: boolean;
  loadingSessions: boolean;
  loadingTranscript: boolean;
  isSubmitting: boolean;
  error: string | null;
  transcriptNotice: string | null;
}

// ── 액션 타입 ─────────────────────────────────────
type FormAction =
  | { type: "SET_FIELD"; field: keyof FormFields; value: string }
  | { type: "RESET_COMPANY" }
  | { type: "SET_COMPANY_DATA"; companyMentors: Mentor[]; otherMentors: Mentor[]; sessions: MentoringSession[] }
  | { type: "SET_LOADING"; key: "mentors" | "sessions" | "transcript"; value: boolean }
  | { type: "SET_SESSION_DATA"; mentorName: string; topic: string; date: string; transcript: string; notice: string | null }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_NOTICE"; notice: string | null }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "LOAD_COMPANY_FAILED"; notice: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, fields: { ...state.fields, [action.field]: action.value } };

    case "RESET_COMPANY":
      // 기업 변경 시 관련 데이터 전체 초기화
      return {
        ...state,
        fields: { ...state.fields, mentorName: "", topic: "", transcript: "", sessionId: "" },
        companyMentors: [],
        otherMentors: [],
        sessions: [],
        transcriptNotice: null,
      };

    case "SET_COMPANY_DATA":
      return {
        ...state,
        companyMentors: action.companyMentors,
        otherMentors: action.otherMentors,
        sessions: action.sessions,
        loadingMentors: false,
        loadingSessions: false,
      };

    case "SET_LOADING":
      if (action.key === "mentors") return { ...state, loadingMentors: action.value };
      if (action.key === "sessions") return { ...state, loadingSessions: action.value };
      return { ...state, loadingTranscript: action.value };

    case "SET_SESSION_DATA":
      return {
        ...state,
        fields: {
          ...state.fields,
          mentorName: action.mentorName || state.fields.mentorName,
          topic: action.topic,
          mentoringDate: action.date || state.fields.mentoringDate,
          transcript: action.transcript,
        },
        transcriptNotice: action.notice,
        loadingTranscript: false,
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SET_NOTICE":
      return { ...state, transcriptNotice: action.notice };

    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.value };

    case "LOAD_COMPANY_FAILED":
      return {
        ...state,
        loadingMentors: false,
        loadingSessions: false,
        transcriptNotice: action.notice,
      };

    default:
      return state;
  }
}

// ── 컴포넌트 ──────────────────────────────────────
interface AnalysisFormProps {
  companies: Company[];
  defaultCompanyId?: string;
}

export function AnalysisForm({
  companies,
  defaultCompanyId,
}: AnalysisFormProps) {
  const router = useRouter();

  const [state, dispatch] = useReducer(formReducer, {
    fields: {
      companyId: defaultCompanyId ?? "",
      mentorName: "",
      topic: "",
      mentoringDate: new Date().toISOString().split("T")[0],
      transcript: "",
      sessionId: "",
    },
    companyMentors: [],
    otherMentors: [],
    sessions: [],
    loadingMentors: false,
    loadingSessions: false,
    loadingTranscript: false,
    isSubmitting: false,
    error: null,
    transcriptNotice: null,
  });

  const { fields, companyMentors, otherMentors, sessions } = state;

  // 기업 선택 시 → 멘토 + 세션 로드
  const loadCompanyData = useCallback(async (cId: string) => {
    if (!cId) {
      dispatch({ type: "SET_COMPANY_DATA", companyMentors: [], otherMentors: [], sessions: [] });
      return;
    }

    dispatch({ type: "SET_LOADING", key: "mentors", value: true });
    dispatch({ type: "SET_LOADING", key: "sessions", value: true });

    try {
      const [mentorsRes, sessionsRes] = await Promise.all([
        fetch(`/api/mentors?companyId=${cId}`),
        fetch(`/api/sessions?companyId=${cId}`),
      ]);

      const mentorData = mentorsRes.ok ? await mentorsRes.json() : {};
      const sessionData = sessionsRes.ok ? await sessionsRes.json() : [];

      dispatch({
        type: "SET_COMPANY_DATA",
        companyMentors: mentorData.companyMentors || [],
        otherMentors: mentorData.otherMentors || [],
        sessions: Array.isArray(sessionData) ? sessionData : [],
      });
    } catch (error) {
      console.warn("[AnalysisForm] 멘토/세션 로드 실패:", error);
      dispatch({ type: "LOAD_COMPANY_FAILED", notice: "멘토/세션 정보를 불러오지 못했습니다. 직접 입력해주세요." });
    }
  }, []);

  // 기업 변경 시 연쇄 로드
  useEffect(() => {
    if (fields.companyId) {
      loadCompanyData(fields.companyId);
    }
  }, [fields.companyId, loadCompanyData]);

  // 초기 로드 (defaultCompanyId가 있는 경우)
  useEffect(() => {
    if (defaultCompanyId) {
      loadCompanyData(defaultCompanyId);
    }
  }, [defaultCompanyId, loadCompanyData]);

  // 기업 변경 핸들러
  function handleCompanyChange(value: string) {
    dispatch({ type: "SET_FIELD", field: "companyId", value });
    dispatch({ type: "RESET_COMPANY" });
  }

  // 세션 선택 시 → 본문 로드
  async function handleSessionSelect(sessionPageId: string) {
    if (!sessionPageId || sessionPageId === "__none__") {
      dispatch({ type: "SET_FIELD", field: "sessionId", value: "" });
      dispatch({ type: "SET_NOTICE", notice: null });
      return;
    }

    dispatch({ type: "SET_FIELD", field: "sessionId", value: sessionPageId });
    dispatch({ type: "SET_LOADING", key: "transcript", value: true });
    dispatch({ type: "SET_NOTICE", notice: null });

    try {
      const res = await fetch(`/api/sessions/${sessionPageId}`);
      if (!res.ok) throw new Error("세션 로드 실패");

      const session: MentoringSession = await res.json();

      // 원문 로드 로직
      let transcript = "";
      let notice: string | null = null;

      if (session.transcript && session.transcript.trim().length > 0) {
        transcript = session.transcript;
      } else if (session.summary && session.summary.trim().length > 0) {
        transcript = session.summary;
        notice = "페이지 본문이 없어 요약본으로 대체됩니다";
      } else {
        notice = "원문이 없습니다. 직접 입력해주세요";
      }

      dispatch({
        type: "SET_SESSION_DATA",
        mentorName: session.mentorNames?.join(", ") || "",
        topic: session.title,
        date: session.date || "",
        transcript,
        notice,
      });
    } catch (error) {
      console.warn("[AnalysisForm] 세션 본문 로드 실패:", error);
      dispatch({ type: "SET_NOTICE", notice: "세션 본문을 불러오는데 실패했습니다" });
      dispatch({ type: "SET_LOADING", key: "transcript", value: false });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SET_ERROR", error: null });

    if (!fields.companyId) {
      dispatch({ type: "SET_ERROR", error: "기업을 선택해주세요" });
      return;
    }
    if (!fields.transcript.trim()) {
      dispatch({ type: "SET_ERROR", error: "멘토링 원문을 입력해주세요" });
      return;
    }
    if (fields.transcript.trim().length < 50) {
      dispatch({ type: "SET_ERROR", error: "멘토링 원문이 너무 짧습니다 (최소 50자)" });
      return;
    }

    dispatch({ type: "SET_SUBMITTING", value: true });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: fields.companyId,
          transcript: fields.transcript.trim(),
          mentorName: fields.mentorName.trim() || "미지정",
          topic: fields.topic.trim() || "일반 멘토링",
          mentoringDate: fields.mentoringDate,
          sessionId: fields.sessionId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "분석 요청에 실패했습니다");
      }

      router.push(`/analyze/${data.analysisId}`);
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다",
      });
      dispatch({ type: "SET_SUBMITTING", value: false });
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>멘토링 분석 요청</CardTitle>
        <CardDescription>
          멘토링 원문을 입력하면 AI가 5가지 구조화된 인사이트를 생성합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── 1. 기업 선택 ── */}
          <div className="space-y-2">
            <Label>기업 *</Label>
            <Select value={fields.companyId} onValueChange={handleCompanyChange} required aria-required="true">
              <SelectTrigger>
                <SelectValue placeholder="분석할 기업을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.notionPageId} value={c.notionPageId}>
                    {c.name} — {c.batchLabel || "배치 미지정"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── 2. 멘토 선택 ── */}
          <div className="space-y-2">
            <Label>멘토</Label>
            {state.loadingMentors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden="true" />
                멘토 목록 로딩 중...
              </div>
            ) : companyMentors.length > 0 || otherMentors.length > 0 ? (
              <Select value={fields.mentorName} onValueChange={(v) => dispatch({ type: "SET_FIELD", field: "mentorName", value: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="멘토를 선택하세요 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {companyMentors.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>담당 멘토</SelectLabel>
                      {companyMentors.map((m) => (
                        <SelectItem key={m.notionPageId} value={m.name}>
                          {m.name}
                          {m.mentorType ? ` (${m.mentorType})` : ""}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {otherMentors.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>전체 멘토</SelectLabel>
                      {otherMentors.map((m) => (
                        <SelectItem key={m.notionPageId} value={m.name}>
                          {m.name}
                          {m.mentorType ? ` (${m.mentorType})` : ""}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={
                  fields.companyId
                    ? "등록된 멘토가 없습니다. 직접 입력하세요"
                    : "기업을 먼저 선택하세요"
                }
                value={fields.mentorName}
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "mentorName", value: e.target.value })}
              />
            )}
          </div>

          {/* ── 3. 회의록 원문 불러오기 ── */}
          {fields.companyId && (
            <div className="space-y-2">
              <Label>최근 회의록</Label>
              {state.loadingSessions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden="true" />
                  회의록 목록 로딩 중...
                </div>
              ) : sessions.length > 0 ? (
                <Select
                  value={fields.sessionId}
                  onValueChange={handleSessionSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="회의록을 선택하면 원문을 자동으로 불러옵니다" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">직접 입력</SelectItem>
                    {sessions.map((s) => (
                      <SelectItem
                        key={s.notionPageId}
                        value={s.notionPageId}
                      >
                        <span className="flex items-center gap-2">
                          <span>{s.title}</span>
                          <span className="text-muted-foreground">
                            {s.date
                              ? new Date(s.date).toLocaleDateString("ko-KR", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""}
                          </span>
                          {s.sessionTypes.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-xs py-0"
                            >
                              {t}
                            </Badge>
                          ))}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  등록된 회의록이 없습니다
                </p>
              )}

              {/* 원문 로드 안내 */}
              {state.transcriptNotice && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  {state.transcriptNotice}
                </div>
              )}

              {state.loadingTranscript && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden="true" />
                  회의록 본문을 불러오는 중...
                </div>
              )}
            </div>
          )}

          {/* ── 날짜 + 주제 ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">멘토링 날짜</Label>
              <Input
                id="date"
                type="date"
                value={fields.mentoringDate}
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "mentoringDate", value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">멘토링 주제</Label>
              <Input
                id="topic"
                placeholder="예: B2B SaaS 가격 전략"
                value={fields.topic}
                onChange={(e) => dispatch({ type: "SET_FIELD", field: "topic", value: e.target.value })}
              />
            </div>
          </div>

          {/* ── 원문 입력 ── */}
          <div className="space-y-2">
            <Label htmlFor="transcript">멘토링 원문 *</Label>
            <Textarea
              id="transcript"
              placeholder="멘토링 녹취록 또는 회의록을 붙여넣으세요... 위에서 회의록을 선택하면 자동으로 입력됩니다."
              value={fields.transcript}
              onChange={(e) => dispatch({ type: "SET_FIELD", field: "transcript", value: e.target.value })}
              rows={12}
              className="resize-y"
              aria-required="true"
            />
            <p className="text-xs text-muted-foreground">
              {fields.transcript.length}자 입력됨 (최소 50자)
            </p>
          </div>

          {/* 컨텍스트 자동 주입 안내 */}
          {fields.companyId && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              기수 전체 타임라인 + 전문가 요청 이력 자동 반영됨
            </div>
          )}

          {/* 에러 메시지 */}
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {/* 제출 */}
          <Button
            type="submit"
            className="w-full"
            disabled={state.isSubmitting || state.loadingTranscript}
            size="lg"
          >
            {state.isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                AI 분석 중...
              </span>
            ) : (
              "AI 분석 시작"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
