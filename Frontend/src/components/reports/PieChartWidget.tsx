'use client';

import { Card } from 'antd';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PieDataItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartWidgetProps {
  data: PieDataItem[];
  title: string;
  showLegend?: boolean;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

export function PieChartWidget({ data, title, showLegend = true }: PieChartWidgetProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!data.length || total === 0) {
    return (
      <Card title={title} className="card-shadow h-full">
        <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#999' }}>No data available</span>
        </div>
      </Card>
    );
  }

  return (
    <Card title={title} className="card-shadow h-full">
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#8884d8', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value, 'Count']}
              contentStyle={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}
            />
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                align="center"
                formatter={(value, entry) => (
                  <span style={{ color: '#333' }}>
                    {value} ({((entry.payload?.value / total) * 100).toFixed(1)}%)
                  </span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
