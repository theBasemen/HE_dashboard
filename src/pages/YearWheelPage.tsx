import React, { useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { 
  Megaphone, Wrench, CalendarCheck, CheckSquare, AlertCircle 
} from 'lucide-react';

// --- TYPES ---
type UrgencyLevel = 'Critical' | 'High' | 'Medium' | 'Low';

interface WheelStats {
  indoor: number;
  outdoor: number;
  sales: number;
}

interface MonthData {
  month: string;
  phase: string;
  executionFocus: string;
  marketingFocus: string;
  marketingUrgency: UrgencyLevel;
  actions: string[];
  stats: WheelStats;
}

// --- DATA ---
const yearData: MonthData[] = [
  {
    month: 'Januar',
    phase: 'Kick-off Sæson',
    executionFocus: 'Filmteambuilding & AI',
    marketingFocus: 'Sommerfest & Forår',
    marketingUrgency: 'Medium',
    actions: ['Opfølgning på julefrokost-kunder', 'LinkedIn: "Få styr på strategien med AI"', 'Opdater cases på sitet'],
    stats: { indoor: 90, outdoor: 10, sales: 60 }
  },
  {
    month: 'Februar',
    phase: 'Vinter Drift',
    executionFocus: 'AI Workshops (Indendørs)',
    marketingFocus: 'Sommerfesten (High Urgency)',
    marketingUrgency: 'High',
    actions: ['Nyhedsbrev: Book Vejfesten nu', 'Opdater sommerfest landingssider', 'Google Ads: "Firmafest Ude"'],
    stats: { indoor: 80, outdoor: 20, sales: 80 }
  },
  {
    month: 'Marts',
    phase: 'Forårs Konferencer',
    executionFocus: 'Newsroom & Film',
    marketingFocus: 'Udendørs Teambuilding',
    marketingUrgency: 'Medium',
    actions: ['SEO tjek: Ranker vi på "Udendørs"?', 'Case-stories fra vinterens events', 'Kontakt konferencecentre'],
    stats: { indoor: 60, outdoor: 40, sales: 70 }
  },
  {
    month: 'April',
    phase: 'Pre-Summer',
    executionFocus: 'Filmteambuilding',
    marketingFocus: 'Last-minute Sommerfest',
    marketingUrgency: 'High',
    actions: ['Google Ads boost på "Firmafest"', 'Ringe til kunder fra sidste sommer', 'Klargør udstyr til sæson'],
    stats: { indoor: 40, outdoor: 60, sales: 90 }
  },
  {
    month: 'Maj',
    phase: 'Højsæson (Drift)',
    executionFocus: 'Vejfesten & Outdoor',
    marketingFocus: 'Planlægning af Q3',
    marketingUrgency: 'Low',
    actions: ['Saml content (video/foto) nu!', 'Automatiser svar på forespørgsler', 'Briefing af freelance crew'],
    stats: { indoor: 20, outdoor: 100, sales: 40 }
  },
  {
    month: 'Juni',
    phase: 'SOMMERFEST AMOK',
    executionFocus: 'Vejfesten',
    marketingFocus: 'Julefrokost (Early Bird)',
    marketingUrgency: 'Medium',
    actions: ['Læg "Book Julefrokost" banner på forsiden', 'Send "Tak for før ferien" mail', 'Driftsmøder hver mandag'],
    stats: { indoor: 10, outdoor: 100, sales: 50 }
  },
  {
    month: 'Juli',
    phase: 'Industriferie',
    executionFocus: 'Ferie / Lavblus',
    marketingFocus: 'SEO Oprydning & Tech Fix',
    marketingUrgency: 'Low',
    actions: ['Opdater website tekster', 'Tjek alle døde links', 'Slap af og lad op!'],
    stats: { indoor: 10, outdoor: 30, sales: 20 }
  },
  {
    month: 'August',
    phase: 'Opstart & Sensommer',
    executionFocus: 'Vejfesten (Sensommer)',
    marketingFocus: 'JULEFROKOST (CRITICAL)',
    marketingUrgency: 'Critical',
    actions: ['Full scale Julefrokost kampagne', 'Nyhedsbrev: "De bedste datoer ryger nu"', 'Kontakt hoteller for partnerskaber'],
    stats: { indoor: 30, outdoor: 80, sales: 100 }
  },
  {
    month: 'September',
    phase: 'Konference Sæson',
    executionFocus: 'Film & AI',
    marketingFocus: 'Julefrokost & Indendørs',
    marketingUrgency: 'High',
    actions: ['LinkedIn kampagne: Teambuilding', 'Opfølgning på juletilbud', 'Book jule-freelancere'],
    stats: { indoor: 70, outdoor: 50, sales: 90 }
  },
  {
    month: 'Oktober',
    phase: 'Efterårsferie / Drift',
    executionFocus: 'Firmaet på Klingen',
    marketingFocus: 'Julefrokost (Last Call)',
    marketingUrgency: 'High',
    actions: ['Boost "Underholdning til julefrokost" SEO', 'Sælg "Firmaet på Klingen" som tilvalg', 'Planlæg Q1 kampagner'],
    stats: { indoor: 80, outdoor: 20, sales: 80 }
  },
  {
    month: 'November',
    phase: 'Julefrokost Drift',
    executionFocus: 'Julefrokost Underholdning',
    marketingFocus: 'Kick-off Januar (Næste år)',
    marketingUrgency: 'Medium',
    actions: ['Sælg "Januar Kick-off" til dem vi afviser', 'Indsaml testimonials', 'Sikr at alt udstyr spiller'],
    stats: { indoor: 100, outdoor: 0, sales: 60 }
  },
  {
    month: 'December',
    phase: 'JULEFROKOST AMOK',
    executionFocus: 'Underholdning',
    marketingFocus: 'Januar/Februar Teambuilding',
    marketingUrgency: 'Medium',
    actions: ['Send julekort + "Vi ses i 2026"', 'Planlæg næste års budget', 'Evaluering af året'],
    stats: { indoor: 100, outdoor: 0, sales: 50 }
  }
];

const YearWheel: React.FC = () => {
  // Find nuværende måned index (0-11)
  const currentMonthIndex = new Date().getMonth();
  const [selectedIndex, setSelectedIndex] = useState<number>(currentMonthIndex);
  
  const selectedData = yearData[selectedIndex];

  // Data til grafen
  const chartData = [
    { subject: 'Indendørs Drift', A: selectedData.stats.indoor, fullMark: 100 },
    { subject: 'Udendørs Drift', A: selectedData.stats.outdoor, fullMark: 100 },
    { subject: 'Salgstryk', A: selectedData.stats.sales, fullMark: 100 },
  ];

  // Helper til at vælge farve baseret på urgency
  const getUrgencyColor = (level: UrgencyLevel): string => {
    switch(level) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CalendarCheck className="w-8 h-8 text-indigo-600" />
          Det Strategiske Årshjul
        </h1>
        <p className="text-gray-500 mt-2">
          Planlæg markedsføring baseret på lead-time, ikke kun nuværende drift.
        </p>
      </div>

      {/* MÅNEDSVÆLGER (SLIDER) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2 px-2">
          {yearData.map((m, i) => (
            <button 
              key={m.month}
              onClick={() => setSelectedIndex(i)}
              className={`text-xs font-medium transition-colors ${
                i === selectedIndex ? 'text-indigo-600 font-bold' : 'hover:text-gray-900'
              }`}
            >
              {m.month.substring(0,3)}
            </button>
          ))}
        </div>
        <input 
          type="range" 
          min="0" 
          max="11" 
          value={selectedIndex} 
          onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* VENSTRE: GRAF & STATUS */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 lg:col-span-1 flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{selectedData.month}</h3>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 mb-6">
            {selectedData.phase}
          </span>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false}/>
                <Radar
                  name={selectedData.month}
                  dataKey="A"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Viser intensiteten af drift vs. salgsbehov i denne måned.
          </p>
        </div>

        {/* HØJRE: ACTION CARDS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* MARKETING ALERT CARD */}
          <div className={`p-6 rounded-xl border-l-4 shadow-sm ${getUrgencyColor(selectedData.marketingUrgency)}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide opacity-70 flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Marketing Fokus (Sælg nu!)
                </h4>
                <p className="text-2xl font-bold mt-1">{selectedData.marketingFocus}</p>
                <p className="mt-2 text-sm opacity-90">
                  Hvis vi ikke markedsfører dette nu, mangler vi omsætning om 3 måneder.
                </p>
              </div>
              {selectedData.marketingUrgency === 'Critical' && (
                <AlertCircle className="w-8 h-8 opacity-50" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DRIFT FOKUS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4" /> Drift & Eksekvering
              </h4>
              <p className="text-lg font-medium text-gray-900">
                {selectedData.executionFocus}
              </p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Primære produkter i gang lige nu.</p>
              </div>
            </div>

            {/* TO-DO LISTE */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                <CheckSquare className="w-4 h-4" /> Månedens Tjekliste
              </h4>
              <ul className="space-y-3">
                {selectedData.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3 group cursor-pointer">
                    <div className="mt-0.5 w-5 h-5 rounded border border-gray-300 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                      <div className="w-3 h-3 rounded-sm bg-transparent group-hover:bg-indigo-100" />
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default YearWheel;