'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LeverageMeter from '@/components/live-pressure/LeverageMeter'
import SuggestedReplyChips from '@/components/live-pressure/SuggestedReplyChips'
import FeedbackPanel from '@/components/live-pressure/FeedbackPanel'
import {
  initializeSimulation,
  nextDealerLine,
  classifyResponse,
  updateLeverage,
  getMaxTurns,
  calculateResults,
  getOpeningLine,
  type SimulationState,
  type LeverageState,
  type SimulationResults,
  type Scenario,
} from '@/lib/simulation/live-pressure-engine'

// Suggested replies for beginner mode (2-3 chips as per requirements)
const SUGGESTED_REPLIES = [
  "I'm not deciding today. I need to think about it.",
  "I'm comparing offers from other dealerships.",
  "Can you send me an OTD breakdown?",
]

export default function LivePressureModePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: entitlementsLoading, hasInPerson } = useEntitlements()
  
  // Get scenario from query param, default to 'pressure-tactics'
  const scenarioParam = searchParams.get('scenario')
  const scenario: Scenario = (scenarioParam === 'payment-trap' ? 'payment-trap' : 'pressure-tactics')
  
  const [simState, setSimState] = useState<SimulationState>(initializeSimulation(scenario))
  const [userInput, setUserInput] = useState('')
  const [maxTurns, setMaxTurns] = useState(5)
  const [isEnded, setIsEnded] = useState(false)
  const [biggestMistake, setBiggestMistake] = useState<string | null>(null)
  const [biggestWin, setBiggestWin] = useState<string | null>(null)
  const [results, setResults] = useState<SimulationResults | null>(null)
  
  // Entitlement guard
  useEffect(() => {
    if (!authLoading && !entitlementsLoading && !hasInPerson) {
      router.push('/packs')
    }
  }, [authLoading, entitlementsLoading, hasInPerson, router])
  
    // Initialize simulation
  useEffect(() => {
    setMaxTurns(getMaxTurns())
    // Get opening line based on scenario
    const firstLine = getOpeningLine(scenario)
    setSimState(prev => ({
      ...prev,
      turn: 1,
      previousTactic: firstLine.tactic,
      usedLines: new Set([firstLine.text]),
      messages: [
        { type: 'dealer', text: firstLine.text, dealerTactic: firstLine.tactic },
      ],
    }))
  }, [scenario])
  
  const handleSubmit = () => {
    if (!userInput.trim() || isEnded) return
    
    // Classify response
    const feedback = classifyResponse(userInput)
    
    // Update leverage
    const newLeverage = updateLeverage(simState.leverage, feedback.label)
    
    // Track biggest mistake/win
    if (feedback.label === 'weak' && !biggestMistake) {
      setBiggestMistake(feedback.reasons[0])
    }
    if (feedback.label === 'strong' && !biggestWin) {
      setBiggestWin(feedback.reasons[0])
    }
    
    // Add user message
    const updatedMessages = [
      ...simState.messages,
      {
        type: 'user' as const,
        text: userInput.trim(),
        classification: feedback.label,
        intent: feedback.intent,
        feedback,
      },
    ]
    
    // Check if simulation should end
    const nextTurn = simState.turn + 1
    if (nextTurn >= maxTurns) {
      const finalState: SimulationState = {
        ...simState,
        turn: nextTurn,
        leverage: newLeverage,
        messages: updatedMessages,
      }
      setIsEnded(true)
      setSimState(finalState)
      // Calculate results
      const calculatedResults = calculateResults(finalState)
      setResults(calculatedResults)
      setUserInput('')
      return
    }
    
    // Get next dealer line (pass user intent)
    const nextLine = nextDealerLine(newLeverage, simState.previousTactic, simState.usedLines, feedback.intent)
    
    // Update state
    setSimState(prev => ({
      ...prev,
      turn: nextTurn,
      leverage: newLeverage,
      previousTactic: nextLine.tactic,
      usedLines: new Set([...prev.usedLines, nextLine.text]),
      messages: [
        ...updatedMessages,
        { type: 'dealer' as const, text: nextLine.text, dealerTactic: nextLine.tactic },
      ],
    }))
    
    setUserInput('')
  }
  
  const handleReset = () => {
    const newMaxTurns = getMaxTurns()
    setMaxTurns(newMaxTurns)
    setIsEnded(false)
    setBiggestMistake(null)
    setBiggestWin(null)
    setResults(null)
    setUserInput('')
    
    // Reset with same scenario
    const firstLine = getOpeningLine(scenario)
    setSimState({
      turn: 1,
      leverage: 0,
      previousTactic: firstLine.tactic,
      usedLines: new Set([firstLine.text]),
      messages: [
        { type: 'dealer', text: firstLine.text, dealerTactic: firstLine.tactic },
      ],
    })
  }
  
  if (authLoading || entitlementsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to use this feature</p>
          <a href="/login" className="text-blue-600 hover:text-blue-700">Sign In</a>
        </div>
      </div>
    )
  }
  
  if (!hasInPerson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">In-Person Negotiation Pack required</p>
          <a href="/packs" className="text-blue-600 hover:text-blue-700">View Packs</a>
        </div>
      </div>
    )
  }
  
  const finalLeverage = simState.leverage
  const isBuyerControl = finalLeverage >= 1
  const isDealerControl = finalLeverage <= -1
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Pressure Mode</h1>
              <p className="text-sm text-gray-600 mt-1">
                {scenario === 'payment-trap' 
                  ? 'Practice avoiding the monthly payment trap' 
                  : 'Practice handling dealer pressure tactics'}
              </p>
              {scenario === 'payment-trap' && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Focus: Insist on OTD and itemized breakdown
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Scenario Selector */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => router.push('/copilot/in-person/live-pressure')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    scenario === 'pressure-tactics'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pressure Tactics
                </button>
                <button
                  onClick={() => router.push('/copilot/in-person/live-pressure?scenario=payment-trap')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    scenario === 'payment-trap'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Payment Trap
                </button>
              </div>
              <Button
                onClick={() => router.push('/copilot/in-person')}
                variant="secondary"
                size="sm"
              >
                ← Back
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Leverage Meter */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leverage Meter</h2>
          <LeverageMeter leverage={simState.leverage} />
        </Card>
        
        {/* Chat Transcript */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {simState.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'dealer' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.type === 'dealer'
                      ? 'bg-blue-100 text-gray-900'
                      : 'bg-green-100 text-gray-900'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    {msg.type === 'dealer' ? 'Dealer' : 'You'}
                  </div>
                  <div className="text-sm">{msg.text}</div>
                  
                  {/* Show feedback for user messages */}
                  {msg.type === 'user' && msg.feedback && (
                    <FeedbackPanel
                      classification={msg.feedback.label}
                      intent={msg.feedback.intent}
                      reasons={msg.feedback.reasons}
                      tryInstead={msg.feedback.tryInstead}
                      dealerTranslation={msg.feedback.dealerTranslation}
                      costOfMistake={msg.feedback.costOfMistake}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* End State Summary */}
        {isEnded && results && (
          <Card className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Simulation Complete</h2>
              <div className={`text-4xl font-bold ${
                results.grade === 'A' ? 'text-green-600' :
                results.grade === 'B' ? 'text-blue-600' :
                'text-orange-600'
              }`}>
                Grade {results.grade}
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Final Leverage */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Final Leverage</h3>
                <p className={`text-lg font-bold ${
                  isBuyerControl ? 'text-green-600' :
                  isDealerControl ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {isBuyerControl ? 'Buyer Control ✓' :
                   isDealerControl ? 'Dealer Control ✗' :
                   'Neutral'}
                </p>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Pressure Resistance</h4>
                  <p className="text-2xl font-bold text-blue-600">{results.pressureResistance}</p>
                  <p className="text-xs text-gray-500 mt-1">Strong/neutral vs urgency/scarcity</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Clarity Score</h4>
                  <p className="text-2xl font-bold text-green-600">{results.clarityScore}</p>
                  <p className="text-xs text-gray-500 mt-1">OTD/breakdown requests</p>
                </div>
              </div>
              
              {/* Payment Anchoring Status */}
              {results.avoidedPaymentAnchoring && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <p className="text-sm font-semibold text-green-900">Avoided Payment Anchoring</p>
                  </div>
                </div>
              )}
              
              {/* Top 2 Best Moves */}
              {results.bestMoves.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3">Top Best Moves</h4>
                  <ul className="space-y-2">
                    {results.bestMoves.map((move, index) => (
                      <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">{index + 1}.</span>
                        <span className="italic">{move}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Improvement Point */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">💡 Improvement Point</h4>
                <p className="text-sm text-amber-800">{results.improvementPoint}</p>
              </div>
              
              {/* Weak Response Count (if any) */}
              {results.weakResponseCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Weak responses:</span> {results.weakResponseCount}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button onClick={handleReset} className="flex-1">
                Try Again
              </Button>
              <Button
                onClick={() => router.push('/copilot/in-person')}
                variant="secondary"
                className="flex-1"
              >
                Back to In-Person Pack
              </Button>
            </div>
          </Card>
        )}
        
        {/* Response Area */}
        {!isEnded && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Response</h2>
            
            <SuggestedReplyChips
              suggestions={SUGGESTED_REPLIES}
              onSelect={setUserInput}
              disabled={isEnded}
            />
            
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Type your response to the dealer..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              disabled={isEnded}
            />
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                Turn {simState.turn} of {maxTurns}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!userInput.trim() || isEnded}
              >
                Submit
              </Button>
            </div>
          </Card>
        )}
        
        {/* Helper Note */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-600 italic text-center">
            💡 This is a practice simulation. Use it to build confidence before negotiating in person.
          </p>
        </div>
      </div>
    </div>
  )
}


