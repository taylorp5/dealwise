'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Toast from '@/components/Toast'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length (min 8 characters)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    console.log('[Settings] Calling updateUser to set password')

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      console.log('[Settings] updateUser response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasError: !!error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorName: error?.name,
      })

      if (error) {
        console.error('[Settings] updateUser ERROR:', {
          method: 'updateUser',
          httpStatus: error.status,
          message: error.message,
          name: error.name,
          fullError: error,
        })
        const errorMessage = error.message || 'Failed to set password. Please try again.'
        setError(errorMessage)
        setToast({ message: errorMessage, type: 'error' })
        setLoading(false)
        return
      }

      console.log('[Settings] updateUser SUCCESS - Password set')
      setSuccess(true)
      setPassword('')
      setConfirmPassword('')
      setToast({ message: 'Password set. You can now sign in with email + password too.', type: 'success' })
      setLoading(false)
    } catch (err: any) {
      console.error('[Settings] updateUser EXCEPTION:', {
        method: 'updateUser',
        message: err.message,
        name: err.name,
        stack: err.stack,
      })
      setError(err.message || 'An error occurred. Please try again.')
      setToast({ message: err.message || 'An error occurred. Please try again.', type: 'error' })
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account settings</p>
          </div>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Password</h2>
              <p className="text-sm text-gray-600 mb-6">
                Set a password to sign in with email and password. If you originally signed up with Google, this will allow you to use email/password sign-in too.
              </p>

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-700">
                    Password set successfully! You can now sign in with email + password.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                  />
                  <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Setting password...' : 'Set Password'}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

