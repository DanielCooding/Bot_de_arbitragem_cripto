'use client';

interface Props {
  connected: boolean;
  lastUpdate: number | null;
  tickCount: number;
}

export default function StatusBar({ connected, lastUpdate, tickCount }: Props) {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {connected ? 'Conectado' : 'Desconectado'}
      </span>
      {lastUpdate && (
        <span>
          Atualizado: {new Date(lastUpdate).toLocaleTimeString('pt-BR')}
        </span>
      )}
      <span>{tickCount} ticks recebidos</span>
    </div>
  );
}
