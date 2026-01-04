import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up',
  alternates: {
    canonical: 'https://dealwise.us/signup',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

