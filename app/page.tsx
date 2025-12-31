'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import FeatureCard from '@/components/FeatureCard'
import AppFooter from '@/components/AppFooter'
import { Wand2, Search, Receipt, Scale, Library, History, ArrowRight, Sparkles, Eye, TrendingUp, Shield, Target, DollarSign, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-brand-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      icon: Wand2,
      title: 'Negotiation Draft Builder',
      description: 'Get your single best next response, tailored to your situation. Generate responses or decode dealer messages.',
      href: '/copilot/free',
      badge: 'Most used',
      badgeColor: 'blue',
      isRecommended: false,
    },
    {
      icon: Search,
      title: 'Listing Analyzer',
      description: 'Analyze car listings for price, market comparison, and red flags.',
      href: '/research',
    },
    {
      icon: Receipt,
      title: 'Smart OTD Builder',
      description: 'Model your out-the-door price using smart defaults and your real inputs.',
      href: '/calculator',
      badge: 'Recommended',
      badgeColor: 'emerald',
      isRecommended: true,
    },
    {
      icon: Scale,
      title: 'Offer Comparison',
      description: 'Compare multiple offers from different dealerships to find the best deal.',
      href: '/research',
    },
    {
      icon: Library,
      title: 'Packs / Library',
      description: 'Unlock specialized negotiation packs with advanced features and guidance.',
      href: '/packs',
    },
    {
      icon: History,
      title: 'Deal History',
      description: 'View your past negotiations and analyses.',
      href: '/history',
    },
  ]

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Hero Section - Full-width with brand blue background */}
      <div className="relative w-full overflow-hidden" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)' }}>
        {/* Optional subtle blue→green gradient overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(34, 197, 94, 0.02) 100%)',
          }}
        />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 premium-grid opacity-20 pointer-events-none" />
        
        {/* Hero Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative z-10">
        <div className={`text-center max-w-3xl mx-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Brand moment chip with blue→green gradient */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-brand-border/60 mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-brand-ink">AI-powered car negotiation assistant</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-brand-ink mb-8 tracking-tight leading-[1.1]">
            Negotiate your car deal with confidence
          </h1>
          <p className="text-xl sm:text-2xl text-brand-muted/90 mb-6 leading-relaxed font-light">
            Get personalized responses, analyze car listings, and model your out-the-door price—all in one place. Before you ever step into a dealership.
          </p>
          <p className="text-sm text-brand-muted/75 mb-12 max-w-2xl mx-auto">
            Know exactly what to say when a dealer asks about monthly payments, adds fees, or pressures you to sign.
          </p>
          
          {/* Stats Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-12">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
              <span className="text-sm font-medium text-brand-muted">Private & secure</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-brand-green"></div>
              <span className="text-sm font-medium text-brand-muted">No spam</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-sm font-medium text-brand-muted">Built for buyers</span>
            </div>
          </div>

          {/* CTAs - Primary filled blue, secondary outline */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-3">
            <Link href="/copilot/free" className="group">
              <Button size="lg" variant="primary" className="w-full sm:w-auto px-10 py-3.5 !bg-brand-blue !text-white hover:!bg-brand-blue-hover shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_0_rgba(37,99,235,0.45)] transition-all duration-200 font-semibold border-0">
                Start Car Negotiation
                <ArrowRight className="w-4 h-4 ml-2 inline group-hover:translate-x-1 transition-transform text-white" />
              </Button>
            </Link>
            <Link href="/research">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-10 py-3.5 border-2 border-brand-border hover:border-primary/30 transition-all duration-200">
                Analyze Car Listing
              </Button>
            </Link>
          </div>
          <p className="text-xs text-brand-muted/70 text-center mb-12">
            Built for car buyers negotiating with dealerships.
          </p>
        </div>
        </div>
      </div>
      {/* Hero bottom boundary - rounded edge */}
      <div className="w-full h-8 bg-white rounded-t-3xl -mt-8 relative z-10"></div>

      {/* How DealWise Helps You Win - Confidence Anchor */}
      <div className="relative py-20 bg-slate-50 rounded-t-3xl -mt-8 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-brand-ink mb-3">How DealWise Helps You Win</h2>
            <p className="text-lg text-brand-muted/90">Three ways we give you the upper hand</p>
          </div>
          
          {/* Container with depth and visual cohesion */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 relative">
            {/* Subtle connecting line behind icons */}
            <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-30"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
              {/* Clarity - Neutral/Slate accent */}
              <div className="text-center relative">
                {/* Faint vertical divider */}
                <div className="hidden md:block absolute top-0 right-0 w-px h-full bg-slate-100"></div>
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Eye className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-brand-ink mb-2">Clarity</h3>
                <p className="text-sm text-brand-muted leading-relaxed">See through dealer tactics and hidden fees before you commit.</p>
              </div>

              {/* Leverage - Matching Clarity styling */}
              <div className="text-center relative">
                {/* Faint vertical dividers */}
                <div className="hidden md:block absolute top-0 left-0 w-px h-full bg-slate-100"></div>
                <div className="hidden md:block absolute top-0 right-0 w-px h-full bg-slate-100"></div>
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <TrendingUp className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-brand-ink mb-2">Leverage</h3>
                <p className="text-sm text-brand-muted leading-relaxed">Know exactly what to say and when to walk away with confidence.</p>
              </div>

              {/* Control - Matching Clarity styling */}
              <div className="text-center relative">
                {/* Faint vertical divider */}
                <div className="hidden md:block absolute top-0 left-0 w-px h-full bg-slate-100"></div>
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Shield className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-brand-ink mb-2">Control</h3>
                <p className="text-sm text-brand-muted leading-relaxed">Stay focused on OTD price, not monthly payments or pressure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - White background */}
      <div className="relative py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className={`mb-16 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
              <div>
                <h2 className="text-3xl font-bold text-brand-ink">All Features</h2>
                <div className="h-0.5 w-16 bg-gradient-to-r from-primary/60 to-accent/60 mt-1 rounded-full"></div>
              </div>
            </div>
            <p className="text-lg text-brand-muted/90 ml-4">Everything you need to negotiate the best deal</p>
          </div>

          <p className="text-sm text-brand-muted/70 mb-8 ml-4">Core tools</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.href}
                className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
              >
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {user && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative">
          <div 
            className={`mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '700ms' }}
          >
            <h2 className="text-2xl font-bold text-brand-ink mb-2">Continue where you left off</h2>
            <p className="text-brand-muted/90">Pick up where you left off or start something new</p>
          </div>
          <div 
            className={`bg-white rounded-xl border border-zinc-200 p-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '800ms' }}
          >
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-brand-ink mb-2">Ready to get started?</h3>
              <p className="text-sm text-brand-muted mb-6 max-w-md mx-auto">
                Your recent negotiations and analyses will appear here. Start by analyzing a listing or using the Negotiation Draft Builder.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/copilot/free">
                  <Button size="md" className="w-full sm:w-auto">
                    Start Negotiation Draft Builder
                  </Button>
                </Link>
                <Link href="/research">
                  <Button size="md" variant="secondary" className="w-full sm:w-auto">
                    Analyze Car Listing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  )
}
