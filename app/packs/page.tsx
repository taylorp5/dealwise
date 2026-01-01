'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { packs as packConfigs } from '@/lib/packs/config'
import type { PackConfig } from '@/lib/types/packs'
import { getCopilotRouteForPack } from '@/lib/utils/copilot-routes'
import { 
  GraduationCap, 
  DollarSign, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Sparkles,
  ArrowRight,
  Shield
} from 'lucide-react'

interface PackStatus {
  packId: string
  isUnlocked: boolean
  unlockedAt?: string | null
}

interface PacksResponse {
  success: boolean
  packs: any[]
  userPacks: PackStatus[]
  selectedPackId: string | null
}

export default function PacksPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userPacks, setUserPacks] = useState<PackStatus[]>([])
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)

  useEffect(() => {
    fetchPacks()
    
    // Handle checkout success/cancel from URL params
    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')
    if (checkoutStatus === 'success') {
      // Refresh packs to show newly unlocked pack
      fetchPacks(false)
      // Clean up URL
      window.history.replaceState({}, '', '/packs')
    } else if (checkoutStatus === 'cancel') {
      // Clean up URL
      window.history.replaceState({}, '', '/packs')
    }
  }, [])

  const fetchPacks = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/packs', { headers })
      const data: PacksResponse = await res.json()
      if (!data.success) {
        // Silently handle errors - don't show raw error messages
        console.error('Failed to load packs:', (data as any).error)
        return
      }
      setUserPacks(data.userPacks || [])
      setSelectedPackId(data.selectedPackId || null)
      
      // Note: We no longer use selected_pack_id in localStorage for analyzer variants
      // Analyzer variants are determined by route, not localStorage
      
      // Sync database unlocks to localStorage
      const { addPack } = await import('@/lib/packs/entitlements')
      const unlockedPacks = (data.userPacks || []).filter((p) => p.isUnlocked).map((p) => p.packId)
      unlockedPacks.forEach((packId) => {
        addPack(packId)
      })
    } catch (err: any) {
      // Silently handle errors - don't show raw error messages
      console.error('Error loading packs:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const isUnlocked = (packId: string) =>
    userPacks.some((p) => p.packId === packId && p.isUnlocked)

  const [error, setError] = useState<string | null>(null)
  
  const handleSelect = async (packId: string) => {
    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/packs/select', {
        method: 'POST',
        headers,
        body: JSON.stringify({ packId }),
      })
      const data = await res.json()
      if (!data.success) {
        console.error('Failed to select pack:', data.error)
        return
      }
      setSelectedPackId(packId)
      
      // Note: We no longer set selected_pack_id in localStorage for analyzer variants
      // Analyzer variants are determined by route, not localStorage
      // This selectedPackId is only for copilot routes, not analyzer
      
      // Trigger refresh events for other components
      window.dispatchEvent(new Event('packEntitlementsChanged'))
      window.dispatchEvent(new Event('packSelectionChanged'))
    } catch (err: any) {
      console.error('Error selecting pack:', err)
    }
  }

  const handleUnlock = async (packId: string) => {
    // Check if user is authenticated first
    if (!user) {
      const shouldSignIn = confirm('You need to sign in or sign up to unlock packs and access enhanced features.\n\nWould you like to sign in now?')
      if (shouldSignIn) {
        router.push('/login')
      }
      return
    }

    try {
      // Map packId to product_key for Stripe
      const productKeyMap: Record<string, 'first_time' | 'in_person' | 'bundle_both'> = {
        first_time: 'first_time',
        in_person: 'in_person',
        // Add bundle_both if needed
      }

      const productKey = productKeyMap[packId]
      if (!productKey) {
        alert('This pack is not available for purchase yet.')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      
      // Create Stripe Checkout session
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ product_key: productKey }),
      })
      
      const data = await res.json()
      if (!data.success) {
        console.error('Failed to create checkout session:', data.error)
        
        // Check if it's an authentication error
        if (res.status === 401 || (data as any).error === 'Unauthorized' || (data as any).error === 'Invalid token') {
          alert('You need to sign in or sign up to unlock packs and access enhanced features.\n\nPlease sign in and try again.')
          router.push('/login')
          return
        }
        
        alert(`Unable to start checkout. Please try again.`)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Checkout URL not received. Please try again.')
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err)
      alert('An error occurred while starting checkout. Please try again.')
    }
  }

  const getPackIcon = (packId: string) => {
    const icons: Record<string, any> = {
      first_time: GraduationCap,
      cash: DollarSign,
      financing: CreditCard,
      in_person: Users,
    }
    return icons[packId] || Sparkles
  }

  const getPackOutcome = (pack: PackConfig): string => {
    const outcomes: Record<string, string> = {
      first_time: 'Gain confidence and clarity for your first car purchase',
      cash: 'Maximize leverage from your cash position',
      financing: 'Protect your credit while securing better terms',
      in_person: 'Stay in control during in-person negotiations',
    }
    return outcomes[pack.id] || ''
  }

  const getPackValueProp = (pack: PackConfig): string => {
    const valueProps: Record<string, string> = {
      first_time: 'Navigate your first car purchase with confidence and avoid costly mistakes.',
      cash: 'Leverage your cash position to secure the lowest possible price.',
      financing: 'Master financing negotiations and protect your credit score.',
      in_person: 'Handle in-person pressure tactics and close deals on your terms.',
    }
    return valueProps[pack.id] || pack.description
  }

  const getPackBenefits = (pack: PackConfig): string[] => {
    const benefits: Record<string, string[]> = {
      first_time: [
        'Guided decision questions for financing & affordability',
        'Educational explanations of APR, terms, and fees',
        'Personalized checklist to avoid common mistakes',
        'Real-time advisor for "what am I missing?" questions',
      ],
      cash: [
        'Strategic timing for cash disclosure',
        'Proof-of-funds handling guidance',
        'OTD-focused negotiation scripts',
        'Avoid monthly payment anchoring traps',
      ],
      financing: [
        'APR & term negotiation strategies',
        'Pre-approval leverage tactics',
        'Payment anchoring avoidance',
        'Credit protection guidance',
      ],
      in_person: [
        'Short, spoken-language talk tracks',
        'Manager & pressure tactic decoder',
        'If they say X → say Y response guide',
        'OTD closing scripts & walk-away signals',
      ],
    }
    return benefits[pack.id] || pack.features || []
  }

  const renderPackCard = (pack: PackConfig) => {
    const unlocked = isUnlocked(pack.id)
    const selected = selectedPackId === pack.id
    const isComingSoon = pack.comingSoon === true
    const isRecommended = pack.id === 'first_time'
    const Icon = getPackIcon(pack.id)
    const valueProp = getPackValueProp(pack)
    const benefits = getPackBenefits(pack)
    
    return (
      <Card 
        key={pack.id} 
        className={`relative p-8 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
          isComingSoon ? 'opacity-60' : ''
        } ${
          isRecommended ? 'border-2 border-accent/30 shadow-lg bg-accent/5' : ''
        } ${
          unlocked && !isComingSoon ? 'bg-accent/5 border-accent/20' : ''
        }`}
      >
        {/* Recommended Badge */}
        {isRecommended && (
          <div className="absolute -top-3 left-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground shadow-md">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Recommended starting point
            </span>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isRecommended 
                  ? 'bg-accent/10' 
                  : 'bg-brand-background'
              }`}>
                <Icon className={`w-6 h-6 ${
                  isRecommended ? 'text-accent-hover' : 'text-brand-muted'
                }`} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-brand-ink mb-1">{pack.name}</h3>
                <div className="flex items-center space-x-2">
                  {isComingSoon ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Coming Soon
                    </span>
                  ) : unlocked ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent-hover border border-accent/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      You have access
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-background text-brand-muted border border-brand-border">
                      <Lock className="w-3 h-3 mr-1" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Outcome Summary */}
          {!isComingSoon && (
            <div className="mb-4">
              <p className="text-sm font-medium text-brand-ink mb-2">
                {getPackOutcome(pack)}
              </p>
            </div>
          )}

          {/* Value Proposition */}
          <p className={`text-sm leading-relaxed mb-6 ${
            isComingSoon ? 'text-brand-muted/70' : 'text-brand-muted'
          }`}>
            {valueProp}
          </p>

          {/* Benefits */}
          <div className="space-y-2.5">
            {benefits.slice(0, 4).map((benefit, i) => (
              <div key={i} className="flex items-start space-x-3">
                <span className={`flex-shrink-0 text-base mt-0.5 ${
                  isRecommended ? 'text-accent' : 'text-brand-muted'
                }`}>
                  •
                </span>
                <p className="text-sm text-brand-ink leading-relaxed flex-1">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-auto pt-6 border-t border-brand-border">
          {isComingSoon ? (
            <div className="text-center py-4 opacity-75">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <Clock className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-brand-muted mb-1">Launching Soon</p>
              <p className="text-xs text-brand-muted/70 mb-4">
                This buying strategy is in development. We're building something special.
              </p>
              <Button variant="secondary" className="w-full opacity-50" disabled>
                Notify Me When Available
              </Button>
            </div>
          ) : unlocked ? (
            <>
              <Button
                className="w-full mb-3"
                variant={selected ? 'secondary' : 'primary'}
                onClick={() => handleSelect(pack.id)}
              >
                {selected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Currently Active
                  </>
                ) : (
                  <>
                    Activate This Pack
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              {/* Show links immediately after unlock, not just when selected */}
              <div className="bg-brand-background border border-brand-border rounded-lg p-4">
                <div className="flex items-start space-x-2 mb-3">
                    <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-brand-ink mb-1">
                      {selected ? 'Pack Active' : 'Pack Unlocked'}
                    </p>
                    <p className="text-xs text-brand-muted mb-2">
                      Access enhanced features through these links:
                    </p>
                    <p className="text-xs text-brand-muted/80 italic mb-3">
                      These links take you to the enhanced versions with pack-specific features.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link 
                    href={pack.id === 'first_time' ? '/analyzer/first-time' : 
                          pack.id === 'in_person' ? '/analyzer/in-person' : 
                          '/analyzer/free'}
                    className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-md border border-brand-border hover:border-primary hover:bg-brand-background transition-colors group"
                  >
                    <span className="text-sm font-medium text-brand-ink">Listing Analyzer</span>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </Link>
                  {pack.id !== 'in_person' && (
                    <Link 
                      href="/calculator" 
                      className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-md border border-brand-border hover:border-primary hover:bg-brand-background transition-colors group"
                    >
                      <span className="text-sm font-medium text-brand-ink">Smart OTD Builder</span>
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                  <Link 
                    href={getCopilotRouteForPack(pack.id)} 
                    className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-md border border-brand-border hover:border-primary hover:bg-brand-background transition-colors group"
                  >
                    <span className="text-sm font-medium text-brand-ink">
                      {pack.id === 'first_time' ? 'First-Time Buyer Negotiation Draft Builder' : 
                       pack.id === 'in_person' ? 'In-Person Negotiation Draft Builder' : 
                       'Negotiation Draft Builder'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div>
              <Button 
                className="w-full mb-2" 
                onClick={() => handleUnlock(pack.id)}
              >
                Unlock This Pack
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-center text-brand-muted/80">
                One-time unlock • Lifetime access
              </p>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Sort packs to put recommended first
  const sortedPacks = Object.values(packConfigs).sort((a, b) => {
    if (a.id === 'first_time') return -1
    if (b.id === 'first_time') return 1
    return 0
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-brand-border mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-brand-ink">Buying Strategies</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-brand-ink mb-4 tracking-tight">
            Choose Your Negotiation Strategy
          </h1>
          <p className="text-base text-brand-muted/90 mb-3 leading-relaxed">
            Most buyers start with the First-Time Buyer Pack and expand as needed.
          </p>
          <p className="text-lg text-brand-muted mb-2 leading-relaxed">
            Each pack unlocks specialized guidance, scripts, and tools tailored to your buying situation.
          </p>
          <p className="text-sm text-brand-muted/80">
            One-time unlock • Lifetime access • No subscription
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            <p className="text-brand-muted">Loading buying strategies...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sortedPacks.map(renderPackCard)}
          </div>
        )}
      </div>
    </div>
  )
}

