'use client';

import { Typography, Table, Tag, Card, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getStageMasters } from '@/lib/api/stage-masters';
import { StageMaster } from '@/types/stage-master';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function StagesPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['stage-masters'],
    queryFn: getStageMasters,
  });

  const stages = (data?.data || []).filter((s: StageMaster) => s.is_active);

  const columns: ColumnsType<StageMaster> = [
    {
      title: '#',
      dataIndex: 'sort_order',
      width: 60,
      sorter: (a, b) => a.sort_order - b.sort_order,
    },
    {
      title: 'Stage Name',
      dataIndex: 'stage_name',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/manufacturing')} />
        <Title level={4} className="!mb-0">Manufacturing Stages</Title>
      </div>

      <Card className="card-shadow">
        <p className="text-gray-500 mb-4">
          These stages are used when creating job cards from a BOM. To add or edit stages, go to{' '}
          <Button type="link" className="p-0" onClick={() => router.push('/settings/stage-master')}>
            Settings &gt; Stage Master
          </Button>.
        </p>
        <Table
          columns={columns}
          dataSource={stages}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
