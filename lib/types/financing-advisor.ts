/**
 * Financing Advisor Answer Types
 * Used for interactive clarifying questions in First-Time Buyer Advisor
 */

export type CreditScoreRange = '<620' | '620-679' | '680-739' | '740+' | 'not_sure'
export type PreApprovalStatus = 'yes' | 'no' | 'not_sure'
export type FinancingGoal = 'lowest_monthly' | 'lowest_total' | 'pay_off_fast' | 'build_credit' | 'not_sure'
export type DebtRange = '0-100' | '100-300' | '300-700' | '700+' | 'not_sure'
export type EmergencyFundRange = '<1k' | '1k-3k' | '3k-5k' | '5k+' | 'not_sure'
export type Timeline = 'this_week' | '2-4_weeks' | '1-3_months' | 'researching'
export type DealerIncentives = 'yes' | 'no' | 'not_sure'
export type LoanTerm = 36 | 48 | 60 | 72 | 84

export interface FinancingAdvisorAnswers {
  creditScoreRange: CreditScoreRange
  preApproval: PreApprovalStatus
  apr?: number
  termMonths?: LoanTerm
  goal: FinancingGoal
  debtRange?: DebtRange
  emergencyFund?: EmergencyFundRange
  timeline?: Timeline
  dealerIncentives?: DealerIncentives
}

export interface FinancingRecommendation {
  recommendation: string
  bestPath: string[]
  whatToConfirm: string[]
  redFlags?: string[]
  upsell?: string
  bottomLine?: string
  whatWouldChange?: string[]
  scenarioFork?: string
  guardrailMath?: string
}

// Module Types
export type AdvisorModule = 
  | 'financing' 
  | 'good_deal' 
  | 'new_vs_used' 
  | 'payment_safe' 
  | 'go_in' 
  | 'fees_walk' 
  | 'down_payment'

// Module 1: Good Deal
export type Urgency = 'this_week' | '2-4_weeks' | '1-3_months' | 'researching'
export type DealGoal = 'lowest_total' | 'lowest_monthly' | 'reliability' | 'resale' | 'build_credit'
export type ComfortWithRepairs = 'low' | 'medium' | 'high'
export type PlannedOwnership = '1-2_years' | '3-5_years' | '6+_years'
export type CompetingOffers = 'yes' | 'no' | 'not_sure'

export interface GoodDealAnswers {
  urgency: Urgency
  primaryGoal: DealGoal
  ownershipHorizon: PlannedOwnership
  repairComfort: ComfortWithRepairs
  competingOptions: CompetingOffers
  listingPrice?: number
  mileage?: number
  year?: number
  make?: string
  model?: string
}

// Module 2: New vs Used
export type ReliabilityPriority = 'low' | 'medium' | 'high'
export type WarrantyImportance = 'low' | 'medium' | 'high'
export type BudgetFlexibility = 'tight' | 'moderate' | 'flexible'
export type DrivingMilesPerYear = '<8k' | '8-15k' | '15k+'

export interface NewVsUsedAnswers {
  plannedOwnership: PlannedOwnership
  reliabilityPriority: ReliabilityPriority
  warrantyImportance: WarrantyImportance
  budgetFlexibility: BudgetFlexibility
  comfortWithRepairs: ComfortWithRepairs
  drivingMilesPerYear: DrivingMilesPerYear
}

// Module 3: Payment Safe
export type IncomeBand = '<3k' | '3-5k' | '5-7k' | '7k+' | 'not_sure'
export type HousingCostBand = '<1k' | '1-2k' | '2k+' | 'not_sure'

export interface PaymentSafeAnswers {
  incomeBand: IncomeBand
  housingCostBand: HousingCostBand
  otherFixedDebt: DebtRange
  emergencyFund: EmergencyFundRange
  goal: FinancingGoal
  proposedMonthlyPayment?: number
}

// Module 4: Go In
export type WrittenOTDReceived = 'yes' | 'no'
export type FeeBreakdownReceived = 'yes' | 'no'
export type Distance = 'local' | '30-60min' | '60min+'
export type CompetingOptions = 'yes' | 'no'

export interface GoInAnswers {
  writtenOtdReceived: WrittenOTDReceived
  feeBreakdownReceived: FeeBreakdownReceived
  distance: Distance
  competingOptions: CompetingOptions
  urgency: Urgency
}

// Module 5: Fees Walk
export type FeesDisclosedInWriting = 'yes' | 'no'
export type AddOnsMandatory = 'yes' | 'no' | 'not_sure'
export type WillingnessToWalk = 'low' | 'medium' | 'high'
export type OtherOptions = 'yes' | 'no'

export interface FeesWalkAnswers {
  feesDisclosedInWriting: FeesDisclosedInWriting
  addOnsMandatory: AddOnsMandatory
  willingnessToWalk: WillingnessToWalk
  otherOptions: OtherOptions
  feeLines?: string
}

// Module 6: Down Payment
export type EmergencyFundTarget = '<1k' | '1k-3k' | '3k-5k' | '5k+'

export interface DownPaymentAnswers {
  emergencyFundTarget: EmergencyFundTarget
  goal: FinancingGoal
  preApproval: PreApprovalStatus
  apr?: number
  termMonths?: LoanTerm
  downPaymentAmount?: number
}

// Union type for all module answers
export type AdvisorModuleAnswers = 
  | FinancingAdvisorAnswers 
  | GoodDealAnswers 
  | NewVsUsedAnswers 
  | PaymentSafeAnswers 
  | GoInAnswers 
  | FeesWalkAnswers 
  | DownPaymentAnswers

// Advisor session memory (stored in localStorage)
export interface AdvisorSessionMemory {
  listingUrl: string
  financingAnswers?: Partial<FinancingAdvisorAnswers>
  goodDealAnswers?: Partial<GoodDealAnswers>
  newVsUsedAnswers?: Partial<NewVsUsedAnswers>
  paymentSafeAnswers?: Partial<PaymentSafeAnswers>
  goInAnswers?: Partial<GoInAnswers>
  feesWalkAnswers?: Partial<FeesWalkAnswers>
  downPaymentAnswers?: Partial<DownPaymentAnswers>
  lastUpdated: string
}

