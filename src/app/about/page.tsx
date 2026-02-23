import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — AI Mentoring Analyzer",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* 히어로 */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          AI Mentoring Analyzer
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          기업명을 검색하면 &ldquo;이 팀이 뭐하는 곳이고 지금 어떤 상황인지&rdquo;
          3분 안에 파악할 수 있는 dcamp 내부용 도구입니다.
        </p>
      </section>

      {/* 왜 만들었나 */}
      <Section title="왜 만들었나요?">
        <p>
          dcamp 포트폴리오 기업의 정보는 노션, 구글 드라이브, 내부 DB 등 여러 곳에 흩어져 있습니다.
          멘토 미팅이나 경영진 보고 전에 기업 현황을 파악하려면 여러 시스템을 뒤져야 했습니다.
        </p>
        <p className="mt-2">
          이 도구는 흩어진 정보를 한 페이지에 모으고, AI가 멘토링 회의록·KPT 회고·OKR 데이터를
          종합 분석하여 <strong>전략적 인사이트</strong>를 즉시 제공합니다.
        </p>
      </Section>

      {/* 주요 기능 */}
      <Section title="주요 기능">
        <FeatureGrid />
      </Section>

      {/* 작동 원리 */}
      <Section title="어떻게 작동하나요?">
        <ol className="space-y-4 text-sm text-foreground">
          <Step n={1} title="데이터 수집">
            노션 API를 통해 기업 기본 정보, 멘토링 세션, KPT 회고, OKR, 전문가 요청 등을 실시간으로 가져옵니다.
          </Step>
          <Step n={2} title="AI 분석">
            수집된 데이터를 Claude AI(Anthropic)에 전달합니다. MBB 시니어 컨설턴트 수준의 프롬프트로
            Executive Summary, 반복 패턴, 말하지 않은 신호, PM 액션 아이템 등을 도출합니다.
          </Step>
          <Step n={3} title="브리핑 생성">
            분석 결과가 구조화된 브리핑으로 정리됩니다. 이전에 생성된 브리핑은 캐시되어
            빠르게 조회할 수 있고, 데이터가 변경되면 자동으로 갱신이 필요하다고 표시됩니다.
          </Step>
        </ol>
      </Section>

      {/* 잘 쓰려면 */}
      <Section title="잘 활용하려면">
        <div className="space-y-3 text-sm text-foreground">
          <Tip emoji="1." title="노션 데이터를 잘 채워주세요">
            AI 분석의 품질은 입력 데이터에 비례합니다.
            멘토링 회의록의 <strong>요약</strong>과 <strong>후속조치</strong> 필드,
            KPT 회고의 Keep/Problem/Try가 잘 채워져 있을수록 인사이트가 정확해집니다.
          </Tip>
          <Tip emoji="2." title="브리핑은 미팅 전에 생성하세요">
            기업 미팅 30분 전에 브리핑을 생성하면, 최신 데이터 기반의 핵심 질문과
            미팅 전략을 준비할 수 있습니다.
          </Tip>
          <Tip emoji="3." title="&lsquo;다시 생성&rsquo; 버튼을 활용하세요">
            새로운 멘토링이 기록된 후에는 &lsquo;다시 생성&rsquo;을 눌러 최신 데이터 반영 브리핑을 받으세요.
            24시간이 지나면 자동으로 갱신 권장 표시가 뜹니다.
          </Tip>
          <Tip emoji="4." title="PM 액션 아이템을 확인하세요">
            브리핑 하단의 PM 액션 아이템은 우선순위와 마감일이 포함되어 있어
            바로 업무에 반영할 수 있습니다.
          </Tip>
        </div>
      </Section>

      {/* 데이터 소스 */}
      <Section title="데이터 소스">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">데이터</th>
                <th className="pb-2 pr-4 font-medium">출처</th>
                <th className="pb-2 font-medium">갱신 주기</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <DataRow data="기업 기본 정보" source="노션 DB" cycle="실시간" />
              <DataRow data="멘토링 회의록" source="노션 DB" cycle="세션 기록 시" />
              <DataRow data="KPT 회고" source="노션 DB" cycle="회고 작성 시" />
              <DataRow data="OKR / KPI" source="노션 DB" cycle="월간" />
              <DataRow data="전문가 요청" source="노션 DB" cycle="요청 등록 시" />
              <DataRow data="배치 대시보드" source="노션 DB" cycle="격주" />
            </tbody>
          </table>
        </div>
      </Section>

      {/* 로드맵 */}
      <Section title="앞으로의 계획">
        <div className="space-y-3">
          <Phase
            label="현재"
            title="Phase 3 — AI 고도화"
            desc="자연어 챗 인터페이스, 멘토링 녹취 기반 인사이트, 유사 기업 추천"
            active
          />
          <Phase
            label="다음"
            title="Phase 4 — 외부 데이터 통합"
            desc="슬랙·지메일·구글 드라이브 연동으로 커뮤니케이션 맥락까지 반영, 점점 더 똑똑해지는 분석"
          />
        </div>
      </Section>

      {/* 푸터 */}
      <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        dcamp 내부 도구 · 문의: 사업실 BizOps
      </footer>
    </div>
  );
}

// ── 서브 컴포넌트 ──────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-foreground">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    { icon: "🔍", title: "기업 검색", desc: "배치 기업을 이름으로 빠르게 검색" },
    { icon: "📊", title: "AI 브리핑", desc: "멘토링·KPT·OKR 기반 심층 분석 리포트" },
    { icon: "🎯", title: "Executive Summary", desc: "핵심 이슈와 모멘텀을 한눈에 파악" },
    { icon: "🔄", title: "반복 패턴 감지", desc: "해결 안 된 채 이월되는 이슈 추적" },
    { icon: "💡", title: "말하지 않은 신호", desc: "데이터 행간에서 숨겨진 리스크 포착" },
    { icon: "✅", title: "PM 액션 아이템", desc: "우선순위별 구체적 후속 조치 제안" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {features.map((f) => (
        <div key={f.title} className="rounded-xl border border-border bg-card p-4 toss-shadow">
          <div className="mb-1 text-lg">{f.icon}</div>
          <div className="text-sm font-semibold text-foreground">{f.title}</div>
          <div className="text-xs text-muted-foreground">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <span className="font-semibold text-foreground">{title}</span>
        <p className="mt-0.5 text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function Tip({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <span className="shrink-0 text-sm font-bold text-primary">{emoji}</span>
      <div>
        <div className="font-semibold text-foreground">{title}</div>
        <p className="mt-0.5 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function DataRow({ data, source, cycle }: { data: string; source: string; cycle: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4">{data}</td>
      <td className="py-2 pr-4 text-muted-foreground">{source}</td>
      <td className="py-2 text-muted-foreground">{cycle}</td>
    </tr>
  );
}

function Phase({ label, title, desc, active }: { label: string; title: string; desc: string; active?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? "border-primary bg-secondary" : "border-border bg-card"}`}>
      <span className={`text-xs font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
      <div className="mt-1 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
