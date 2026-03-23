'use client';

import { Card } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface BarDataItem {
  name: string;
  [key: string]: string | number;
}

interface BarConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface BarChartWidgetProps {
  data: BarDataItem[];
  bars: BarConfig[];
  title: string;
  xAxisKey?: string;
  layout?: 'horizontal' | 'vertical';
}

export function BarChartWidget({
  data,
  bars,
  title,
  xAxisKey = 'name',
  layout = 'vertical',
}: BarChartWidgetProps) {
  return (
    <Card title={title} className="card-shadow h-full">
      <div style={{ width: '100%', height: Math.max(300, data.length * 50) }}>
        <ResponsiveContainer>
          <BarChart
            layout={layout}
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            {layout === 'vertical' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  width={100}
                />
              </>
            ) : (
              <>
                <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              </>
            )}
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}
            />
            <Legend />
            {bars.map((bar, index) => (
              <Bar key={index} dataKey={bar.dataKey} name={bar.name} fill={bar.color} barSize={20} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
