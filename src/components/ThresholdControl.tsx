'use client';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function ThresholdControl({ value, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{ background: 'var(--bnb-surface2)', border: '1px solid var(--bnb-border)', fontSize: '12px' }}
    >
      <span style={{ color: 'var(--bnb-muted)' }}>Alerta &gt;</span>
      <input
        type="number"
        min="0.01"
        max="10"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0.3)}
        style={{
          width: 52,
          background: 'transparent',
          border: 'none',
          color: 'var(--bnb-yellow)',
          fontWeight: 600,
          textAlign: 'center',
          outline: 'none',
          fontSize: '12px',
        }}
      />
      <span style={{ color: 'var(--bnb-muted)' }}>%</span>
    </div>
  );
}
