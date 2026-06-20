'use client';

import { useEffect, useRef } from 'react';

interface SpreadPoint {
  timestamp:      number;
  spreadPct:      number;
  symbol:         string;
  isOpportunity?: boolean;
}

interface Props {
  history:   SpreadPoint[];
  symbol:    string;
  threshold: number;
}

export default function SpreadChart({ history, symbol, threshold }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  // Guardar tudo em refs para o loop de animação ler sempre o valor mais recente
  const historyRef   = useRef(history);
  const symbolRef    = useRef(symbol);
  const thresholdRef = useRef(threshold);
  historyRef.current   = history;
  symbolRef.current    = symbol;
  thresholdRef.current = threshold;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      const ctx = canvas!.getContext('2d');
      if (!ctx) return;

      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      const W    = rect.width;
      const H    = rect.height;

      if (canvas!.width !== W * dpr || canvas!.height !== H * dpr) {
        canvas!.width  = W * dpr;
        canvas!.height = H * dpr;
        ctx.scale(dpr, dpr);
      }

      // Lê sempre os valores mais recentes via refs
      const pts = historyRef.current
        .filter(h => h.symbol === symbolRef.current)
        .slice(-100);
      const thr = thresholdRef.current;

      const PL = 58, PR = 24, PT = 14, PB = 26;
      const cW = W - PL - PR;
      const cH = H - PT - PB;

      ctx.clearRect(0, 0, W, H);

      // Fundo
      ctx.fillStyle = '#141720';
      ctx.fillRect(0, 0, W, H);

      if (pts.length < 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = '13px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Aguardando dados de spread...', W / 2, H / 2);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const vals   = pts.map(p => p.spreadPct);
      const maxVal = Math.max(...vals, thr * 2, 0.002);
      const minVal = Math.max(0, Math.min(...vals) - maxVal * 0.05);
      const range  = maxVal - minVal || 0.001;

      const toX = (i: number) => PL + (i / (pts.length - 1)) * cW;
      const toY = (v: number) => PT + (1 - (v - minVal) / range) * cH;

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.font = '9px monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (let i = 0; i <= 4; i++) {
        const v = minVal + (i / 4) * range;
        const y = toY(v);
        ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y); ctx.stroke();
        ctx.fillText(v.toFixed(4) + '%', PL - 4, y);
      }

      // Eixo X — timestamps
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '8px monospace';
      const step = Math.max(1, Math.floor(pts.length / 5));
      for (let i = 0; i < pts.length; i += step) {
        const t = new Date(pts[i].timestamp);
        const label = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
        ctx.fillText(label, toX(i), H - 2);
      }

      // Linha threshold
      const thY = toY(thr);
      if (thY >= PT && thY <= PT + cH) {
        ctx.save();
        ctx.strokeStyle = 'rgba(240,185,11,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(PL, thY); ctx.lineTo(W - PR, thY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ctx.fillStyle = 'rgba(240,185,11,0.45)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`thr ${thr}%`, W - PR + 3, thY);
      }

      // Área preenchida (degradê)
      const grad = ctx.createLinearGradient(0, PT, 0, PT + cH);
      grad.addColorStop(0,   'rgba(240,185,11,0.22)');
      grad.addColorStop(0.7, 'rgba(240,185,11,0.05)');
      grad.addColorStop(1,   'rgba(240,185,11,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(pts[0].spreadPct));
      for (let i = 1; i < pts.length; i++) {
        const x0 = toX(i-1), y0 = toY(pts[i-1].spreadPct);
        const x1 = toX(i),   y1 = toY(pts[i].spreadPct);
        const cx  = (x0+x1)/2;
        ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      }
      ctx.lineTo(toX(pts.length-1), PT + cH);
      ctx.lineTo(PL, PT + cH);
      ctx.closePath();
      ctx.fill();

      // Linha principal
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(pts[0].spreadPct));
      for (let i = 1; i < pts.length; i++) {
        const x0 = toX(i-1), y0 = toY(pts[i-1].spreadPct);
        const x1 = toX(i),   y1 = toY(pts[i].spreadPct);
        const cx  = (x0+x1)/2;
        ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      }
      ctx.strokeStyle = '#F0B90B';
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(240,185,11,0.5)';
      ctx.shadowBlur  = 5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Pontos de oportunidade
      pts.forEach((p, i) => {
        if (!p.isOpportunity) return;
        ctx.beginPath();
        ctx.arc(toX(i), toY(p.spreadPct), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#F0B90B';
        ctx.fill();
        ctx.strokeStyle = '#141720';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Ponto pulsante ao vivo
      const last = pts[pts.length - 1];
      const lx   = toX(pts.length - 1);
      const ly   = toY(last.spreadPct);
      const t    = Date.now() / 400;
      const pulse = 0.5 + 0.5 * Math.sin(t);

      ctx.beginPath();
      ctx.arc(lx, ly, 3 + pulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,185,11,${0.08 + pulse * 0.12})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#F0B90B';
      ctx.fill();

      // Label valor atual
      const label = last.spreadPct.toFixed(5) + '%';
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#F0B90B';
      ctx.textAlign = lx + 80 > W - PR ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      const lxOff = lx + 80 > W - PR ? lx - 8 : lx + 8;
      ctx.fillText(label, lxOff, ly - 1);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Inicia o loop UMA vez, lê dados sempre via refs

  return (
    <div style={{ background: '#141720', border: '1px solid var(--bnb-border)', borderRadius: 4, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '210px', display: 'block' }}
      />
      <div style={{ fontSize: 10, color: 'var(--bnb-faint)', textAlign: 'center', padding: '3px 0 5px' }}>
        spread bruto entre exchanges · 100 pontos · atualiza a cada segundo
      </div>
    </div>
  );
}
