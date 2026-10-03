export type ActivityMetric = {
  label: string;
  value: string;
  delta?: string;
  tone?: 'blue' | 'violet' | 'gold' | 'teal';
};

const DEFAULT_METRICS: ActivityMetric[] = [
  { label: 'Active Nurses', value: '1,248', delta: '+12%', tone: 'blue' },
  { label: 'Partner Hospitals', value: '86', delta: '+3%', tone: 'violet' },
  { label: 'Shifts Filled', value: '3,620', delta: '+10%', tone: 'gold' },
  { label: 'Average Rating', value: '4.8', delta: '+6%', tone: 'teal' },
];

const DEFAULT_CHART = [18, 28, 24, 36, 42, 48, 58, 72];

/** Presentational glass card — defaults are illustrative, not live production data. */
export function AuthPlatformActivity({
  metrics = DEFAULT_METRICS,
  chartPoints = DEFAULT_CHART,
}: {
  metrics?: ActivityMetric[];
  chartPoints?: number[];
}) {
  const width = 520;
  const height = 72;
  const max = Math.max(...chartPoints, 1);
  const min = Math.min(...chartPoints, 0);
  const range = Math.max(max - min, 1);
  const coords = chartPoints.map((point, index) => {
    const x = (index / Math.max(chartPoints.length - 1, 1)) * width;
    const y = height - ((point - min) / range) * (height - 12) - 6;
    return `${x},${y}`;
  });
  const line = coords.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  const last = chartPoints[chartPoints.length - 1];
  const lastX = width;
  const lastY =
    height - ((last - min) / range) * (height - 12) - 6;

  return (
    <div className="auth-activity" aria-label="Illustrative platform activity">
      <div className="auth-activity-head">
        <p className="auth-activity-title">Platform Activity</p>
        <span className="auth-activity-badge" title="Sample illustration only">
          Illustrative
        </span>
      </div>

      <div className="auth-activity-metrics">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="auth-activity-metric"
            data-tone={metric.tone ?? 'blue'}
          >
            <span className="auth-activity-metric-dot" aria-hidden="true" />
            <div>
              <p className="auth-activity-metric-value">
                {metric.value}
                {metric.delta ? (
                  <span className="auth-activity-metric-delta">{metric.delta}</span>
                ) : null}
              </p>
              <p className="auth-activity-metric-label">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="auth-activity-chart" aria-hidden="true">
        <svg viewBox={`0 0 ${width} ${height}`} className="auth-activity-svg">
          <defs>
            <linearGradient id="authChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5c518" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#authChartFill)" />
          <polyline
            points={line}
            fill="none"
            stroke="#f5c518"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={lastX} cy={lastY} r="5" fill="#f5c518" />
          <g transform={`translate(${Math.max(lastX - 54, 0)}, ${Math.max(lastY - 28, 0)})`}>
            <rect width="48" height="20" rx="6" fill="#f5c518" />
            <text
              x="24"
              y="14"
              textAnchor="middle"
              fill="#0b1f33"
              fontSize="10"
              fontWeight="700"
            >
              {String(last)}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
