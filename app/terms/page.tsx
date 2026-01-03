export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: January 3, 2026</p>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-gray-700 leading-relaxed">
              By using DealWise, you agree to these Terms.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Purpose of the Service</h2>
              <p className="text-gray-700 leading-relaxed">
                DealWise provides informational tools to help consumers understand vehicle pricing, fees, and negotiation concepts. DealWise does not provide legal, financial, or professional advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">No Guarantees</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                All prices, ranges, and recommendations are estimates based on typical market data and common dealer practices. Actual dealer pricing and behavior may vary.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You are responsible for verifying all information directly with the dealer before making a purchase.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">User Responsibility</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree not to misuse the service or rely on it as the sole basis for a purchasing decision.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Payments & Access</h2>
              <p className="text-gray-700 leading-relaxed">
                DealWise offers one-time purchase packs. Access is granted after payment. Refunds are not guaranteed unless required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                DealWise is not responsible for financial losses, dealer decisions, or outcomes resulting from use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Changes to the Service</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update features, pricing, or availability at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These terms are governed by the laws of the State of Illinois.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

