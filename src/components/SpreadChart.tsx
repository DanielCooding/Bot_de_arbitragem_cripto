'use client';

import { useEffect, useRef, useCallback } from 'react';

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
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const pointsRef  = useRef<SpreadPoint[]>([]);

  // Atualiza a ref dos pontos sempre que history/symbol muda
  useEffect(() => {
    pointsRef.current = history
      .filter(h => h.symbol === symbol)
      .slice(-120);
  }, [history, symbol]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta resolução para DPI do monitor
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const W = rect.width;
    const H = rect.height;
    const PL = 56, PR = 20, PT = 16, PB = 28;
    const cW = W - PL - PR;
    const cH = H - PT - PB;

    ctx.clearRect(0, 0, W, H);

    const pts = pointsRef.current;

    if (pts.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aguardando dados...', W / 2, H / 2);
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const maxVal = Math.max(...pts.map(p => p.spreadPct), threshold * 1.5, 0.005);
    const minVal = 0;
    const range  = maxVal - minVal || 0.001;

    const toX = (i: number) => PL + (i / (pts.length - 1)) * cW;
    const toY = (v: number) => PT + (1 - (v - minVal) / range) * cH;

    // ----- fundo -----
    ctx.fillStyle = '#1C2030';
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 6);
    ctx.fill();

    // ----- grid horizontal -----
    const yTicks = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'right';
    for (let i = 0; i <= yTicks; i++) {
      const v = minVal + (i / yTicks) * range;
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(PL, y);
      ctx.lineTo(W - PR, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(4) + '%', PL - 4, y + 3);
    }

    // ----- eixo X (tempo) -----
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'center';
    ctx.font = '9px monospace';
    const xStep = Math.max(1, Math.floor(pts.length / 6));
    for (let i = 0; i < pts.length; i += xStep) {
      const x = toX(i);
      const t = new Date(pts[i].timestamp);
      ctx.fillText(`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`, x, H - 6);
    }

    // ----- linha do threshold -----
    const thY = toY(threshold);
    if (thY >= PT && thY <= PT + cH) {
      ctx.strokeStyle = 'rgba(240,185,11,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(PL, thY);
      ctx.lineTo(W - PR, thY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(240,185,11,0.5)';
      ctx.textAlign = 'left';
      ctx.font = '9px monospace';
      ctx.fillText(`min ${threshold}%`, W - PR + 2, thY + 3);
    }

    // ----- área preenchida -----
    const grad = ctx.createLinearGradient(0, PT, 0, PT + cH);
    grad.addColorStop(0,   'rgba(240,185,11,0.20)');
    grad.addColorStop(1,   'rgba(240,185,11,0.01)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(pts[0].spreadPct));
    for (let i = 1; i < pts.length; i++) {
      // curva suave com bezier
      const x0 = toX(i - 1), y0 = toY(pts[i-1].spreadPct);
      const x1 = toX(i),     y1 = toY(pts[i].spreadPct);
      const cpX = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
    ctx.lineTo(toX(pts.length - 1), PT + cH);
    ctx.lineTo(PL, PT + cH);
    ctx.closePath();
    ctx.fill();

    // ----- linha principal -----
    ctx.strokeStyle = '#F0B90B';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(240,185,11,0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(pts[0].spreadPct));
    for (let i = 1; i < pts.length; i++) {
      const x0 = toX(i - 1), y0 = toY(pts[i-1].spreadPct);
      const x1 = toX(i),     y1 = toY(pts[i].spreadPct);
      const cpX = (x0 + x1) / 2;
      ctx.bezierCurveTo(cpX, y0, cpX, y1, x1, y1);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ----- pontos de oportunidade -----
    pts.forEach((p, i) => {
      if (!p.isOpportunity) return;
      ctx.beginPath();
      ctx.arc(toX(i), toY(p.spreadPct), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#F0B90B';
      ctx.fill();
      ctx.strokeStyle = '#0B0E11';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // ----- ponto atual (pulsante via opacidade) -----
    const last = pts[pts.length - 1];
    const lx = toX(pts.length - 1);
    const ly = toY(last.spreadPct);
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    ctx.beginPath();
    ctx.arc(lx, ly, 4 + pulse * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(240,185,11,${0.15 + pulse * 0.1})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#F0B90B';
    ctx.fill();

    // ----- label do valor atual -----
    ctx.fillStyle = '#F0B90B';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    const label = last.spreadPct.toFixed(5) + '%';
    const lxLabel = lx + 8 > W - PR - 70 ? lx - 75 : lx + 8;
    ctx.fillText(label, lxLabel, ly + 4);

    rafRef.current = requestAnimationFrame(draw);
  }, [threshold]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div style={{ background: 'var(--bnb-surface)', border: '1px solid var(--bnb-border)', borderRadius: 4, padding: 0, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '200px', display: 'block' }}
      />
      <div style={{ fontSize: 10, color: 'var(--bnb-faint)', textAlign: 'center', padding: '4px 0 6px' }}>
        Spread bruto entre exchanges · atualiza a cada segundo · threshold: {threshold}%
      </div>
    </div>
  );
}
