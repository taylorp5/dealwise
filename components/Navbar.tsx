'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Button from './ui/Button'

export default function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600">
              Dealership Copilot
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/research"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                Listing Analyzer
              </Link>
              <Link
                href="/calculator"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                Smart OTD Builder
              </Link>
              <Link
                href="/research"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                Offer Comparison
              </Link>
              <Link
                href="/copilot/free"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                Negotiation Copilot
              </Link>
              <Link
                href="/packs"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                Packs / Library
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.email}
                </span>
                <Button size="sm" variant="secondary" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="secondary">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

