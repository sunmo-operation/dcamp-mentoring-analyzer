import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          hd: "dcamp.kr", // 구글 로그인 화면에서 dcamp.kr 계정만 표시
          prompt: "select_account",
        },
      },
    }),
  ],

  callbacks: {
    // 이메일 도메인 이중 검증 — hd 파라미터 우회 방지
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email?.endsWith("@dcamp.kr") ?? false;
      }
      return false;
    },

    // JWT에 이메일/이름/이미지 포함
    jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    // 세션에 사용자 정보 전달
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },
});
