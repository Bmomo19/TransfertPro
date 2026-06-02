'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fmtN } from '@/lib/formatting'

type Statut = 'VALIDE' | 'SOUMIS' | 'ALERTE_ECART' | null

interface Point { label: string; volume: number; statut: Statut; isToday: boolean }

const COLOR: Record<string, string> = {
  VALIDE:      '#10b981',
  ALERTE_ECART:'#f97316',
  SOUMIS:      '#60a5fa',
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const { volume, statut } = payload[0].payload as Point
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="font-mono font-bold text-gray-900">{fmtN(volume)} FCFA</p>
      {statut && <p className="text-gray-400">{statut === 'VALIDE' ? 'Validé' : statut === 'ALERTE_ECART' ? 'Écart détecté' : 'En attente'}</p>}
    </div>
  )
}

export function AgentChart({ data }: { data: Point[] }) {
  if (data.every(d => d.volume === 0)) {
    return <p className="py-10 text-center text-sm text-gray-400">Aucune saisie sur cette période</p>
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="20%">
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={4}/>
        <YAxis hide/>
        <Tooltip content={<Tip/>} cursor={{ fill: '#f9fafb', radius: 4 }}/>
        <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.volume === 0 ? '#f3f4f6' : d.statut ? COLOR[d.statut] ?? '#d1d5db' : '#d1d5db'}/>
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
