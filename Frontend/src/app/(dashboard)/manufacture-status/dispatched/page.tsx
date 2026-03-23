'use client';

import { useState, useMemo } from 'react';
import {
  Typography, Input, Tag, Card, Table, Spin, Row, Col,
  Statistic, Space, Descriptions, Empty, DatePicker, Button,
  Timeline,
} from 'antd';
import {
  SearchOutlined, CheckCircleOutlined, CarOutlined,
  CalendarOutlined, UserOutlined, FileTextOutlined,
  ArrowLeftOutlined, DollarOutlined, ShoppingCartOutlined,
  ToolOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getJobCardList, getJobCardProcesses,
} from '@/lib/api/manufacturing';
import { getManufacturingPurchaseOrders } from '@/lib/api/bom';
import { useAuthStore } from '@/stores/authStore';
import { JobCard, JOB_CARD_STATUS_OPTIONS } from '@/types/manufacturing';
import { ManufacturingPO } from '@/types/bom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const fmt = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface ExpandedData {
  jobCards: JobCard[];
  stages: Record<number, any[]>;
  loading: boolean;
}

export default function DispatchedOrdersPage() {
  const router = useRouter();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [expandedData, setExpandedData] = useState<Record<number, ExpandedData>>({});
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);

  // ── Queries ──
  const { data: poData, isLoading } = useQuery({
    queryKey: ['mfg-purchase-orders', enterpriseId],
    queryFn: () => getManufacturingPurchaseOrders({ pageSize: 500 }),
    enabled: !!enterpriseId,
  });

  const { data: jobData } = useQuery({
    queryKey: ['all-job-cards', enterpriseId],
    queryFn: () => getJobCardList({ enterpriseId: enterpriseId!, pageSize: 500 }),
    enabled: !!enterpriseId,
  });

  const allJobs: JobCard[] = jobData?.data || [];
  const allPOs: ManufacturingPO[] = poData?.data || [];

  // Only POs where ALL job cards are dispatched
  const dispatchedPOs = useMemo(() => {
    return allPOs
      .map(po => {
        const jcs = allJobs.filter(j => j.sales_order_id === po.id);
        if (jcs.length === 0) return null;
        const allDispatched = jcs.every(j => j.status === 'dispatched');
        if (!allDispatched) return null;

        // Compute dispatch date as the latest completed_date among the job cards
        const dispatchDates = jcs
          .map(j => j.completed_date)
          .filter(Boolean)
          .map(d => dayjs(d));
        const lastDispatchDate = dispatchDates.length > 0
          ? dispatchDates.reduce((a, b) => (a.isAfter(b) ? a : b))
          : null;

        const totalQty = jcs.reduce((s, j) => s + Number(j.quantity || 0), 0);
        const totalCompleted = jcs.reduce((s, j) => s + Number(j.quantity_completed || 0), 0);

        return {
          ...po,
          _jobCards: jcs,
          _dispatchDate: lastDispatchDate,
          _totalQty: totalQty,
          _totalCompleted: totalCompleted,
        };
      })
      .filter(Boolean) as (ManufacturingPO & {
        _jobCards: JobCard[];
        _dispatchDate: dayjs.Dayjs | null;
        _totalQty: number;
        _totalCompleted: number;
      })[];
  }, [allPOs, allJobs]);

  // Apply filters
  const filteredPOs = useMemo(() => {
    let list = dispatchedPOs;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(po =>
        po.order_number?.toLowerCase().includes(q) ||
        po.customer_name?.toLowerCase().includes(q) ||
        po.items?.some(i => i.item_name?.toLowerCase().includes(q))
      );
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      list = list.filter(po => {
        if (!po._dispatchDate) return false;
        return po._dispatchDate.isAfter(start) && po._dispatchDate.isBefore(end);
      });
    }

    return list;
  }, [dispatchedPOs, searchText, dateRange]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = dispatchedPOs.reduce((s, po) => s + Number(po.grand_total || 0), 0);
    const totalItems = dispatchedPOs.reduce((s, po) => s + (po._jobCards?.length || 0), 0);
    const thisMonth = dispatchedPOs.filter(po =>
      po._dispatchDate && po._dispatchDate.isSame(dayjs(), 'month')
    ).length;
    return {
      total: dispatchedPOs.length,
      totalValue,
      totalItems,
      thisMonth,
    };
  }, [dispatchedPOs]);

  // Load expanded data
  const loadExpandedData = async (po: any) => {
    if (expandedData[po.id] && !expandedData[po.id].loading) return;
    setExpandedData(prev => ({ ...prev, [po.id]: { jobCards: po._jobCards, stages: {}, loading: true } }));
    try {
      const stages: Record<number, any[]> = {};
      for (const jc of po._jobCards) {
        try {
          const stageRes = await getJobCardProcesses(jc.id);
          stages[jc.id] = stageRes.data || [];
        } catch { stages[jc.id] = []; }
      }
      setExpandedData(prev => ({ ...prev, [po.id]: { jobCards: po._jobCards, stages, loading: false } }));
    } catch {
      setExpandedData(prev => ({ ...prev, [po.id]: { ...prev[po.id], loading: false } }));
    }
  };

  const handleExpand = (expanded: boolean, record: any) => {
    if (expanded) {
      setExpandedKeys(prev => [...prev, record.id]);
      loadExpandedData(record);
    } else {
      setExpandedKeys(prev => prev.filter(k => k !== record.id));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push('/manufacture-status')} />
          <Title level={4} className="!mb-0">
            <CheckCircleOutlined className="mr-2 text-green-500" />
            Dispatched Orders
          </Title>
        </div>
        <Space wrap>
          <RangePicker
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            placeholder={['Dispatch From', 'Dispatch To']}
            allowClear
          />
          <Input
            placeholder="Search PO, customer, product..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 280 }}
          />
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={12} sm={6}>
          <Card size="small" className="card-shadow" bodyStyle={{ padding: '12px 8px' }}>
            <Statistic
              title={<span className="text-xs">Total Dispatched</span>}
              value={stats.total}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="card-shadow" bodyStyle={{ padding: '12px 8px' }}>
            <Statistic
              title={<span className="text-xs">This Month</span>}
              value={stats.thisMonth}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="card-shadow" bodyStyle={{ padding: '12px 8px' }}>
            <Statistic
              title={<span className="text-xs">Total Job Cards</span>}
              value={stats.totalItems}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="card-shadow" bodyStyle={{ padding: '12px 8px' }}>
            <Statistic
              title={<span className="text-xs">Total Value</span>}
              value={stats.totalValue}
              prefix="₹"
              valueStyle={{ color: '#fa8c16', fontSize: 22 }}
              formatter={(v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            />
          </Card>
        </Col>
      </Row>

      {/* Dispatched Orders Table */}
      <Card className="card-shadow">
        {filteredPOs.length === 0 ? (
          <Empty description={searchText ? 'No matching dispatched orders.' : 'No dispatched orders yet.'} />
        ) : (
          <Table
            dataSource={filteredPOs}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpand: handleExpand,
              expandedRowRender: (record: any) => {
                const data = expandedData[record.id];
                if (!data || data.loading) return <div className="py-8 text-center"><Spin /></div>;
                const jcs: JobCard[] = data.jobCards;

                return (
                  <div className="p-4 space-y-4">
                    {/* Order Details */}
                    <Card size="small" title={<span><FileTextOutlined className="mr-2" />Order Details</span>}>
                      <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
                        <Descriptions.Item label="PO Number"><Text strong>{record.order_number}</Text></Descriptions.Item>
                        <Descriptions.Item label="Customer"><Text strong>{record.customer_name}</Text></Descriptions.Item>
                        <Descriptions.Item label="Order Date">{record.order_date ? dayjs(record.order_date).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="Expected Delivery">
                          {record.expected_delivery ? dayjs(record.expected_delivery).format('DD MMM YYYY') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Dispatch Date">
                          <Text strong className="text-green-600">
                            {record._dispatchDate ? record._dispatchDate.format('DD MMM YYYY') : '-'}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Value"><Text strong>{fmt(record.grand_total)}</Text></Descriptions.Item>
                      </Descriptions>
                      <div className="mt-3">
                        <Text strong className="text-sm block mb-1">Products:</Text>
                        {record.items.map((item: any, i: number) => (
                          <Tag key={i} className="mb-1">{item.item_name} x{item.quantity} {item.unit_of_measure || ''}</Tag>
                        ))}
                      </div>
                    </Card>

                    {/* Dispatch Details per Job Card */}
                    <Card size="small" title={<span><CarOutlined className="mr-2" />Dispatch Details</span>}>
                      <div className="space-y-3">
                        {jcs.map(jc => {
                          const stages = (data.stages[jc.id] || []).sort((a: any, b: any) => a.sequence_order - b.sequence_order);

                          return (
                            <div key={jc.id} className="border rounded-lg border-green-300 bg-green-50 overflow-hidden">
                              <div className="p-3 bg-green-100 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Button type="link" className="!p-0 font-bold" onClick={() => router.push(`/manufacturing/${jc.id}`)}>
                                    {jc.job_card_number}
                                  </Button>
                                  <Tag color="green" icon={<CheckCircleOutlined />}>DISPATCHED</Tag>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Text className="text-sm">{jc.product_name}</Text>
                                  <Text type="secondary" className="text-xs">{jc.quantity} {jc.unit || 'units'}</Text>
                                </div>
                              </div>

                              <div className="p-3">
                                <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
                                  <Descriptions.Item label="Quantity Dispatched">
                                    <Text strong>{jc.quantity_completed || jc.quantity}/{jc.quantity} {jc.unit || 'units'}</Text>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Dispatch Date">
                                    <Text strong className="text-green-600">
                                      {jc.completed_date ? dayjs(jc.completed_date).format('DD MMM YYYY, hh:mm A') : '-'}
                                    </Text>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Start Date">
                                    {jc.start_date ? dayjs(jc.start_date).format('DD MMM YYYY') : '-'}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Assigned To">
                                    {jc.assigned_to_name ? (
                                      <span><UserOutlined className="mr-1" />{jc.assigned_to_name}</span>
                                    ) : '-'}
                                  </Descriptions.Item>
                                </Descriptions>

                                {/* Production stages timeline */}
                                {stages.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-green-200">
                                    <Text strong className="text-xs block mb-2">Production Stages Completed:</Text>
                                    <div className="flex flex-wrap gap-1">
                                      {stages.map((stage: any, idx: number) => (
                                        <div key={stage.id || idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 border border-green-300 text-green-700">
                                          <CheckCircleOutlined />
                                          <span>{stage.process_name || `Stage ${idx + 1}`}</span>
                                          {stage.completed_at && (
                                            <span className="text-[10px] opacity-70">
                                              {dayjs(stage.completed_at).format('DD/MM HH:mm')}
                                            </span>
                                          )}
                                          {stage.completed_by_name && (
                                            <span className="text-[10px] opacity-70">({stage.completed_by_name})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Duration info */}
                                {jc.start_date && jc.completed_date && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    <ClockCircleOutlined className="mr-1" />
                                    Total production time: {dayjs(jc.completed_date).diff(dayjs(jc.start_date), 'day')} days
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                );
              },
            }}
            columns={[
              {
                title: 'PO Number',
                key: 'order',
                width: 160,
                render: (_, record: any) => (
                  <div>
                    <Text strong className="text-blue-600">{record.order_number}</Text>
                    <div className="text-xs text-gray-500">{record.customer_name}</div>
                  </div>
                ),
              },
              {
                title: 'Products',
                key: 'items',
                render: (_, record: any) => (
                  <div>
                    {record.items.slice(0, 2).map((item: any, i: number) => (
                      <div key={i} className="text-sm">{item.item_name} <Text type="secondary">x{item.quantity}</Text></div>
                    ))}
                    {record.items.length > 2 && <Text type="secondary" className="text-xs">+{record.items.length - 2} more</Text>}
                  </div>
                ),
              },
              {
                title: 'Dispatch Date',
                key: 'dispatchDate',
                width: 130,
                sorter: (a: any, b: any) => {
                  const da = a._dispatchDate?.valueOf() || 0;
                  const db = b._dispatchDate?.valueOf() || 0;
                  return da - db;
                },
                defaultSortOrder: 'descend',
                render: (_, record: any) => record._dispatchDate ? (
                  <Text strong className="text-green-600">
                    {record._dispatchDate.format('DD MMM YY')}
                  </Text>
                ) : '-',
              },
              {
                title: 'Job Cards',
                key: 'jobCards',
                width: 90,
                render: (_, record: any) => (
                  <Tag color="green">{record._jobCards.length} dispatched</Tag>
                ),
              },
              {
                title: 'Quantity',
                key: 'qty',
                width: 120,
                render: (_, record: any) => (
                  <Text>{record._totalCompleted}/{record._totalQty} units</Text>
                ),
              },
              {
                title: 'Value',
                key: 'value',
                width: 130,
                render: (_, record: any) => (
                  <Text strong>{fmt(record.grand_total)}</Text>
                ),
              },
              {
                title: 'Action',
                key: 'actions',
                width: 100,
                render: (_, record: any) => (
                  <Button size="small" icon={<FileTextOutlined />} onClick={() => router.push(`/purchase-orders/${record.id}`)}>
                    View PO
                  </Button>
                ),
              },
            ]}
            rowClassName={() => 'bg-green-50'}
          />
        )}
      </Card>
    </div>
  );
}
