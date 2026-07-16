import { useState } from 'react';

// Fixed, validated status palette (run through the colorblind-safety +
// contrast checks) — amber/violet/indigo/red map 1:1 to the same statuses
// used everywhere else in the app (StatusBadge, stat cards).
const FILL_CLASSES = {
  amber: 'fill-amber-600',
  violet: 'fill-violet-500',
  indigo: 'fill-indigo-700',
  red: 'fill-red-600',
};

const CHART_HEIGHT = 200;
const BASELINE_Y = CHART_HEIGHT - 28;
const BAR_WIDTH = 28;
const SLOT_WIDTH = 100;

const StatusBarChart = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotHeight = BASELINE_Y - 24;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${data.length * SLOT_WIDTH} ${CHART_HEIGHT}`}
        className="w-full text-slate-200"
        style={{ height: CHART_HEIGHT }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Order status breakdown bar chart"
      >
        <line
          x1="0"
          y1={BASELINE_Y}
          x2={data.length * SLOT_WIDTH}
          y2={BASELINE_Y}
          stroke="currentColor"
          strokeWidth="1"
        />
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / max) * plotHeight);
          const cx = i * SLOT_WIDTH + SLOT_WIDTH / 2;
          const x = cx - BAR_WIDTH / 2;
          const y = BASELINE_Y - barHeight;
          return (
            <g
              key={d.key}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barHeight}
                rx="4"
                className={`${FILL_CLASSES[d.tone]} transition-opacity ${
                  hoverIndex !== null && hoverIndex !== i ? 'opacity-60' : 'opacity-100'
                }`}
              />
              <text
                x={cx}
                y={y - 8}
                textAnchor="middle"
                className="fill-slate-700 text-[11px] font-semibold"
              >
                {d.value}
              </text>
              <text
                x={cx}
                y={CHART_HEIGHT - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-medium"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
          style={{
            left: `${((hoverIndex + 0.5) / data.length) * 100}%`,
            top: `${((BASELINE_Y - Math.max(2, (data[hoverIndex].value / max) * plotHeight)) / CHART_HEIGHT) * 100}%`,
          }}
        >
          {data[hoverIndex].label}: {data[hoverIndex].value}
        </div>
      )}
    </div>
  );
};

export default StatusBarChart;
