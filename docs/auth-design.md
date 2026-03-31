# 인증/인가 설계: 디캠프 Google OAuth

> **상태**: 설계 완료 / 구현 예정
> **우선순위**: 마지막 단계에서 구현
> **작성일**: 2026-03-31

---

## 1. 현재 상태

- `SITE_PASSWORD` 기반 사이트 전체 비밀번호 보호 (HMAC-SHA256 토큰)
- 로그인한 사용자는 **모든 기업 데이터** 열람 가능 (권한 구분 없음)
- 외부 멘토도 같은 비밀번호로 접근 → 다른 기업 정보도 볼 수 있는 문제

## 2. 목표

- **디캠프 임직원**: Google Workspace 계정(`@dframegroup.com`)으로 로그인
- **역할별 접근 권한**: PM은 담당 기업만, 관리자는 전체
- **외부 멘토**: 별도 초대 링크 또는 제한적 접근

## 3. 인증 방식: Google OAuth 2.0

### 왜 Google OAuth?
- 디캠프 임직원은 Google Workspace(`@dframegroup.com`) 사용 중
- 별도 회원가입/비밀번호 관리 불필요
- Google이 2FA/보안 관리 → 우리 쪽 부담 최소화

### 기술 구현

```
[ 사용자 ] → [ Google 로그인 ] → [ Google OAuth ]
                                      ↓
                              [ Callback API ]
                                      ↓
                            [ 이메일 도메인 확인 ]
                            @dframegroup.com? ✓
                                      ↓
                              [ JWT 세션 발급 ]
                              [ 쿠키에 저장 ]
```

### 패키지
```bash
npm install next-auth@5 @auth/core
```

### NextAuth.js v5 설정 (예시)

```typescript
// src/lib/auth-config.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 디캠프 도메인만 허용
      authorization: {
        params: {
          hd: "dframegroup.com", // Google Workspace 도메인 제한
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // 이메일 도메인 이중 검증 (hd 파라미터 우회 방지)
      if (profile?.email?.endsWith("@dframegroup.com")) {
        return true;
      }
      // 외부 멘토: 허용 목록 확인 (Notion DB 기반)
      // const allowedEmails = await getAllowedMentorEmails();
      // if (allowedEmails.includes(profile?.email)) return true;
      return false;
    },
    async session({ session, token }) {
      // 세션에 역할 정보 추가
      session.user.role = token.role as string;
      session.user.companyIds = token.companyIds as string[];
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        // 역할 결정 로직
        token.role = await determineRole(profile.email);
        token.companyIds = await getAssignedCompanyIds(profile.email);
      }
      return token;
    },
  },
});
```

## 4. 인가 (역할별 접근 권한)

### 역할 정의

| 역할 | 대상 | 접근 범위 |
|------|------|----------|
| `admin` | 사업실장, 대표 | 모든 기업 + 관리 기능 |
| `pm` | 사업실 PM | 담당 기업만 (Notion "담당 PM" 기반) |
| `mentor` | 외부 멘토 | 배정된 기업만 (Notion "담당 멘토" 기반) |
| `viewer` | 기타 임직원 | 읽기 전용, 전체 열람 |

### PM ↔ 기업 매핑

Notion 기업 DB의 **PM(정)/PM(부)** 필드 또는 엑셀 마스터 시트의 `pmPrimary`/`pmSecondary` 활용:

```typescript
async function getAssignedCompanyIds(email: string): Promise<string[]> {
  // 1. Notion 기업 DB에서 PM 이메일로 필터링
  // 2. 엑셀 데이터의 pmPrimary/pmSecondary 매칭
  // 3. 멘토인 경우 Notion 멘토 DB → 관련 기업 조회
  return companyIds;
}
```

### API 미들웨어 적용

```typescript
// src/middleware.ts (개선 후)
export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    // 미인증 → 로그인 리다이렉트
    return NextResponse.redirect(new URL("/api/auth/signin", request.url));
  }

  // API 요청: 권한 검증
  if (pathname.startsWith("/api/company-detail/")) {
    const companyId = pathname.split("/").pop();
    if (session.user.role !== "admin" && session.user.role !== "viewer") {
      if (!session.user.companyIds?.includes(companyId)) {
        return NextResponse.json({ error: "접근 권한 없음" }, { status: 403 });
      }
    }
  }
}
```

## 5. 마이그레이션 계획

### Phase A: Google OAuth 추가 (기존 비밀번호와 병행)
1. NextAuth.js v5 설치 + Google OAuth 설정
2. `/login` 페이지에 "디캠프 계정으로 로그인" 버튼 추가
3. 기존 SITE_PASSWORD 로그인도 유지 (점진적 전환)
4. Google 로그인 사용자에게 모든 기업 접근 허용 (기존과 동일)

### Phase B: 역할 기반 접근 제어 추가
1. Notion PM 매핑 로직 구현
2. API 미들웨어에 companyId 검증 추가
3. UI에서 접근 불가 기업 숨김 처리

### Phase C: 기존 비밀번호 방식 제거
1. SITE_PASSWORD 로그인 비활성화
2. 외부 멘토 초대 시스템 구현 (이메일 허용 목록)

## 6. 필요한 환경변수

```env
# Google OAuth (Google Cloud Console에서 발급)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# NextAuth
NEXTAUTH_URL=https://dcamp-mentoring-analyzer.vercel.app
NEXTAUTH_SECRET=xxx  # openssl rand -base64 32
```

## 7. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services > OAuth consent screen** 설정
   - User type: Internal (디캠프 Workspace만)
   - App name: "dcamp AI Mentoring Analyzer"
4. **APIs & Services > Credentials** > Create OAuth 2.0 Client ID
   - Authorized redirect URIs: `https://dcamp-mentoring-analyzer.vercel.app/api/auth/callback/google`
5. Client ID / Secret을 Vercel 환경변수에 등록

## 8. UI 변경사항

### 로그인 페이지 (`/login`)

```
┌─────────────────────────────────────┐
│                                     │
│     🏢 AI Mentoring Analyzer        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  🔵 디캠프 계정으로 로그인      │  │
│  │     @dframegroup.com          │  │
│  └───────────────────────────────┘  │
│                                     │
│         ── 또는 ──                   │
│                                     │
│  비밀번호: [____________]           │
│  [로그인]                            │
│                                     │
│  디캠프 임직원은 Google 계정으로      │
│  바로 로그인할 수 있습니다.          │
│                                     │
└─────────────────────────────────────┘
```

### 헤더 (로그인 후)

```
[dcamp 로고] AI Mentoring Analyzer     [김순모 PM ▾] [로그아웃]
```
