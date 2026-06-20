# 🤖 Bot de Arbitragem Cripto

Monitor de arbitragem em tempo real entre **Binance**, **KuCoin** e **Kraken**.

## ✨ Funcionalidades

- 📊 Preços em tempo real via Server-Sent Events (atualiza a cada 5s)
- 🔥 Detecção automática de oportunidades de arbitragem
- 🔔 Alertas automáticos quando o spread ultrapassa o threshold configurado
- 📈 Gráfico de histórico de spread por par
- ⚙️ Threshold de alerta configurável pelo usuário
- Pares monitorados: BTC, ETH, SOL, XRP (todos em USDT)

## 🚀 Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** (gráficos)
- APIs públicas: Binance REST, KuCoin REST, Kraken REST

## 🛠️ Setup

```bash
git clone https://github.com/DanielCooding/Bot_de_arbitragem_cripto.git
cd Bot_de_arbitragem_cripto
npm install
npm run dev
```

Acesse: http://localhost:3000

> Nenhuma chave de API é necessária — o bot usa apenas endpoints públicos de leitura de preços.

## 📊 Como funciona

```
Binance REST  ┬
KuCoin  REST  ├─► detectOpportunities() ─► SSE /api/stream ─► Dashboard
Kraken  REST  ┘
```

O spread é calculado como:

```
spread (%) = (preço_alto - preço_baixo) / preço_baixo * 100
```

## 📁 Estrutura

```
src/
├── app/
│   ├── page.tsx              ← Dashboard principal
│   └── api/
│       ├── prices/route.ts   ← Endpoint REST
│       └── stream/route.ts   ← SSE tempo real
├── lib/
│   ├── arbitrage.ts          ← Lógica de spread
│   ├── binance.ts
│   ├── kucoin.ts
│   └── kraken.ts
└── components/
    ├── PriceTable.tsx
    ├── SpreadChart.tsx
    ├── AlertBanner.tsx
    ├── ThresholdControl.tsx
    └── StatusBar.tsx
```

## 📝 Licença

MIT
