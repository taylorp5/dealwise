'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Toast from '@/components/Toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      }
      // OAuth redirect will happen automatically, no need to handle success here
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)
    setError(null)

    // Validate email
    if (!forgotPasswordEmail.trim()) {
      setError('Please enter your email address')
      setForgotPasswordLoading(false)
      return
    }

    if (!isValidEmail(forgotPasswordEmail)) {
      setError('Please enter a valid email address')
      setForgotPasswordLoading(false)
      return
    }

    console.log('[AUTH] Calling resetPasswordForEmail for:', forgotPasswordEmail)
    console.log('[AUTH] Redirect URL:', `${window.location.origin}/auth/reset`)

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })

      console.log('[AUTH] resetPasswordForEmail response:', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorName: error?.name,
      })

      if (error) {
        console.error('[AUTH] resetPasswordForEmail ERROR:', {
          method: 'resetPasswordForEmail',
          httpStatus: error.status,
          message: error.message,
          name: error.name,
          fullError: error,
        })
        // Always show the exact error message from Supabase
        const errorMessage = error.message || 'Failed to send password reset email. Please try again.'
        setError(errorMessage)
        setToast({ message: errorMessage, type: 'error' })
        setForgotPasswordLoading(false)
        return
      }

      console.log('[AUTH] resetPasswordForEmail SUCCESS - email should be sent')
      setForgotPasswordSuccess(true)
      setToast({ message: 'Password reset email sent! Check your inbox.', type: 'success' })
      setForgotPasswordLoading(false)
    } catch (err: any) {
      console.error('[AUTH] resetPasswordForEmail EXCEPTION:', {
        method: 'resetPasswordForEmail',
        message: err.message,
        name: err.name,
        stack: err.stack,
      })
      setError(err.message || 'An error occurred. Please try again.')
      setForgotPasswordLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate email format
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    console.log('[AUTH] Calling signInWithPassword for:', email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('[AUTH] signInWithPassword response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userEmail: data?.user?.email,
        hasError: !!error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorName: error?.name,
      })

      if (error) {
        console.error('[AUTH] signInWithPassword ERROR:', {
          method: 'signInWithPassword',
          httpStatus: error.status,
          message: error.message,
          name: error.name,
          fullError: error,
        })
        
        // Enhanced error message for invalid credentials
        let errorMessage = error.message || 'Sign in failed. Please try again.'
        
        // Check if it's an invalid credentials error
        if (error.message?.toLowerCase().includes('invalid') || 
            error.message?.toLowerCase().includes('credentials') ||
            error.status === 400) {
          errorMessage = 'Invalid email or password. If you originally signed up with Google, use Google sign-in or set a password in Settings.'
        }
        
        setError(errorMessage)
        setToast({ message: errorMessage, type: 'error' })
        setLoading(false)
        return
      }

      // Success - redirect to home
      if (data.user) {
        console.log('[AUTH] signInWithPassword SUCCESS - user:', data.user.email)
        router.push('/')
        router.refresh()
      } else {
        console.error('[AUTH] signInWithPassword - No user in response')
        setError('Sign in failed. No user data received.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('[AUTH] signInWithPassword EXCEPTION:', {
        method: 'signInWithPassword',
        message: err.message,
        name: err.name,
        stack: err.stack,
      })
      setError(err.message || 'An error occurred. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-600">Sign in to your DealWise account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            {showForgotPassword && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                {forgotPasswordSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      Check your email for a password reset link. If you don't see it, check your spam folder.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false)
                        setForgotPasswordSuccess(false)
                        setForgotPasswordEmail('')
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-gray-900">Reset Password</h3>
                    <p className="text-sm text-gray-600">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> Password reset emails may not arrive yet. If you originally signed up with Google, use Google sign-in or set a password in Settings.
                      </p>
                    </div>
                    <form onSubmit={handleForgotPassword} className="space-y-3">
                      <input
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={forgotPasswordLoading}
                          className="flex-1"
                        >
                          {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(false)
                            setForgotPasswordEmail('')
                            setError(null)
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">Continue with Google</span>
            </button>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
    </>
  )
}

