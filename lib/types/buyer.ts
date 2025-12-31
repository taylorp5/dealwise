export type CommunicationMethod = 'remote' | 'in_person'
export type PaymentMethod = 'cash' | 'finance' | 'unsure'
export type BuyerExperience = 'first_time' | 'experienced'
export type NegotiationStage =
  | 'just_starting'
  | 'comparing_offers'
  | 'sitting_on_offer'
  | 'ready_to_close'
export type HelpNeeded =
  | 'negotiate_price'
  | 'ask_otd'
  | 'push_back_fees'
  | 'trade_in_value'
  | 'financing_questions'
  | 'general_guidance'

export interface BuyerProfile {
  communicationMethod: CommunicationMethod
  paymentMethod: PaymentMethod
  experience: BuyerExperience
  stage: NegotiationStage
  helpNeeded: HelpNeeded
  carContext: string
  toneAdjustment?: string
  displayName?: string
  description?: string
}


