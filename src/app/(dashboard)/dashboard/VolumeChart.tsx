'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fmtN } from '@/lib/formatting'

interface Point { label: string; volume: number; isToday: boolean }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="font-mono font-bold text-gray-900">{fmtN(payload[0].value)} FCFA</p>
    </div>
  )
}

export function VolumeChart({ data }: { data: Point[] }) {
  if (data.every(d => d.volume === 0)) {
    return <p className="py-8 text-center text-sm text-gray-400">Aucune donnée sur cette période</p>
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
        <YAxis hide/>
        <Tooltip content={<CustomTooltip/>} cursor={{ fill: '#f9fafb', radius: 8 }}/>
        <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isToday ? 'var(--tenant-primary, #F97316)' : '#e5e7eb'}/>
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
