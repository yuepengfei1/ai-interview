"use client";

interface RadarChartProps {
  data: { label: string; value: number }[]; // value 0-10
  size?: number;
}

/**
 * 纯 SVG 雷达图（无额外依赖）
 */
export default function RadarChart({ data, size = 320 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const n = data.length;

  const point = (i: number, r: number) => {
    // 从顶部开始，顺时针
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  // 数据 polygon
  const dataPoints = data
    .map((d, i) => {
      const normalized = Math.max(0, Math.min(1, d.value / 10));
      const [x, y] = point(i, radius * normalized);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* 背景圆/多边形 */}
      {gridLevels.map((lv, idx) => {
        const pts = data
          .map((_, i) => {
            const [x, y] = point(i, radius * lv);
            return `${x},${y}`;
          })
          .join(" ");
        return (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {/* 轴线 */}
      {data.map((_, i) => {
        const [x, y] = point(i, radius);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {/* 数据 polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(99, 102, 241, 0.25)"
        stroke="#6366f1"
        strokeWidth={2}
      />

      {/* 数据点 */}
      {data.map((d, i) => {
        const normalized = Math.max(0, Math.min(1, d.value / 10));
        const [x, y] = point(i, radius * normalized);
        return <circle key={i} cx={x} cy={y} r={4} fill="#6366f1" />;
      })}

      {/* 标签 */}
      {data.map((d, i) => {
        const [x, y] = point(i, radius * 1.18);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-slate-600 font-medium"
          >
            {d.label}
            <tspan x={x} dy="14" className="fill-indigo-600 text-sm font-bold">
              {d.value.toFixed(1)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
