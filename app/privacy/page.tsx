export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: January 3, 2026</p>

          <div className="prose prose-gray max-w-none space-y-6">
            <p className="text-gray-700 leading-relaxed">
              DealWise ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-3">We may collect:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Account information (such as email address)</li>
                <li>Vehicle and deal details you enter (prices, fees, add-ons)</li>
                <li>Usage data (pages viewed, features used)</li>
                <li>Technical data (browser type, device, cookies, local storage)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">How We Use Information</h2>
              <p className="text-gray-700 leading-relaxed mb-3">We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Provide deal analysis and negotiation guidance</li>
                <li>Generate AI-powered insights and explanations</li>
                <li>Process payments and manage entitlements</li>
                <li>Improve product performance and reliability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use trusted third parties, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Stripe for payment processing</li>
                <li>OpenAI to generate AI-powered analysis</li>
                <li>Vercel and related infrastructure providers to host our services</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                These providers process data only as necessary to deliver their services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Cookies & Local Storage</h2>
              <p className="text-gray-700 leading-relaxed mb-3">We use cookies and local storage to:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Maintain login sessions</li>
                <li>Remember selected packs and preferences</li>
                <li>Improve usability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain data only as long as necessary to provide the service and meet legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Your Rights</h2>
              <p className="text-gray-700 leading-relaxed">
                You may request access to or deletion of your data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have questions about this Privacy Policy or how your information is handled, please contact us using the Support form available on our website.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

