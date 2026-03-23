'use client';

import { Card } from 'antd';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunnelDataItem {
  name: string;
  value: number;
  fill: string;
}

interface SalesFunnelProps {
  data: FunnelDataItem[];
  title?: string;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

export function SalesFunnel({ data, title = 'Sales Pipeline' }: SalesFunnelProps) {
  return (
    <Card title={title} className="card-shadow h-full">
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <FunnelChart>
            <Tooltip
              formatter={(value: number) => [value, 'Count']}
              contentStyle={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}
            />
            <Funnel
              dataKey="value"
              data={data}
              isAnimationActive
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                position="right"
                fill="#000"
                stroke="none"
                dataKey="name"
                fontSize={12}
              />
              <LabelList
                position="center"
                fill="#fff"
                stroke="none"
                dataKey="value"
                fontSize={14}
                fontWeight="bold"
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
