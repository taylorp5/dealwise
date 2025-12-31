import { BuyerProfile } from './buyer'

export type WizardStep =
  | 'communication_method'
  | 'payment_method'
  | 'experience_level'
  | 'negotiation_stage'
  | 'help_needed'
  | 'car_context'
  | 'results'

export interface WizardAnswers {
  communicationMethod: 'remote' | 'in_person'
  paymentMethod: 'cash' | 'finance' | 'unsure'
  experienceLevel: 'first_time' | 'experienced'
  currentStage: 'just_starting' | 'comparing_offers' | 'sitting_on_offer' | 'ready_to_close'
  helpNeeded: 'negotiate_price' | 'ask_otd' | 'push_back_fees' | 'trade_in_value' | 'financing_questions' | 'general_guidance'
  carContext: string
}

export interface ScriptWizardState {
  currentStep: WizardStep
  profile: Partial<BuyerProfile>
  scriptResult: {
    script: string
    followUps: string[]
    educationalHints: string[]
    keyPoints: string[]
    tips: string[]
    conversationFlow?: {
      userOpening: string
      scenarios: {
        dealerResponse: string
        userOptions: {
          response: string
          whenToUse: string
        }[]
        notes?: string
      }[]
    } | null
  } | null
  loading: boolean
  error: string | null
}


