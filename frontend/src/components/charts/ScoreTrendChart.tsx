'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface TrendDataPoint {
  date: string;
  overall: number;
  seo: number;
  performance: number;
  health: number;
  security: number;
}

interface Props {
  data: TrendDataPoint[];
}

export function ScoreTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No historical audit runs recorded yet. Complete an audit to view trend metrics.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
          <Line
            type="monotone"
            dataKey="overall"
            name="Overall Score"
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="seo"
            name="Technical SEO"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="performance"
            name="Performance"
            stroke="#f59e0b"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="health"
            name="Tech Health"
            stroke="#6366f1"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="security"
            name="Security"
            stroke="#ec4899"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
