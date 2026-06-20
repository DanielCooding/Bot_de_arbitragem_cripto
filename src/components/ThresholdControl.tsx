'use client';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function ThresholdControl({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
      <span className="text-sm text-slate-400 whitespace-nowrap">Alerta acima de</span>
      <input
        type="number"
        min="0.1"
        max="10"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0.3)}
        className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-500 transition-colors"
      />
      <span className="text-sm text-slate-400">%</span>
    </div>
  );
}
