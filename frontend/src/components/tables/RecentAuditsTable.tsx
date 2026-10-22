'use client';

import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ExternalLink, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export interface AuditRow {
  id: string;
  domain: string;
  status: string;
  overallScore: number | null;
  issuesCount: number;
  completedAt: string | null;
}

const columnHelper = createColumnHelper<AuditRow>();

const columns = [
  columnHelper.accessor('domain', {
    header: 'Website Domain',
    cell: (info) => (
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue();
      if (status === 'COMPLETED') {
        return (
          <span className="badge badge-success">
            <CheckCircle size={12} /> Completed
          </span>
        );
      }
      if (status === 'CRAWLING' || status === 'ANALYZING' || status === 'QUEUED') {
        return (
          <span className="badge badge-low">
            <Clock size={12} /> In Progress
          </span>
        );
      }
      return (
        <span className="badge badge-critical">
          <AlertTriangle size={12} /> Failed
        </span>
      );
    },
  }),
  columnHelper.accessor('overallScore', {
    header: 'Health Score',
    cell: (info) => {
      const score = info.getValue();
      if (score === null || score === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--medium)' : 'var(--critical)';
      return (
        <span style={{ fontWeight: 700, color, fontSize: '15px' }}>
          {score}/100
        </span>
      );
    },
  }),
  columnHelper.accessor('issuesCount', {
    header: 'Issues Found',
    cell: (info) => <span>{info.getValue()} findings</span>,
  }),
  columnHelper.accessor('completedAt', {
    header: 'Completed At',
    cell: (info) => {
      const val = info.getValue();
      return val ? new Date(val).toLocaleDateString() : 'In Progress';
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <Link
        href={`/audits/${info.row.original.id}`}
        className="btn btn-secondary btn-sm"
        style={{ padding: '4px 10px', fontSize: '12px' }}
      >
        <span>View Report</span>
        <ExternalLink size={12} />
      </Link>
    ),
  }),
];

interface Props {
  data: AuditRow[];
}

export function RecentAuditsTable({ data }: Props) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No recent audit jobs found. Start an audit to see results.
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
