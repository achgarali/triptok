import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { login } from './services/authService'
import { sanitizeEmail, sanitizeString } from './utils/sanitize'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Sanitize inputs
        const sanitizedEmail = sanitizeEmail(credentials.email)
        if (!sanitizedEmail) {
          return null
        }

        const sanitizedPassword = sanitizeString(credentials.password)
        if (sanitizedPassword.length < 8) {
          return null
        }

        try {
          const user = await login({
            email: sanitizedEmail,
            password: sanitizedPassword
          })

          if (user) {
            return {
              id: user.id,
              email: user.email
            }
          }
          return null
        } catch (error) {
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}

