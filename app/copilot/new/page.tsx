'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { packs, getPackConfig } from '@/lib/packs/config'
import type { PackType, CreateSessionRequest } from '@/lib/types/copilot'

export default function NewCopilotPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedPack, setSelectedPack] = useState<PackType | null>(null)
  const [wizardData, setWizardData] = useState<Partial<CreateSessionRequest>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
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
          <a href="/login" className="text-blue-600 hover:text-blue-700">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const packConfig = selectedPack ? getPackConfig(selectedPack) : null
  const questions = packConfig?.wizardQuestions || []
  const currentQuestion = questions[currentStep]

  const handlePackSelect = (packType: PackType) => {
    setSelectedPack(packType)
    setWizardData({ pack_type: packType, payment_method: 'finance', has_trade_in: false })
    setCurrentStep(0)
  }

  const handleAnswer = (questionId: string, value: any) => {
    setWizardData((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      setSelectedPack(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedPack) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/copilot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...wizardData,
          pack_type: selectedPack,
        } as CreateSessionRequest),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session')
      }

      router.push(`/copilot/${data.sessionId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create session')
      setLoading(false)
    }
  }

  // Pack selection screen
  if (!selectedPack) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Start New Negotiation</h1>
            <p className="text-gray-600">Choose a pack that matches your situation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(packs).map((pack) => (
              <div
                key={pack.id}
                className="p-6 hover:shadow-lg transition cursor-pointer bg-white rounded-xl shadow-sm border border-slate-200"
                onClick={() => handlePackSelect(pack.id as PackType)}
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{pack.name}</h2>
                <p className="text-gray-600 text-sm mb-4">{pack.description}</p>
                <Button className="w-full">Select Pack</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Wizard screen
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{packConfig?.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {currentStep + 1} / {questions.length}
            </span>
          </div>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 mb-6">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        <Card className="mb-6">
          {currentQuestion && (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-2">
                  {currentQuestion.label}
                  {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {currentQuestion.helpText && (
                  <p className="text-sm text-gray-600 mb-4">{currentQuestion.helpText}</p>
                )}

                {currentQuestion.type === 'select' && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => (
                      <button
                        key={`${currentQuestion.id}-${index}-${String(option.value)}`}
                        onClick={() => handleAnswer(currentQuestion.id, option.value)}
                        className={`w-full text-left p-4 border-2 rounded-lg transition ${
                          wizardData[currentQuestion.id as keyof CreateSessionRequest] === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'number' && (
                  <input
                    type="number"
                    value={typeof wizardData[currentQuestion.id as keyof CreateSessionRequest] === 'number' ? (wizardData[currentQuestion.id as keyof CreateSessionRequest] as number) : ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, parseFloat(e.target.value) || 0)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {currentQuestion.type === 'boolean' && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAnswer(currentQuestion.id, true)}
                      className={`flex-1 p-4 border-2 rounded-lg transition ${
                        wizardData[currentQuestion.id as keyof CreateSessionRequest] === true
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleAnswer(currentQuestion.id, false)}
                      className={`flex-1 p-4 border-2 rounded-lg transition ${
                        wizardData[currentQuestion.id as keyof CreateSessionRequest] === false
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}

                {currentQuestion.type === 'text' && (
                  <input
                    type="text"
                    value={typeof wizardData[currentQuestion.id as keyof CreateSessionRequest] === 'string' ? (wizardData[currentQuestion.id as keyof CreateSessionRequest] as string) : ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                {currentQuestion.type === 'textarea' && (
                  <textarea
                    value={typeof wizardData[currentQuestion.id as keyof CreateSessionRequest] === 'string' ? (wizardData[currentQuestion.id as keyof CreateSessionRequest] as string) : ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={handleBack} disabled={loading}>
            {currentStep === 0 ? 'Back to Packs' : 'Back'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              loading ||
              (currentQuestion?.required &&
                !wizardData[currentQuestion.id as keyof CreateSessionRequest])
            }
          >
            {loading
              ? 'Creating...'
              : currentStep === questions.length - 1
              ? 'Start Negotiation'
              : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}


