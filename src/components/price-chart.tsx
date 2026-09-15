import { formatPrice } from "@/lib/format";

export type PriceChartPoint = { changedAt: string | Date | number; newPrice: number };

const W = 600;
const H = 160;
const PAD_X = 10;
const PAD_TOP = 18;
const PAD_BOTTOM = 12;

export function PriceChart({ history }: { history: PriceChartPoint[] }) {
  if (history.length < 2) return null;

  const points = history.map((h) => ({ t: new Date(h.changedAt).getTime(), y: h.newPrice }));

  const minX = Math.min(...points.map((p) => p.t));
  const maxX = Math.max(...points.map((p) => p.t));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p) => {
    const px = PAD_X + ((p.t - minX) / rangeX) * innerW;
    const py = PAD_TOP + (1 - (p.y - minY) / rangeY) * innerH;
    return { px, py, y: p.y };
  });

  const polyline = coords.map((c) => `${c.px.toFixed(2)},${c.py.toFixed(2)}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-hidden
        className="h-40 w-full"
      >
        <polyline
          points={polyline}
          fill="none"
          stroke="#0f766e"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last.px} cy={last.py} r="4" fill="#0f766e" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Min. {formatPrice(minY)}</span>
        <span className="font-semibold text-para-700">Actuel {formatPrice(last.y)}</span>
        <span>Max. {formatPrice(maxY)}</span>
      </div>
    </div>
  );
}