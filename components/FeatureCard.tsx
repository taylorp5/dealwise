import Link from 'next/link'
import { LucideIcon, ArrowRight } from 'lucide-react'
import Card from './ui/Card'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
  badge?: string
  badgeColor?: 'blue' | 'emerald' | 'purple' | 'amber'
  isRecommended?: boolean
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  badge,
  badgeColor = 'blue',
  isRecommended = false,
}: FeatureCardProps) {
  const badgeColors = {
    blue: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-brand-green/15 text-brand-green-dark border-brand-green/30',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }

  // Elevated styling for recommended card
  const isElevated = isRecommended || badgeColor === 'emerald'
  
  return (
    <Link href={href} className="block group h-full">
      <Card className={`h-full p-6 transition-all duration-300 cursor-pointer border ${
        isElevated 
          ? 'bg-brand-background/50 border-accent/30 shadow-lg hover:shadow-2xl hover:shadow-accent/10 hover:border-accent/40 hover:-translate-y-2' 
          : 'shadow-md hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1.5 border-slate-200 hover:border-primary/20'
      }`}>
        <div className="flex items-start justify-between mb-5">
          {/* Icon container with brand blue stroke, subtle background */}
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center group-hover:scale-110 transition-all duration-300 border ${
            isElevated
              ? 'bg-accent/10 border-accent/20 group-hover:bg-accent/15 group-hover:border-accent/30'
              : 'bg-primary/5 border-primary/10 group-hover:bg-primary/10 group-hover:border-primary/20'
          }`}>
            <Icon className={`w-7 h-7 group-hover:scale-110 transition-all duration-300 stroke-[1.5] ${
              isElevated
                ? 'text-accent/80 group-hover:text-accent'
                : 'text-primary/80 group-hover:text-primary'
            }`} />
          </div>
          {badge && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
          <ArrowRight className={`w-5 h-5 group-hover:translate-x-2 transition-all duration-300 ${
            isElevated
              ? 'text-brand-muted/60 group-hover:text-accent'
              : 'text-brand-muted/60 group-hover:text-primary'
          }`} />
        </div>
        <h3 className={`text-lg font-bold mb-2.5 group-hover:transition-colors duration-200 ${
          isElevated
            ? 'text-brand-ink group-hover:text-accent'
            : 'text-brand-ink group-hover:text-primary'
        }`}>
          {title}
        </h3>
        <p className="text-sm text-brand-muted/90 leading-relaxed">{description}</p>
      </Card>
    </Link>
  )
}

