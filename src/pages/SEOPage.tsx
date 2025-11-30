import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MousePointerClick, Eye, TrendingUp } from 'lucide-react'

// Mock data for SEO
const seoKPIData = {
  clicks: 12450,
  impressions: 89200,
  avgPosition: 3.2,
}

const monthlyTrafficData = [
  { month: 'Jan', traffic: 3200 },
  { month: 'Feb', traffic: 3800 },
  { month: 'Mar', traffic: 4200 },
  { month: 'Apr', traffic: 4500 },
  { month: 'Maj', traffic: 5100 },
  { month: 'Jun', traffic: 5800 },
  { month: 'Jul', traffic: 6200 },
  { month: 'Aug', traffic: 6800 },
  { month: 'Sep', traffic: 7200 },
  { month: 'Okt', traffic: 7800 },
  { month: 'Nov', traffic: 8400 },
  { month: 'Dec', traffic: 8900 },
]

export default function SEOPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SEO Performance</h1>
        <p className="mt-2 text-gray-600">Oversigt over søgemaskineoptimering og trafik</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Clicks Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clicks</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {seoKPIData.clicks.toLocaleString('da-DK')}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MousePointerClick className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Impressions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Impressions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {seoKPIData.impressions.toLocaleString('da-DK')}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Avg Position Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Position</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {seoKPIData.avgPosition}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Traffic Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Månedlig Trafik</h2>
          <p className="mt-1 text-sm text-gray-600">Besøg fra Google Search Console</p>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrafficData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="traffic" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}




