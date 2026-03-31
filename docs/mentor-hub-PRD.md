# PRD: dcamp 멘토 허브 (Slack 멘토 디렉토리)

## 1. 개요 (Background & Goals)

### 서비스 요약
디캠프 슬랙 워크스페이스에서 **멘토 정보를 한눈에 조회**하고, **담당 스타트업 현황을 파악**하며, **멘토 간 교류와 연락을 쉽게 연결**해주는 Slack Bot 기반 내부 도구.

### 프로젝트명
`dcamp-mentor-hub`

### 배경
대표님 요청사항:
> "슬랙 채널에 쉽게 멘토들의 상세 정보 — 어떤 스타트업을 멘토링 하고 있는지를 한눈에 볼 수 있게 표 같은 걸 게시해 주고, 쉽게 상호 연락 연결하게 해 주면 좋을 것 같습니다"

추가 요구:
- 멘토 간 교류 촉진
- 멘토 강점/단점/간단한 이력 파악

### 기존 자산 활용
기존 `dcamp-mentoring-analyzer` 프로젝트의 **Notion 데이터**를 그대로 활용:
- 6개 Notion DB (기업, 멘토, 멘토링 세션, 전문가 요청, KPT, OKR)
- Notion API 래퍼 (`lib/notion.ts` — 1,291줄, 이미 검증됨)
- 멘토-기업 관계 데이터 (relation)

### 타겟 사용자
| 순위 | 사용자 | 핵심 니즈 |
|------|--------|----------|
| 1순위 | **대표님/경영진** | 멘토 전체 현황을 한눈에, 상호 연락 연결 |
| 2순위 | **사업실 PM** | 멘토-기업 매칭 현황, 멘토 전문분야 파악 |
| 3순위 | **멘토** | 다른 멘토 프로필 확인, 교류 시작점 |

### 해결하려는 문제

| 문제 | 현재 상태 | 목표 |
|------|----------|------|
| 멘토 정보 확인 | 노션 DB 직접 접속해서 검색 | 슬랙에서 즉시 조회 |
| 멘토-기업 매칭 파악 | 여러 페이지 오가며 확인 | 한 화면에 표로 정리 |
| 멘토 간 연락 | 개별 연락처 찾아서 연결 | 버튼 한 번으로 DM 시작 |
| 멘토 역량 파악 | PM에게 구두로 물어봄 | 프로필 카드에 핵심 정보 표시 |
| 멘토 간 교류 | 별도 기회 없음 | 유사 분야 멘토 연결, 공동 멘토링 제안 |

---

## 2. 사용자 스토리

### 대표님/경영진
- "이번 기수 멘토 전체 현황을 한눈에 보고 싶다"
- "특정 분야(예: GTM, 기술) 멘토가 누구인지 빠르게 찾고 싶다"
- "멘토 A에게 연락하고 싶은데, 슬랙에서 바로 DM을 보내고 싶다"

### PM (사업실)
- "기업 X에 적합한 멘토를 찾으려면, 분야별로 멘토를 필터링해서 보고 싶다"
- "멘토 A가 현재 어떤 기업들을 담당하고 있는지 확인하고 싶다"
- "새 배치 시작 시, 멘토 목록을 슬랙 채널에 공유하고 싶다"

### 멘토
- "같은 분야의 다른 멘토가 누구인지 알고 싶다"
- "내가 담당하는 기업 외에 다른 기업을 담당하는 멘토와 교류하고 싶다"
- "내 프로필이 정확한지 확인하고 싶다"

---

## 3. 핵심 기능 명세

### P0 — 핵심 (MVP)

| 기능 | 설명 | 구현 방식 |
|------|------|----------|
| **멘토 목록 표시** | 전체 멘토를 표 형태로 슬랙 채널에 게시 | **Slack Table Block** (2025.08 신규, 최대 100행x20열) |
| **멘토 상세 카드** | 이름, 소속, 직책, 전문분야, 담당 기업 한눈에 표시 | Block Kit Rich Text + Button |
| **멘토별 담당 기업 표시** | 각 멘토가 멘토링하는 스타트업 목록 표시 | Notion relation 데이터 활용 |
| **슬래시 커맨드 검색** | `/멘토 [이름]` 또는 `/멘토 [분야]`로 즉시 검색 | Slack Slash Command |
| **DM 연결 버튼** | 멘토 카드에서 "DM 보내기" 버튼 클릭 시 즉시 연결 | Slack `slack://user?id=` 딥링크 |
| **LinkedIn 바로가기** | 멘토 LinkedIn 프로필 링크 버튼 | 외부 URL 버튼 |

### P1 — 중요 (다음 단계)

| 기능 | 설명 |
|------|------|
| **멘토 프로필 AI 요약** | 멘토의 이력(bio)을 Claude로 요약 → "강점", "전문분야 키워드" 자동 생성 |
| **App Home 멘토 디렉토리** | Slack App Home 탭에 상시 멘토 디렉토리 표시 (검색/필터 포함) |
| **분야별 필터링** | 드롭다운으로 전문분야/산업 필터링 |
| **멘토링 활동 요약** | 최근 3개월 멘토링 횟수, 마지막 세션 날짜 표시 |
| **주기적 자동 게시** | 매주 월요일 멘토 현황 자동 게시 (Scheduled Message) |

### P2 — 확장

| 기능 | 설명 |
|------|------|
| **유사 멘토 추천** | "이 분야에 관심있다면 이 멘토도" 추천 |
| **멘토 교류 매칭** | 유사 분야 멘토끼리 소그룹 채널 자동 생성 제안 |
| **멘토 피드백 수집** | 멘토링 후 간단한 피드백을 슬랙 모달로 수집 |
| **멘토 성과 대시보드** | 멘토별 활동량, 담당 기업 성과 요약 |
| **기업 → 멘토 역방향 조회** | `/기업 [기업명]`으로 해당 기업의 담당 멘토 조회 |

---

## 4. 데이터 모델 & 소스

### 4.1 활용할 기존 Notion 데이터

#### Mentor (기존 NOTION_MENTORS_DB_ID)
| 필드 | Notion 속성명 | 타입 | 멘토 허브 활용 |
|------|-------------|------|---------------|
| name | 멘토 이름 | title | 카드 제목 |
| nameEn | 멘토 이름 (영문) | text | 영문명 표시 |
| mentorType | 멘토/코치/그로스코칭 | select | 유형 뱃지 |
| company | 소속 기업 입력 | text | 소속사 표시 |
| position | 직책 | text | 직책 표시 |
| bio | 주요 이력 | text | 이력 요약 / AI 강점 분석 |
| linkedin | 링크드인 주소 | url | LinkedIn 버튼 |
| expertiseAreas | 멘토링 분야 | formula | 전문분야 태그 |
| industries | 전문 산업 분야 | multi_select | 산업 필터 |
| relatedCompanyIds | 관련 기업 | relation | 담당 기업 목록 |

#### Company (기존 NOTION_COMPANIES_DB_ID)
| 필드 | 활용 |
|------|------|
| name | 담당 기업명 표시 |
| investmentStage | 기업 상태 (Seed/Series A 등) |
| batchName | 배치 기수 표시 |
| batchLabel | 배치 유형 (IT/딥테크) |

#### MentoringSession (기존 NOTION_MEETINGS_DB_ID)
| 필드 | 활용 |
|------|------|
| mentorIds + companyIds | 멘토-기업 실제 매칭 이력 |
| date | 마지막 멘토링 날짜 |
| sessionTypes | 활동 유형 통계 |

### 4.2 GAP 분석 (추가 필요 데이터)

| 필요 데이터 | 현재 보유 | 수집 방안 | 우선순위 |
|------------|----------|----------|---------|
| **멘토 Slack User ID** | 미보유 (notionUserId 타입 정의만 있고 매핑 안 됨) | Notion DB에 Slack ID 필드 추가 또는 `users.lookupByEmail` API로 자동 매칭 | P0 (DM 연결에 필수) |
| **멘토 프로필 사진** | 미보유 | Slack API에서 자동 수집 (users.info) | P1 |
| **멘토 이메일** | 미보유 | Notion DB 추가 또는 Slack API | P1 |
| **멘토 강점 키워드** | bio에서 추출 가능 | Claude AI로 bio 분석 → 키워드 자동 생성 | P1 |
| **멘토 간 교류 이력** | 미보유 | 공동 멘토링 세션에서 추출 가능 | P2 |
| **멘토 가용 시간** | 미보유 | Notion DB 추가 | P2 |
| **멘토 평가/피드백** | 미보유 | Slack 모달로 수집 (P2) | P2 |

### 4.3 멘토-기업 관계 데이터 구조

```
멘토 → 기업 연결은 2가지 소스:
1. Notion relation: Mentor.relatedCompanyIds → Company (공식 담당)
2. 세션 기록: MentoringSession.mentorIds + companyIds (실제 활동)

합산하면 "이 멘토가 실제로 어떤 기업과 활동했는지" 완전한 그림을 그릴 수 있음
```

---

## 5. Slack 인터페이스 설계

### 5.1 멘토 카드 (Block Kit)

```
┌─────────────────────────────────────────────┐
│ 👤 김철수 멘토                    [멘토]     │
│ ──────────────────────────────────────────── │
│ 📍 ABC벤처스 | 대표파트너                     │
│ 🎯 전문분야: GTM, 사업전략, 투자유치          │
│ 🏭 산업: SaaS, 핀테크                        │
│ ──────────────────────────────────────────── │
│ 📋 주요 이력                                 │
│ ABC벤처스 대표파트너 (2020~현재)              │
│ 前 카카오 사업개발 디렉터                     │
│ 前 골드만삭스 VP                              │
│ ──────────────────────────────────────────── │
│ 🚀 담당 스타트업                              │
│ • 넥스트그라운드 (Series A, IT 3기)           │
│ • 디플로우 (Seed, 딥테크 4기)                 │
│ • 바이오셀 (Pre-Seed, 딥테크 4기)             │
│ ──────────────────────────────────────────── │
│ 📊 최근 활동: 2026.02.28 (총 12회 멘토링)    │
│                                              │
│ [💬 DM 보내기]  [🔗 LinkedIn]  [📄 상세보기]  │
└─────────────────────────────────────────────┘
```

### 5.2 멘토 목록 표 (요약 버전)

```
┌────────────────────────────────────────────────────────────┐
│ 📋 dcamp 4기 멘토 현황                      2026.03.05     │
│ ─────────────────────────────────────────────────────────── │
│ 멘토          소속           분야        담당기업  최근활동  │
│ ─────────────────────────────────────────────────────────── │
│ 김철수        ABC벤처스      GTM         3개      02.28    │
│ 이영희        XYZ파트너스    기술/제품    2개      03.01    │
│ 박민수        테크스타즈     마케팅       4개      02.25    │
│ 정수진        스타트업얼라이  재무/투자    2개      03.03    │
│ ─────────────────────────────────────────────────────────── │
│ [분야별 필터 ▼]  [전체 목록 보기]  [새로고침]               │
└────────────────────────────────────────────────────────────┘
```

### 5.3 슬래시 커맨드

| 커맨드 | 설명 | 예시 |
|--------|------|------|
| `/멘토` | 전체 멘토 목록 표시 | `/멘토` |
| `/멘토 [이름]` | 특정 멘토 상세 카드 | `/멘토 김철수` |
| `/멘토 분야:[분야]` | 분야별 필터링 | `/멘토 분야:GTM` |
| `/멘토 기업:[기업명]` | 해당 기업의 멘토 조회 | `/멘토 기업:넥스트그라운드` |
| `/멘토-현황` | 전체 멘토-기업 매칭 표 게시 | `/멘토-현황` |

### 5.4 App Home 탭 (P1)

```
┌─────────────────────────────────────────────┐
│ 🏠 dcamp 멘토 허브                          │
│                                              │
│ 🔍 [멘토 검색...]                            │
│                                              │
│ 📂 분야별 보기                               │
│ ├─ 사업전략/GTM (5명)                        │
│ ├─ 기술/제품 (4명)                           │
│ ├─ 재무/투자 (3명)                           │
│ ├─ 마케팅/그로스 (3명)                       │
│ └─ 조직/HR (2명)                             │
│                                              │
│ 📊 이번 주 활동 요약                         │
│ • 총 8건 멘토링 진행                         │
│ • 활발: 김철수(3건), 이영희(2건)              │
│ • 예정: 3건 (03.06~03.10)                    │
└─────────────────────────────────────────────┘
```

---

## 6. 기술 아키텍처

### 6.1 추천 아키텍처: Option A — Bolt.js 독립 Bot + Notion API

```
Slack 워크스페이스
    ↓ (슬래시 커맨드, 버튼, App Home)
Slack Bot (Bolt.js + Socket Mode)
    ├→ 슬래시 커맨드 핸들러     ← /멘토, /멘토-현황
    ├→ 인터랙션 핸들러          ← 버튼, 드롭다운, 모달
    ├→ App Home 렌더링          ← 상시 멘토 디렉토리
    └→ 스케줄러                 ← 주간 자동 게시
    ↓
데이터 레이어 (notion.ts 코드 복사 후 확장)
    ├→ Notion API (멘토, 기업, 세션 데이터)
    ├→ 메모리 캐시 (15분 TTL)
    └→ Slack User ID 매핑 (이메일 기반)
```

### 6.2 아키텍처 선정 이유

| 기준 | **Option A (독립 Bot)** | Option B (기존 앱 확장) | Option C (n8n 자동화) |
|------|------------------------|------------------------|---------------------|
| 인터랙티브 기능 | **완전 지원** | 제한적 (Cold start 이슈) | 매우 제한적 |
| App Home 탭 | **가능** | 별도 이벤트 서버 필요 | 불가 |
| 개발 속도 | 중간 | 빠름 | 빠름 (노코드) |
| 실시간성 | **Socket Mode 실시간** | Webhook 기반 | 트리거 기반 |
| 확장성 | **높음** | 중간 | 낮음 |
| 독립 배포 | **독립적** | 기존 앱에 종속 | 별도 호스팅 |

> **Socket Mode 장점**: 별도 도메인/SSL 없이 빠른 프로토타이핑 가능. 내부 앱이므로 동시 연결 10개 제한 충분.

### 6.3 기술 스택

| 계층 | 기술 | 비고 |
|------|------|------|
| **Slack Bot** | @slack/bolt (Bolt.js) | Socket Mode, 슬래시 커맨드, 인터랙션, App Home |
| **Backend** | Node.js (독립 프로세스) | PM2 또는 Docker로 상시 실행 |
| **데이터** | Notion API (@notionhq/client) | camp-1의 notion.ts 멘토 관련 코드 복사 후 확장 |
| **캐시** | 메모리 캐시 | 15분 TTL, Stale-on-error (기존 패턴 재사용) |
| **AI** | Claude API (@anthropic-ai/sdk) | 멘토 프로필 AI 요약 (P1) |
| **테이블** | Slack Table Block | 2025.08 신규 — 최대 100행x20열 네이티브 표 |
| **배포** | Railway / Render / VPS | 상시 실행 필요 (Vercel 서버리스 부적합) |
| **언어** | TypeScript | 기존 타입 정의 복사 후 확장 |

### 6.4 필요한 Slack Bot 권한 (Scopes)

```
# Bot Token Scopes
chat:write            — 메시지 전송
commands              — 슬래시 커맨드
users:read            — 사용자 정보 (프로필 사진)
users.profile:read    — 사용자 프로필 상세 조회
users:read.email      — 이메일로 Slack ID 매칭
channels:read         — 채널 목록/정보 조회
im:write              — DM 연결
app_mentions:read     — 앱 멘션 이벤트

# Event Subscriptions
app_home_opened       — App Home 탭 렌더링
app_mention           — 봇 멘션 시
```

### 6.5 Slack Table Block 활용 (핵심)

2025년 8월에 도입된 **네이티브 Table Block**으로 멘토 목록을 깔끔한 표로 표현:
- 최대 **100행 x 20열** 지원 (멘토 50명 이하이므로 충분)
- 셀에 **rich_text** 사용 가능 (DM 딥링크, 하이퍼링크 포함)
- `chat.postMessage`의 **attachments** 필드에 전송
- **메시지당 테이블 1개** 제한 → 전체 목록 + 상세 카드 분리 설계
- `chat.update`로 기존 메시지의 테이블 업데이트 가능

---

## 7. 코드 재사용 전략

### 7.1 코드 복사 후 확장 (독립 프로젝트)

> data-architect 분석 결과, camp-1(기업 중심 대시보드)과 mentor-hub(멘토 중심 포털)는 **시작점이 다르므로 독립 프로젝트로 분리**를 추천.
> Notion API 래퍼와 타입은 **코드 복사 후 멘토 허브 전용으로 확장**.

#### 복사할 코드 (camp-1 → mentor-hub)

| 원본 파일 | 복사할 함수/코드 | 용도 |
|----------|----------------|------|
| `lib/notion.ts` | `getMentors()` (line 672-675) | 전체 멘토 목록 |
| `lib/notion.ts` | `getMentorsByCompany()` (line 677-685) | 기업별 담당 멘토 |
| `lib/notion.ts` | `mapMentor()` (line 640-670) | Notion → Mentor 변환 |
| `lib/notion.ts` | `resolveRelationNames()` (line 345-373) | relation ID → 이름 |
| `lib/notion.ts` | `queryAllPages()` (line 449-478) | 페이지네이션 + 재시도 |
| `lib/notion.ts` | Property 헬퍼들 (line 206-327) | getTitle, getText 등 |
| `lib/notion.ts` | `cached()`, `withRetry()` (line 152-196) | 캐시 + 재시도 |
| `types/index.ts` | `Mentor`, `Company`, `MentoringSession` | 타입 정의 |

#### 멘토 허브 전용 신규 함수

```typescript
// 기존 코드에 없는, 멘토 허브에서 새로 구현할 함수들
getMentorById(mentorPageId: string)           // 단일 멘토 상세 조회
getMentorSessions(mentorPageId: string)       // 멘토별 세션 목록
getMentorActivityStats(mentorPageId: string)  // 멘토별 활동 통계
searchMentors(query: string)                  // 멘토 검색 (이름/분야/산업)
getMentorsByExpertise(area: string)           // 분야별 멘토 필터
getMentorsByIndustry(industry: string)        // 산업별 멘토 필터
```

### 7.2 발견 사항: `notionUserId` 미활용 필드

> `Mentor.notionUserId`가 타입에 정의되어 있으나(`types/index.ts:126`) `notion.ts`의 `mapMentor()`에서 실제 매핑이 안 되어 있음.
> **코드 한 줄 추가로 즉시 활용 가능** → Slack User ID 매핑의 보조 소스로 활용.

### 7.3 멘토-기업 관계: 양방향 데이터

```typescript
// 양방향 관계가 존재
경로 A: Company.mentorIds → Mentor       (기업에 배정된 멘토)
경로 B: Mentor.relatedCompanyIds → Company  (멘토가 관련된 기업)
경로 C: MentoringSession.mentorIds + companyIds  (실제 활동 기반)

// 엑셀 데이터의 추가 관계 (텍스트 기반, 이름 매칭 필요)
ExcelEnrichedData.dedicatedMentor  // 전담멘토 이름
ExcelEnrichedData.expertMentor     // 전문가멘토 이름
```

### 7.4 새로 구현할 코드

| 파일 | 내용 |
|------|------|
| `src/app.ts` | Bolt.js 앱 초기화 + Socket Mode 설정 |
| `src/lib/notion.ts` | Notion API 래퍼 (camp-1에서 복사 + 멘토 전용 확장) |
| `src/lib/slack-blocks.ts` | Block Kit 빌더 (멘토 카드, Table Block, App Home) |
| `src/lib/slack-id-mapper.ts` | Notion 멘토 ↔ Slack User ID 매핑 |
| `src/commands/mentor.ts` | `/멘토` 슬래시 커맨드 핸들러 |
| `src/commands/mentor-status.ts` | `/멘토-현황` 커맨드 핸들러 |
| `src/interactions/buttons.ts` | 버튼/드롭다운 인터랙션 핸들러 |
| `src/views/app-home.ts` | App Home 탭 렌더링 (P1) |
| `src/views/mentor-modal.ts` | 멘토 상세 모달 (P1) |
| `src/scheduler/weekly-post.ts` | 주간 자동 게시 (P1) |

---

## 8. 멘토 간 교류 기능 설계

### 8.1 교류 촉진 방안

| 방안 | 설명 | Phase |
|------|------|-------|
| **유사 분야 알림** | "같은 GTM 분야의 김철수 멘토가 최근 활발히 활동 중입니다" | P1 |
| **공동 멘토링 이력** | 같은 기업을 함께 멘토링한 멘토끼리 연결 표시 | P1 |
| **멘토 네트워크 맵** | 분야/산업별 멘토 관계도 시각화 (웹 대시보드 연계) | P2 |
| **소그룹 채널 제안** | 유사 분야 멘토 3~5명으로 소그룹 Slack 채널 생성 제안 | P2 |
| **멘토 인사이트 공유** | 멘토가 자신의 멘토링 인사이트를 공유할 수 있는 전용 채널 | P2 |

### 8.2 멘토 강점/단점 분석 (AI 기반)

```
입력: Mentor.bio (주요 이력 텍스트)
      + MentoringSession 기록 (어떤 주제로 멘토링했는지)
      + AnalysisResult.mentorInsights (멘토 조언 이행 분석)

출력:
  - 핵심 강점 키워드 3~5개
  - 전문 분야 깊이 점수
  - 멘토링 스타일 태그 (전략형/실행형/코칭형 등)
  - 활동 패턴 (활발/보통/비활발)
```

---

## 9. Phase별 로드맵

### Phase 1 — MVP (2주)
> 슬랙에서 멘토 정보를 즉시 조회하고 연락할 수 있는 최소 기능

- [ ] Slack Bot 생성 및 워크스페이스 설치
- [ ] 멘토 Slack User ID 매핑 (수동/이메일 매칭)
- [ ] 슬래시 커맨드 `/멘토` 구현 (전체 목록, 이름 검색)
- [ ] 멘토 카드 Block Kit 구현 (기본정보 + 담당 기업 + DM 버튼)
- [ ] 멘토-기업 매칭 표 게시 기능 (`/멘토-현황`)
- [ ] 기존 Notion API 코드 연동

### Phase 2 — 고도화 (2주)
> 필터링, AI 요약, App Home으로 사용성 강화

- [ ] 분야별/산업별 필터링 (드롭다운)
- [ ] 멘토 프로필 AI 요약 (Claude로 강점/키워드 생성)
- [ ] App Home 탭 구현 (상시 멘토 디렉토리)
- [ ] 멘토링 활동 요약 (최근 활동, 총 횟수) 표시
- [ ] 주간 자동 게시 (Cron Job)

### Phase 3 — 교류 & 확장 (4주)
> 멘토 간 교류 촉진 및 양방향 기능

- [ ] 유사 분야 멘토 추천
- [ ] 공동 멘토링 이력 기반 네트워크 표시
- [ ] 기업 → 멘토 역방향 조회
- [ ] 멘토 피드백 수집 (Slack 모달)
- [ ] 멘토 성과 대시보드 (웹 연계)

---

## 10. 성공 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 멘토 정보 확인 시간 | 5~10분 (노션 접속) | **10초** (슬랙 커맨드) | 사용자 인터뷰 |
| 월간 멘토 조회 횟수 | 측정 불가 | 주 10회 이상 | 슬래시 커맨드 로그 |
| DM 연결 활용 | 0건 | 월 5건 이상 | 버튼 클릭 로그 |
| 멘토 간 교류 | 비공식 | 월 2건 이상 소그룹 활동 | 채널 활동 모니터링 |
| 사용자 만족도 | - | 4.0/5.0 이상 | 분기별 설문 |

---

## 11. 비기능적 요구사항

### 성능
- 슬래시 커맨드 응답: **3초 이내** (Slack 타임아웃 고려)
  - 3초 초과 시 `response_type: "in_channel"` → deferred response 패턴 사용
- Notion 데이터 캐시: 기존 15분 TTL 활용
- 멘토 수가 50명 이하이므로 성능 이슈 없음

### 보안
- Bot Token은 서버사이드에서만 사용
- 내부 워크스페이스 전용 (외부 배포 없음)
- 멘토 개인정보 최소 노출 (LinkedIn, 이메일은 본인 동의 확인)

### 데이터 정합성
- Notion 데이터를 Single Source of Truth로 유지
- 슬랙은 읽기 전용 (데이터 수정은 Notion에서)
- 캐시 무효화: `/멘토 새로고침` 커맨드로 수동 갱신 가능

---

## 12. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Slack Bot 설치 권한 | 워크스페이스 관리자 승인 필요 | 대표님/IT 관리자에게 사전 요청 |
| 멘토 Slack ID 매핑 | DM 연결 불가 | 이메일 기반 자동 매칭 or 수동 입력 |
| Notion API 장애 | 멘토 정보 표시 불가 | 기존 캐시 활용 (Stale-on-error) |
| 멘토 수 증가 (50+) | 메시지 길이 초과 | 페이지네이션 + 필터링으로 대응 |
| Block Kit 제한 (50블록) | 전체 목록 표시 불가 | 요약 표 + "더보기" 버튼으로 분할 |
| 멘토 개인정보 이슈 | 프라이버시 우려 | 표시 항목 최소화, 동의 프로세스 |

---

## 13. 환경변수 (신규)

```bash
# 기존 환경변수 재사용
NOTION_API_KEY=...                    # 기존 것 그대로
NOTION_MENTORS_DB_ID=...              # 기존 것 그대로
NOTION_COMPANIES_DB_ID=...            # 기존 것 그대로
NOTION_MEETINGS_DB_ID=...             # 기존 것 그대로
ANTHROPIC_API_KEY=...                 # 기존 것 그대로 (AI 요약용)

# 신규 추가
SLACK_BOT_TOKEN=xoxb-...             # Slack Bot OAuth Token
SLACK_SIGNING_SECRET=...              # Slack 요청 서명 검증
SLACK_APP_TOKEN=xapp-...              # Socket Mode (개발용, 선택)
MENTOR_CHANNEL_ID=C...                # 멘토 현황 게시할 채널 ID
```

---

## 부록 A: 기존 프로젝트와의 관계

```
dcamp-mentoring-analyzer (camp-1, 기존)
├── 웹 대시보드 (기업 중심 분석, 브리핑)
├── Notion API 연동 (lib/notion.ts)   ←── 코드 복사
├── Claude API 연동 (lib/claude.ts)   ←── 코드 복사
└── 타입 정의 (types/index.ts)        ←── 코드 복사

dcamp-mentor-hub (신규, 독립 프로젝트)
├── Slack Bot (Bolt.js + Socket Mode)
├── Block Kit 렌더링 (Table Block, 멘토 카드)
├── Notion 연동 (camp-1에서 복사 + 멘토 전용 확장)
├── 멘토 Slack ID 매핑
└── App Home 멘토 디렉토리
```

**핵심**: **독립 프로젝트로 분리**. 이유:
1. camp-1은 "기업 중심", mentor-hub는 "멘토 중심" — 시작점이 다름
2. Slack Bot은 상시 실행(Socket Mode) 필요 → Vercel 서버리스와 배포 방식 다름
3. Notion API 코드를 복사 후 멘토 전용 함수로 확장
4. 향후 monorepo 또는 npm 패키지로 공유 레이어 추출 가능

---

## 부록 B: Slack API 제약사항 참고

| 항목 | 제한 |
|------|------|
| 메시지당 블록 | 최대 50개 (모달/Home 탭은 100개) |
| Table Block | 메시지당 1개, 최대 100행 x 20열 |
| mrkdwn 필드 | 최대 12,000자 |
| Section 텍스트 | 최대 3,000자 |
| 슬래시 커맨드 응답 | **3초 이내** (초과 시 deferred response) |
| Rate Limit (chat.postMessage) | Tier 3: 50+/분 |
| 무료 플랜 앱 제한 | **최대 10개** (슬롯 확인 필요) |

---

## 부록 C: 멘토 AI 강점 분석 데이터 소스

| 데이터 | 소스 | 활용 |
|--------|------|------|
| 멘토의 반복 조언 | `CompanyBriefing.mentorInsights.repeatedAdvice` | 핵심 전문 영역 파악 |
| 실행된 조언 | `CompanyBriefing.mentorInsights.executedAdvice` | 멘토링 효과성 |
| 무시된 조언 | `CompanyBriefing.mentorInsights.ignoredAdvice` | 조언 수용도 |
| 갭 분석 | `CompanyBriefing.mentorInsights.gapAnalysis` | 보완 필요 영역 |
| 세션 활동량 | `MentoringSession.durationHours` | 멘토별 총 시간 집계 |

이 데이터를 Claude AI에 입력하면 멘토별 "강점 키워드", "멘토링 스타일 태그", "활동 패턴"을 자동 생성할 수 있음.
