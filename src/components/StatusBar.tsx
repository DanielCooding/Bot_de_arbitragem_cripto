'use client';

interface Props {
  connected: boolean;
  lastUpdate: number | null;
  tickCount: number;
}

export default function StatusBar({ connected, lastUpdate, tickCount }: Props) {
  return (
    <div className="flex items-center gap-4" style={{ fontSize: '11px', color: 'var(--bnb-muted)' }}>
      <span className="flex items-center gap-1.5">
        <span
          className={connected ? 'animate-blink' : ''}
          style={{
            display: 'inline-block',
            width: 6, height: 6,
            borderRadius: '50%',
            background: connected ? 'var(--bnb-green)' : 'var(--bnb-red)',
          }}
        />
        {connected ? 'Conectado' : 'Desconectado'}
      </span>
      {lastUpdate && (
        <span>Últ. atualização: {new Date(lastUpdate).toLocaleTimeString('pt-BR')}</span>
      )}
      <span>{tickCount} ticks</span>
    </div>
  );
}
