import { Brain, CheckCircle2, AlertCircle } from 'lucide-react'

// Mock data for AI audits
const aiAudits = [
  {
    id: 1,
    query: "Bedste eventbureau i DK",
    result: "Nævnt som nr 3",
    status: "success",
    date: "2024-01-15",
  },
  {
    id: 2,
    query: "Eventplanlægning København",
    result: "Nævnt som nr 1",
    status: "success",
    date: "2024-01-10",
  },
  {
    id: 3,
    query: "Corporate events Danmark",
    result: "Ikke nævnt",
    status: "warning",
    date: "2024-01-05",
  },
  {
    id: 4,
    query: "Kreative eventløsninger",
    result: "Nævnt som nr 5",
    status: "success",
    date: "2023-12-28",
  },
]

export default function LLMPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI & Brand Synlighed</h1>
        <p className="mt-2 text-gray-600">Eksperimentelt dashboard for AI/LLM synlighed og brand awareness</p>
      </div>

      {/* Share of Model Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Share of Model</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Måler hvor ofte Himmelstrup Events nævnes af AI-modeller i relevante kontekster.
        </p>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 mb-2">23.5%</p>
            <p className="text-sm text-gray-600">Af relevante queries i test-sættet</p>
          </div>
        </div>
      </div>

      {/* AI Audit Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Seneste AI-Audit Tjek</h2>
        <div className="space-y-4">
          {aiAudits.map((audit) => (
            <div
              key={audit.id}
              className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                {audit.status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Test: "{audit.query}"
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Resultat: {audit.result}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {new Date(audit.date).toLocaleDateString('da-DK')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}




