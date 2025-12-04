import { Calendar } from 'lucide-react'

export default function YearWheelPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Årshjul</h1>
        <p className="mt-2 text-gray-600">Oversigt over årshjulet</p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Årshjul</h2>
          <p className="text-gray-500 text-center">
            Denne side er under udvikling
          </p>
        </div>
      </div>
    </div>
  )
}

