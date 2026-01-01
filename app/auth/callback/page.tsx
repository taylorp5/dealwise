'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Completing sign in...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait a bit for Supabase to process the URL hash
        // The client is configured with detectSessionInUrl: true
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get session - Supabase should have extracted it from the URL hash by now
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[Auth Callback] Error getting session:', {
            message: error.message,
            name: error.name,
          })
          setStatus('error')
          setMessage(error.message || 'Failed to complete sign in. Please try again.')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        if (data.session && data.session.user) {
          console.log('[Auth Callback] Success, user:', data.session.user.email)
          setStatus('success')
          setMessage('Sign in successful! Redirecting...')
          // Give AuthContext time to update, then redirect
          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 1500)
        } else {
          // Retry a few times - OAuth callback might take a moment to process
          let retries = 3
          const retryInterval = setInterval(async () => {
            const { data: retryData, error: retryError } = await supabase.auth.getSession()
            
            if (retryData.session && retryData.session.user) {
              console.log('[Auth Callback] Success on retry, user:', retryData.session.user.email)
              clearInterval(retryInterval)
              setStatus('success')
              setMessage('Sign in successful! Redirecting...')
              setTimeout(() => {
                router.push('/')
                router.refresh()
              }, 1500)
            } else {
              retries--
              if (retries <= 0) {
                clearInterval(retryInterval)
                console.error('[Auth Callback] No session found after retries')
                setStatus('error')
                setMessage('No session found. Please try signing in again.')
                setTimeout(() => {
                  router.push('/login')
                }, 3000)
              }
            }
          }, 500)
        }
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', {
          message: err.message,
          name: err.name,
        })
        setStatus('error')
        setMessage(err.message || 'An error occurred. Please try again.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center py-8">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700">{message}</p>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p className="text-gray-700">{message}</p>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <p className="text-red-700 mb-4">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to sign in page...</p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

