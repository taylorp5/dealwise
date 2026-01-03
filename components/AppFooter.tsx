import Link from 'next/link'

export default function AppFooter() {
  return (
    <footer className="border-t border-brand-border bg-white mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-brand-muted">
            © {new Date().getFullYear()} DealWise. All rights reserved.
          </p>
          <nav className="flex items-center space-x-6">
            <Link
              href="#"
              className="text-sm text-brand-muted hover:text-brand-ink transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-brand-muted hover:text-brand-ink transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="text-sm text-brand-muted hover:text-brand-ink transition-colors"
            >
              Support
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

