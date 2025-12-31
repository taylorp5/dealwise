export type PackId = 'first_time' | 'cash' | 'financing' | 'in_person'

export interface PackFeature {
  title: string
  description?: string
}

export type PackQuestionType = 'text' | 'number' | 'select' | 'boolean' | 'textarea'

export interface PackQuestionOption {
  value: string | number | boolean
  label: string
}

export interface PackQuestion {
  id: string
  label: string
  type: PackQuestionType
  required?: boolean
  options?: PackQuestionOption[]
  placeholder?: string
  helpText?: string
}

// Legacy wizard question compatibility
export interface WizardQuestion extends PackQuestion {
  conditional?: {
    field: string
    value: any
  }
}

export interface PackConfig {
  id: PackId
  name: string
  description: string
  features?: string[]
  education?: string[]
  questions?: PackQuestion[]
  // legacy field used by existing components; kept for backward compatibility
  wizardQuestions?: WizardQuestion[]
  comingSoon?: boolean
}

export interface UserPackStatus {
  packId: PackId
  isUnlocked: boolean
  unlockedAt?: string | null
}

export interface PacksState {
  packs: PackConfig[]
  userPacks: UserPackStatus[]
  selectedPackId: PackId | null
}

