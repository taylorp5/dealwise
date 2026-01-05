'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  type SimulationState,
  type LeverageState,
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
  const { loading: entitlementsLoading, hasInPerson } = useEntitlements()
  
  const [simState, setSimState] = useState<SimulationState>(initializeSimulation())
  const [userInput, setUserInput] = useState('')
  const [maxTurns, setMaxTurns] = useState(5)
  const [isEnded, setIsEnded] = useState(false)
  const [biggestMistake, setBiggestMistake] = useState<string | null>(null)
  const [biggestWin, setBiggestWin] = useState<string | null>(null)
  
  // Entitlement guard
  useEffect(() => {
    if (!authLoading && !entitlementsLoading && !hasInPerson) {
      router.push('/packs')
    }
  }, [authLoading, entitlementsLoading, hasInPerson, router])
  
  // Initialize simulation
  useEffect(() => {
    setMaxTurns(getMaxTurns())
    // Start with first dealer message
    const firstLine = nextDealerLine(0, null, new Set())
    setSimState(prev => ({
      ...prev,
      turn: 1,
      previousTactic: firstLine.tactic,
      usedLines: new Set([firstLine.text]),
      messages: [
        { type: 'dealer', text: firstLine.text },
      ],
    }))
  }, [])
  
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
        feedback,
      },
    ]
    
    // Check if simulation should end
    const nextTurn = simState.turn + 1
    if (nextTurn >= maxTurns) {
      setIsEnded(true)
      setSimState(prev => ({
        ...prev,
        turn: nextTurn,
        leverage: newLeverage,
        messages: updatedMessages,
      }))
      setUserInput('')
      return
    }
    
    // Get next dealer line
    const nextLine = nextDealerLine(newLeverage, simState.previousTactic, simState.usedLines)
    
    // Update state
    setSimState(prev => ({
      ...prev,
      turn: nextTurn,
      leverage: newLeverage,
      previousTactic: nextLine.tactic,
      usedLines: new Set([...prev.usedLines, nextLine.text]),
      messages: [
        ...updatedMessages,
        { type: 'dealer' as const, text: nextLine.text },
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
    setUserInput('')
    
    const firstLine = nextDealerLine(0, null, new Set())
    setSimState({
      turn: 1,
      leverage: 0,
      previousTactic: firstLine.tactic,
      usedLines: new Set([firstLine.text]),
      messages: [
        { type: 'dealer', text: firstLine.text },
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
              <p className="text-sm text-gray-600 mt-1">Practice handling dealer pressure tactics</p>
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
                      reasons={msg.feedback.reasons}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* End State Summary */}
        {isEnded && (
          <Card className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Simulation Complete</h2>
            
            <div className="space-y-4 mb-6">
              <div>
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
              
              {biggestWin && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <h4 className="font-semibold text-green-900 mb-1">Biggest Win</h4>
                  <p className="text-sm text-green-800">{biggestWin}</p>
                </div>
              )}
              
              {biggestMistake && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <h4 className="font-semibold text-red-900 mb-1">Biggest Mistake</h4>
                  <p className="text-sm text-red-800">{biggestMistake}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
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


