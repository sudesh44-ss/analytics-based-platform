'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface Props {
  distribution: {
    open: number;
    fixed: number;
    ignored: number;
    reopened: number;
  };
}

const COLORS = ['#ef4444', '#10b981', '#64748b', '#f59e0b'];

export function IssueLifecyclePieChart({ distribution }: Props) {
  const data = [
    { name: 'Open', value: distribution.open },
    { name: 'Fixed', value: distribution.fixed },
    { name: 'Ignored', value: distribution.ignored },
    { name: 'Reopened', value: distribution.reopened },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No issues tracked.</div>;
  }

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
