"use client";

import { useState, useEffect, useCallback } from "react";
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

interface AnalysisFormProps {
  companies: Company[];
  defaultCompanyId?: string;
}

export function AnalysisForm({
  companies,
  defaultCompanyId,
}: AnalysisFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 필드
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [mentorName, setMentorName] = useState("");
  const [topic, setTopic] = useState("");
  const [mentoringDate, setMentoringDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string>("");

  // 동적 로딩 상태
  const [companyMentors, setCompanyMentors] = useState<Mentor[]>([]);
  const [otherMentors, setOtherMentors] = useState<Mentor[]>([]);
  const [sessions, setSessions] = useState<MentoringSession[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptNotice, setTranscriptNotice] = useState<string | null>(null);

  // 기업 선택 시 → 멘토 + 세션 로드
  const loadCompanyData = useCallback(async (cId: string) => {
    if (!cId) {
      setCompanyMentors([]);
      setOtherMentors([]);
      setSessions([]);
      return;
    }

    setLoadingMentors(true);
    setLoadingSessions(true);

    try {
      const [mentorsRes, sessionsRes] = await Promise.all([
        fetch(`/api/mentors?companyId=${cId}`),
        fetch(`/api/sessions?companyId=${cId}`),
      ]);

      if (mentorsRes.ok) {
        const data = await mentorsRes.json();
        setCompanyMentors(data.companyMentors || []);
        setOtherMentors(data.otherMentors || []);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data);
      }
    } catch {
      // 로드 실패 시 사용자에게 안내
      setTranscriptNotice("멘토/세션 정보를 불러오지 못했습니다. 직접 입력해주세요.");
    } finally {
      setLoadingMentors(false);
      setLoadingSessions(false);
    }
  }, []);

  // 기업 변경 시 연쇄 로드
  useEffect(() => {
    if (companyId) {
      loadCompanyData(companyId);
      // 기업 변경 시 세션 선택 초기화
      setSessionId("");
      setTranscriptNotice(null);
    }
  }, [companyId, loadCompanyData]);

  // 초기 로드 (defaultCompanyId가 있는 경우)
  useEffect(() => {
    if (defaultCompanyId) {
      loadCompanyData(defaultCompanyId);
    }
  }, [defaultCompanyId, loadCompanyData]);

  // 기업 변경 핸들러
  function handleCompanyChange(value: string) {
    setCompanyId(value);
    setMentorName("");
    setTopic("");
    setTranscript("");
    setSessionId("");
    setTranscriptNotice(null);
  }

  // 세션 선택 시 → 본문 로드
  async function handleSessionSelect(sessionPageId: string) {
    if (!sessionPageId || sessionPageId === "__none__") {
      setSessionId("");
      setTranscriptNotice(null);
      return;
    }

    setSessionId(sessionPageId);
    setLoadingTranscript(true);
    setTranscriptNotice(null);

    try {
      const res = await fetch(`/api/sessions/${sessionPageId}`);
      if (!res.ok) throw new Error("세션 로드 실패");

      const session: MentoringSession = await res.json();

      // 세션 메타 정보 자동 입력
      if (session.mentorNames?.length) {
        setMentorName(session.mentorNames.join(", "));
      }
      setTopic(session.title);
      if (session.date) {
        setMentoringDate(session.date);
      }

      // 원문 로드 로직
      if (session.transcript && session.transcript.trim().length > 0) {
        setTranscript(session.transcript);
        setTranscriptNotice(null);
      } else if (session.summary && session.summary.trim().length > 0) {
        setTranscript(session.summary);
        setTranscriptNotice(
          "페이지 본문이 없어 요약본으로 대체됩니다"
        );
      } else {
        setTranscript("");
        setTranscriptNotice(
          "원문이 없습니다. 직접 입력해주세요"
        );
      }
    } catch {
      setTranscriptNotice("세션 본문을 불러오는데 실패했습니다");
    } finally {
      setLoadingTranscript(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!companyId) {
      setError("기업을 선택해주세요");
      return;
    }
    if (!transcript.trim()) {
      setError("멘토링 원문을 입력해주세요");
      return;
    }
    if (transcript.trim().length < 50) {
      setError("멘토링 원문이 너무 짧습니다 (최소 50자)");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          transcript: transcript.trim(),
          mentorName: mentorName.trim() || "미지정",
          topic: topic.trim() || "일반 멘토링",
          mentoringDate,
          sessionId: sessionId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "분석 요청에 실패했습니다");
      }

      router.push(`/analyze/${data.analysisId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
      setIsLoading(false);
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
            <Select value={companyId} onValueChange={handleCompanyChange}>
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
            {loadingMentors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                멘토 목록 로딩 중...
              </div>
            ) : companyMentors.length > 0 || otherMentors.length > 0 ? (
              <Select value={mentorName} onValueChange={setMentorName}>
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
                  companyId
                    ? "등록된 멘토가 없습니다. 직접 입력하세요"
                    : "기업을 먼저 선택하세요"
                }
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
              />
            )}
          </div>

          {/* ── 3. 회의록 원문 불러오기 ── */}
          {companyId && (
            <div className="space-y-2">
              <Label>최근 회의록</Label>
              {loadingSessions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  회의록 목록 로딩 중...
                </div>
              ) : sessions.length > 0 ? (
                <Select
                  value={sessionId}
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
              {transcriptNotice && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  {transcriptNotice}
                </div>
              )}

              {loadingTranscript && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
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
                value={mentoringDate}
                onChange={(e) => setMentoringDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">멘토링 주제</Label>
              <Input
                id="topic"
                placeholder="예: B2B SaaS 가격 전략"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>

          {/* ── 원문 입력 ── */}
          <div className="space-y-2">
            <Label htmlFor="transcript">멘토링 원문 *</Label>
            <Textarea
              id="transcript"
              placeholder="멘토링 녹취록 또는 회의록을 붙여넣으세요... 위에서 회의록을 선택하면 자동으로 입력됩니다."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              {transcript.length}자 입력됨 (최소 50자)
            </p>
          </div>

          {/* 컨텍스트 자동 주입 안내 */}
          {companyId && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
              기수 전체 타임라인 + 전문가 요청 이력 자동 반영됨
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 제출 */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || loadingTranscript}
            size="lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
