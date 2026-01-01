'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import Button from './ui/Button'

export default function AppHeader() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const navLinks = [
    { href: '/copilot/free', label: 'Negotiation Draft Builder', icon: null },
    { href: '/research', label: 'Analyzer', icon: null },
    { href: '/calculator', label: 'OTD Builder', icon: null },
    { href: '/packs', label: 'Packs', icon: null },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Nav Group */}
          <div className="flex items-center">
            {/* Logo with increased size and padding */}
            <Link href="/" className="flex items-center group pl-2 pr-10">
              <Image
                src="/brand/dealwise-logo.svg"
                alt="DealWise logo"
                width={190}
                height={48}
                className="h-14 w-auto"
                priority
              />
            </Link>

            {/* Vertical divider with more spacing */}
            <div className="hidden lg:block w-px h-6 bg-brand-border ml-8 mr-8"></div>

            {/* Nav Links - Product Modes */}
            <nav className="hidden lg:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base transition-all duration-200 relative ${
                    isActive(link.href)
                      ? 'text-brand-ink font-semibold'
                      : 'text-brand-muted/90 hover:text-brand-ink font-medium'
                  }`}
                >
                  <span className="relative">
                    {link.label}
                    {isActive(link.href) && (
                      <span className="absolute -bottom-1.5 left-0 right-0 h-1 bg-primary rounded-full"></span>
                    )}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Side - Auth Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-brand-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                    {getInitials(user.email || '')}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-brand-border py-1 z-50 animate-[fadeIn_0.2s_ease-out,slideDown_0.2s_ease-out]">
                    <div className="px-4 py-3 border-b border-brand-border">
                      <p className="text-sm font-medium text-brand-ink truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-brand-muted hover:bg-brand-background transition-colors rounded-md mx-1"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-brand-muted hover:bg-brand-background transition-colors rounded-md mx-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="text-base font-medium text-brand-muted hover:text-brand-ink transition-colors"
                >
                  Sign In
                </Link>
                <Link href="/signup">
                  <Button size="sm" variant="primary" className="px-4 py-1.5 text-sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

