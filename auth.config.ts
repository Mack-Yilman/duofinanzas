import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from './lib/repos/users';

export default {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          const user = await getUserByEmail(credentials.email as string);
          if (!user || !user.passwordHash) return null;
          
          const passwordsMatch = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          
          if (passwordsMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              coupleId: user.coupleId,
              avatarColor: user.avatarColor,
              role: user.role,
            };
          }
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.coupleId = (user as any).coupleId;
        token.avatarColor = (user as any).avatarColor;
        token.role = (user as any).role;
      }
      if (trigger === "update" && session) {
        if (session.coupleId !== undefined) {
          token.coupleId = session.coupleId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).coupleId = token.coupleId;
        (session.user as any).avatarColor = token.avatarColor;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
