'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface SeverityItem {
  severity: string;
  count: number;
}

interface Props {
  data: SeverityItem[];
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--critical)',
  HIGH: 'var(--high)',
  MEDIUM: 'var(--medium)',
  LOW: 'var(--low)',
  INFO: 'var(--info)',
};

export function SeverityBarChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No issues found.</div>;
  }

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
          <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
          <YAxis
            type="category"
            dataKey="severity"
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || 'var(--primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
