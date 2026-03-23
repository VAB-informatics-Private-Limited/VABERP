'use client';

import { Card, Empty } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = ['#1677ff', '#722ed1', '#fa8c16', '#f5222d', '#2f54eb', '#13c2c2'];

interface PipelineData {
  name: string;
  value: number;
}

interface SalesPipelineChartProps {
  data?: PipelineData[];
  loading?: boolean;
}

export function SalesPipelineChart({ data = [], loading = false }: SalesPipelineChartProps) {
  return (
    <Card
      title="Sales Pipeline"
      className="card-shadow h-full"
      loading={loading}
    >
      {data.length === 0 ? (
        <Empty description="No pipeline data yet" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 13 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
              }}
              formatter={(value: number) => [value, 'Count']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
