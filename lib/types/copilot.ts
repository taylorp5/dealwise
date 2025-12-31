// Negotiation Co-Pilot Types

export type PackType = 'first_time' | 'cash' | 'financing' | 'in_person'

export type PaymentMethod = 'cash' | 'finance' | 'lease'
export type Timeline = 'asap' | 'this_week' | 'this_month' | 'flexible'
export type CommunicationMethod = 'email' | 'text' | 'in_person' | 'phone'
export type TonePreference = 'professional' | 'friendly' | 'firm' | 'casual'
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type CurrentStage = 'initial_contact' | 'negotiating' | 'finalizing' | 'closed'
export type MessageRole = 'user' | 'dealer' | 'copilot'
export type MessageType = 'initial' | 'response' | 'follow_up' | 'strategy_update'

export interface TradeInDetails {
  make?: string
  model?: string
  year?: number
  mileage?: number
  condition?: string
  estimatedValue?: number
}

export interface NegotiationSession {
  id: string
  user_id: string
  pack_type: PackType
  
  // Car info
  car_make?: string
  car_model?: string
  car_year?: number
  car_vin?: string
  listing_url?: string
  asking_price?: number
  
  // User preferences
  payment_method: PaymentMethod
  max_otd_budget?: number
  timeline?: Timeline
  has_trade_in: boolean
  trade_in_details?: TradeInDetails
  communication_method: CommunicationMethod
  tone_preference?: TonePreference
  risk_tolerance?: RiskTolerance
  must_have_features?: string[]
  
  // Financing-specific
  max_monthly_payment?: number
  down_payment?: number
  pre_approved?: boolean
  pre_approval_rate?: number
  
  // Generated content
  initial_strategy?: any
  initial_script?: string
  in_person_talk_track?: string
  
  // Session state
  status: SessionStatus
  current_stage?: CurrentStage
  
  created_at: string
  updated_at: string
}

export interface SessionMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  
  // Copilot-specific
  tactic_explanation?: string
  recommended_response?: string
  suggested_counter_range?: {
    min: number
    max: number
    rationale: string
  }
  next_questions?: string[]
  checklist_items?: string[]
  
  message_type?: MessageType
  created_at: string
}

export interface PackConfig {
  id: PackType
  name: string
  description: string
  wizardQuestions: WizardQuestion[]
  tips: string[]
}

export interface WizardQuestion {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'textarea'
  required: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  helpText?: string
  conditional?: {
    field: string
    value: any
  }
}

export interface CreateSessionRequest {
  pack_type: PackType
  car_make?: string
  car_model?: string
  car_year?: number
  car_vin?: string
  listing_url?: string
  asking_price?: number
  payment_method: PaymentMethod
  max_otd_budget?: number
  timeline?: Timeline
  has_trade_in: boolean
  trade_in_details?: TradeInDetails
  communication_method: CommunicationMethod
  tone_preference?: TonePreference
  risk_tolerance?: RiskTolerance
  must_have_features?: string[]
  max_monthly_payment?: number
  down_payment?: number
  pre_approved?: boolean
  pre_approval_rate?: number
}

export interface AddMessageRequest {
  role: 'user' | 'dealer'
  content: string
  message_type?: MessageType
}

export interface CopilotResponse {
  tactic_explanation: string
  recommended_response: string
  suggested_counter_range?: {
    min: number
    max: number
    rationale: string
  }
  next_questions: string[]
  checklist_items: string[]
}


