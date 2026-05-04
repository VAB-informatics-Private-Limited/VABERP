'use client';

import {
  Card, Tag, Typography, Table, Tooltip, Divider,
  Button, Timeline, Space, Statistic, Row, Col, Empty, Spin, Badge, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, FileTextOutlined, MailOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UserOutlined, PhoneOutlined, LinkOutlined,
  FilePdfOutlined, DollarOutlined, CalendarOutlined, TrophyOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getRFQById, getRFQComparison, getVendorPDFUrl } from '@/lib/api/rfqs';
import type { RfqDetail } from '@/lib/api/rfqs';
import type { RfqComparison } from '@/types/rfq';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'default' },
  sent:  { label: 'Sent',  color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
};

const VENDOR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'orange' },
  responded: { label: 'Responded', color: 'green' },
  rejected:  { label: 'Rejected',  color: 'red' },
};

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeColor(badge: string | null) {
  if (!badge) return 'default';
  if (badge === 'Caution') return 'warning';
  if (badge === 'Fastest') return 'blue';
  if (badge === 'Recommended') return 'purple';
  if (badge === 'Best Price') return 'success';
  return 'default';
}

export default function RfqDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const { data: rfq, isLoading } = useQuery({
    queryKey: ['rfq-detail', id],
    queryFn: () => getRFQById(Number(id)),
  });

  const respondedCount = rfq?.vendors.filter((v) => v.status === 'responded').length ?? 0;
  const showComparison = respondedCount >= 2;

  const { data: comparison } = useQuery<RfqComparison>({
    queryKey: ['rfq-comparison-detail', id],
    queryFn: () => getRFQComparison(Number(id)),
    enabled: showComparison,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!rfq) return null;

  const respondedVendors = rfq.vendors.filter((v) => v.status === 'responded');
  const pendingVendors   = rfq.vendors.filter((v) => v.status === 'pending');
  const hasQuotes        = respondedVendors.length > 0;
  const isSingleMaterial = rfq.rows.length === 1;

  // ── Comparison table ──────────────────────────────────────────────────────
  // Sort rows alphabetically
  const sortedRows = [...rfq.rows].sort((a, b) =>
    a.item_name.localeCompare(b.item_name),
  );

  // Find lowest line_total per row (only among assigned vendors with a price)
  const rowMins: Record<number, number | null> = {};
  for (const row of sortedRows) {
    const prices = Object.entries(row.vendor_prices)
      .filter(([, vp]) => vp.line_total !== null)
      .map(([, vp]) => vp.line_total as number);
    rowMins[row.indent_item_id] = prices.length >= 2 ? Math.min(...prices) : null;
  }

  // Lowest grand total among responded vendors (for highlighting)
  const grandTotals = respondedVendors
    .map((v) => v.grand_total)
    .filter((t) => t > 0);
  const minGrandTotal = grandTotals.length >= 2 ? Math.min(...grandTotals) : null;

  // Build comparison columns
  const comparisonColumns: any[] = [
    {
      title: 'Material',
      dataIndex: 'item_name',
      key: 'item_name',
      fixed: 'left' as const,
      width: 220,
      render: (text: string, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{text}</Text>
          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
            Qty: {record.quantity} {record.unit || ''}
          </div>
        </div>
      ),
    },
    ...rfq.vendors.map((vendor) => {
      const cmpVendor = comparison?.vendors.find((cv) => cv.id === vendor.id);
      return {
        title: (
          <div style={{ textAlign: 'center', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{vendor.supplier_name}</div>
            <Tag
              color={VENDOR_STATUS_CONFIG[vendor.status]?.color || 'default'}
              style={{ marginTop: 3, fontSize: 11 }}
            >
              {VENDOR_STATUS_CONFIG[vendor.status]?.label || vendor.status}
            </Tag>
            {isSingleMaterial && cmpVendor?.score !== null && cmpVendor?.score !== undefined && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                Score: <strong>{cmpVendor.score}</strong>/100
              </div>
            )}
            {isSingleMaterial && cmpVendor?.badge && (
              <Tooltip title={cmpVendor.hint || ''}>
                <Tag
                  color={badgeColor(cmpVendor.badge)}
                  style={{ marginTop: 3, cursor: 'default', fontSize: 11 }}
                >
                  {cmpVendor.badge}
                </Tag>
              </Tooltip>
            )}
            {vendor.delivery_days != null && (
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                🚚 {vendor.delivery_days} days
              </div>
            )}
          </div>
        ),
        key: `vendor_${vendor.id}`,
        width: 170,
        align: 'right' as const,
        render: (_: any, record: any) => {
          const vp = record.vendor_prices?.[vendor.id];
          const isAssigned = vp !== undefined;
          const isLowest =
            isAssigned &&
            vp?.line_total !== null &&
            rowMins[record.indent_item_id] !== null &&
            vp?.line_total === rowMins[record.indent_item_id];

          if (!isAssigned) {
            return (
              <span style={{ fontSize: 11, color: '#bfbfbf' }}>—</span>
            );
          }
          if (vp?.unit_price === null || vp?.unit_price === undefined) {
            return <Text type="secondary" style={{ fontSize: 12 }}>No quote</Text>;
          }
          return (
            <div
              style={{
                padding: '4px 6px',
                borderRadius: 4,
                background: isLowest ? '#f6ffed' : undefined,
              }}
            >
              <div style={{ fontSize: 12, color: '#555' }}>
                {fmt(vp.unit_price)}<span style={{ fontSize: 10, color: '#aaa' }}>/unit</span>
                {vp.tax_percent != null && vp.tax_percent > 0 && (
                  <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>+{vp.tax_percent}%</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isLowest ? '#52c41a' : '#1677ff',
                  marginTop: 1,
                }}
              >
                {fmt(vp.line_total)}
                {isLowest && <span style={{ fontSize: 10, marginLeft: 4 }}>★ Best</span>}
              </div>
            </div>
          );
        },
      };
    }),
  ];

  // Add grand total as a summary row by appending to sortedRows
  const tableData: any[] = sortedRows;

  // ── Timeline ──────────────────────────────────────────────────────────────
  const timelineItems = [
    {
      dot: <FileTextOutlined style={{ color: 'var(--color-primary)' }} />,
      children: (
        <div>
          <Text strong>RFQ Created</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {rfq.created_date ? dayjs(rfq.created_date).format('DD MMM YYYY, hh:mm A') : '—'}
          </Text>
        </div>
      ),
    },
    rfq.sent_date && {
      dot: <MailOutlined style={{ color: '#52c41a' }} />,
      children: (
        <div>
          <Text strong>Emails Sent to {rfq.vendors.length} vendor(s)</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(rfq.sent_date).format('DD MMM YYYY, hh:mm A')}
          </Text>
        </div>
      ),
    },
    ...respondedVendors.map((v) => ({
      dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      children: (
        <div>
          <Text>
            <Text strong>{v.supplier_name}</Text> submitted quote
          </Text>
          {(v.delivery_days != null || v.grand_total > 0) && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {v.delivery_days != null && `Delivery: ${v.delivery_days} days`}
                {v.delivery_days != null && v.grand_total > 0 && ' · '}
                {v.grand_total > 0 && `Total: ${fmt(v.grand_total)}`}
              </Text>
            </>
          )}
        </div>
      ),
    })),
    pendingVendors.length > 0 && {
      dot: <ClockCircleOutlined style={{ color: '#faad14' }} />,
      children: (
        <div>
          <Text type="warning">
            Awaiting response from {pendingVendors.length} vendor(s)
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {pendingVendors.map((v) => v.supplier_name).join(', ')}
          </Text>
        </div>
      ),
    },
    rfq.status === 'completed' && {
      dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      children: (
        <Text strong style={{ color: '#52c41a' }}>
          RFQ Completed
        </Text>
      ),
    },
  ].filter(Boolean) as any[];

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Title level={3} className="!mb-0">{rfq.rfq_number}</Title>
            <Tag color={STATUS_CONFIG[rfq.status]?.color || 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>
              {STATUS_CONFIG[rfq.status]?.label || rfq.status}
            </Tag>
          </div>
          {rfq.indent_number && (
            <div className="flex items-center gap-1 mt-1">
              <LinkOutlined style={{ color: '#aaa', fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                Indent:{' '}
                <span
                  onClick={() => router.push(`/procurement/indents/${rfq.indent_id}`)}
                  style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
                >
                  {rfq.indent_number}
                </span>
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <Row gutter={16} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Total Vendors" value={rfq.vendors.length} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Responded"
              value={respondedVendors.length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Pending"
              value={pendingVendors.length}
              valueStyle={pendingVendors.length > 0 ? { color: '#faad14' } : undefined}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Materials" value={rfq.indent_items.length} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      {comparison?.is_urgent && (
        <Alert
          type="warning"
          showIcon
          message="Urgent Order — delivery speed is weighted 70% in scoring"
          className="mb-4"
        />
      )}

      <Row gutter={16}>

        {/* Left — Timeline + Vendor Cards */}
        <Col xs={24} lg={8}>

          {/* Timeline */}
          <Card title="Activity Timeline" size="small" className="mb-4">
            <Timeline items={timelineItems} style={{ marginTop: 8 }} />
          </Card>

          {/* Vendor Cards */}
          <Card title="Vendor Details" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {rfq.vendors.map((v) => {
                const cmpVendor = comparison?.vendors.find((cv) => cv.id === v.id);
                const isLowestTotal = minGrandTotal !== null && v.grand_total === minGrandTotal && v.grand_total > 0;
                return (
                  <Card
                    key={v.id}
                    size="small"
                    style={{
                      border: `1px solid ${v.status === 'responded' ? '#b7eb8f' : v.status === 'rejected' ? '#ffa39e' : '#ffd591'}`,
                      background: v.status === 'responded' ? '#f6ffed' : v.status === 'rejected' ? '#fff1f0' : '#fffbe6',
                    }}
                    bodyStyle={{ padding: '10px 12px' }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Text strong style={{ fontSize: 13 }}>{v.supplier_name}</Text>
                          <Tag
                            color={VENDOR_STATUS_CONFIG[v.status]?.color || 'default'}
                            style={{ fontSize: 11 }}
                          >
                            {VENDOR_STATUS_CONFIG[v.status]?.label || v.status}
                          </Tag>
                          {isSingleMaterial && cmpVendor?.badge && (
                            <Tooltip title={cmpVendor.hint || ''}>
                              <Tag
                                color={badgeColor(cmpVendor.badge)}
                                style={{ fontSize: 11 }}
                              >
                                {cmpVendor.badge}
                              </Tag>
                            </Tooltip>
                          )}
                        </div>
                        <div className="mt-1 space-y-1" style={{ fontSize: 12, color: '#555' }}>
                          {v.supplier_email && (
                            <div><MailOutlined className="mr-1" />{v.supplier_email}</div>
                          )}
                          {v.contact_person && (
                            <div><UserOutlined className="mr-1" />{v.contact_person}</div>
                          )}
                          {v.phone && (
                            <div><PhoneOutlined className="mr-1" />{v.phone}</div>
                          )}
                          {v.email_sent_at && (
                            <div style={{ color: '#888' }}>
                              <MailOutlined className="mr-1" />
                              Sent: {dayjs(v.email_sent_at).format('DD MMM YYYY')}
                            </div>
                          )}
                          {v.delivery_days != null && (
                            <div>
                              <ClockCircleOutlined className="mr-1" />
                              Delivery: <strong>{v.delivery_days} days</strong>
                            </div>
                          )}
                          {v.status === 'responded' && v.grand_total > 0 && (
                            <div>
                              <DollarOutlined className="mr-1" />
                              Total:{' '}
                              <strong style={{ color: isLowestTotal ? '#52c41a' : '#1677ff' }}>
                                {fmt(v.grand_total)}
                              </strong>
                              {isLowestTotal && (
                                <TrophyOutlined style={{ color: '#faad14', marginLeft: 4 }} />
                              )}
                            </div>
                          )}
                          {isSingleMaterial && cmpVendor?.score !== null && cmpVendor?.score !== undefined && (
                            <div style={{ color: '#888' }}>
                              Score: <strong>{cmpVendor.score}</strong>/100
                            </div>
                          )}
                          {v.notes && (
                            <div style={{ color: '#888', fontStyle: 'italic' }}>"{v.notes}"</div>
                          )}
                        </div>
                      </div>
                      {v.quote_pdf_path && (
                        <Tooltip title="View PDF Quote">
                          <Button
                            type="link"
                            size="small"
                            icon={<FilePdfOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />}
                            href={getVendorPDFUrl(rfq.id, v.id)}
                            target="_blank"
                            style={{ padding: 0 }}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </Card>
                );
              })}
            </Space>
          </Card>
        </Col>

        {/* Right — Price Comparison + Items */}
        <Col xs={24} lg={16}>

          {/* Items list (always shown) */}
          <Card
            title={`Materials in this RFQ (${rfq.indent_items.length})`}
            size="small"
            className="mb-4"
          >
            <Table
              dataSource={[...rfq.indent_items].sort((a, b) => a.item_name.localeCompare(b.item_name))}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Material',
                  dataIndex: 'item_name',
                  key: 'item_name',
                  render: (name: string) => <Text strong>{name}</Text>,
                },
                {
                  title: 'Qty',
                  key: 'qty',
                  width: 100,
                  align: 'right' as const,
                  render: (_: any, r: any) => `${r.quantity} ${r.unit || ''}`,
                },
              ]}
            />
          </Card>

          {/* Price comparison */}
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                Price Comparison
                {respondedVendors.length > 0 && (
                  <Tag color="blue">{respondedVendors.length} quote(s) received</Tag>
                )}
              </Space>
            }
            size="small"
          >
            {!hasQuotes ? (
              <Empty
                description={
                  <span>
                    No vendor quotes received yet.{' '}
                    {pendingVendors.length > 0 && `Waiting on ${pendingVendors.length} vendor(s).`}
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th
                          style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            border: '1px solid #e8e8e8',
                            fontWeight: 600,
                            minWidth: 180,
                          }}
                        >
                          Material
                        </th>
                        <th
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            border: '1px solid #e8e8e8',
                            fontWeight: 600,
                            width: 80,
                          }}
                        >
                          Qty
                        </th>
                        {rfq.vendors.map((vendor) => {
                          const cmpVendor = comparison?.vendors.find((cv) => cv.id === vendor.id);
                          return (
                            <th
                              key={vendor.id}
                              style={{
                                padding: '10px 12px',
                                textAlign: 'center',
                                border: '1px solid #e8e8e8',
                                fontWeight: 600,
                                minWidth: 150,
                              }}
                            >
                              <div>{vendor.supplier_name}</div>
                              <Tag
                                color={VENDOR_STATUS_CONFIG[vendor.status]?.color || 'default'}
                                style={{ marginTop: 3, fontSize: 11 }}
                              >
                                {VENDOR_STATUS_CONFIG[vendor.status]?.label || vendor.status}
                              </Tag>
                              {isSingleMaterial && cmpVendor?.score !== null && cmpVendor?.score !== undefined && (
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                                  Score: <strong>{cmpVendor.score}</strong>/100
                                </div>
                              )}
                              {isSingleMaterial && cmpVendor?.badge && (
                                <Tooltip title={cmpVendor.hint || ''}>
                                  <Tag
                                    color={badgeColor(cmpVendor.badge)}
                                    style={{ marginTop: 3, cursor: 'default', fontSize: 11 }}
                                  >
                                    {cmpVendor.badge}
                                  </Tag>
                                </Tooltip>
                              )}
                              {vendor.delivery_days != null && (
                                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                                  🚚 {vendor.delivery_days} days
                                </div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => {
                        const minTotal = rowMins[row.indent_item_id];
                        return (
                          <tr key={row.indent_item_id}>
                            <td style={{ padding: '8px 12px', border: '1px solid #e8e8e8' }}>
                              <Text strong style={{ fontSize: 13 }}>{row.item_name}</Text>
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                textAlign: 'right',
                                border: '1px solid #e8e8e8',
                                color: '#555',
                              }}
                            >
                              {row.quantity} {row.unit || ''}
                            </td>
                            {rfq.vendors.map((vendor) => {
                              const vp = row.vendor_prices?.[vendor.id];
                              const isAssigned = vp !== undefined;
                              const isLowest =
                                isAssigned &&
                                vp?.line_total !== null &&
                                minTotal !== null &&
                                vp?.line_total === minTotal;

                              if (!isAssigned) {
                                return (
                                  <td
                                    key={vendor.id}
                                    style={{
                                      padding: '8px 12px',
                                      textAlign: 'center',
                                      border: '1px solid #e8e8e8',
                                      background: '#fafafa',
                                    }}
                                  >
                                    <span style={{ fontSize: 11, color: '#bfbfbf' }}>—</span>
                                  </td>
                                );
                              }

                              if (vp?.unit_price === null || vp?.unit_price === undefined) {
                                return (
                                  <td
                                    key={vendor.id}
                                    style={{
                                      padding: '8px 12px',
                                      textAlign: 'center',
                                      border: '1px solid #e8e8e8',
                                    }}
                                  >
                                    <Text type="secondary" style={{ fontSize: 12 }}>No quote</Text>
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={vendor.id}
                                  style={{
                                    padding: '8px 12px',
                                    textAlign: 'right',
                                    border: '1px solid #e8e8e8',
                                    background: isLowest ? '#f6ffed' : undefined,
                                  }}
                                >
                                  <div style={{ fontSize: 12, color: '#666' }}>
                                    {fmt(vp.unit_price)}
                                    <span style={{ fontSize: 10, color: '#aaa' }}>/unit</span>
                                    {vp.tax_percent != null && vp.tax_percent > 0 && (
                                      <span style={{ fontSize: 10, color: '#888', marginLeft: 4 }}>
                                        +{vp.tax_percent}%
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: isLowest ? '#52c41a' : '#1677ff',
                                    }}
                                  >
                                    {fmt(vp.line_total)}
                                    {isLowest && (
                                      <span style={{ fontSize: 10, marginLeft: 4, color: '#52c41a' }}>
                                        ★
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Grand Total row */}
                      <tr style={{ background: '#f5f5f5', fontWeight: 600 }}>
                        <td
                          colSpan={2}
                          style={{ padding: '10px 12px', border: '1px solid #e8e8e8', fontSize: 13 }}
                        >
                          Grand Total
                        </td>
                        {rfq.vendors.map((vendor) => {
                          const total = vendor.grand_total;
                          const isLowestTotal =
                            minGrandTotal !== null && total === minGrandTotal && total > 0;
                          return (
                            <td
                              key={vendor.id}
                              style={{
                                padding: '10px 12px',
                                textAlign: 'right',
                                border: '1px solid #e8e8e8',
                                background: isLowestTotal ? '#f6ffed' : '#f5f5f5',
                              }}
                            >
                              {total > 0 ? (
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: isLowestTotal ? '#52c41a' : '#1677ff',
                                  }}
                                >
                                  {fmt(total)}
                                  {isLowestTotal && (
                                    <span style={{ fontSize: 10, marginLeft: 4 }}>★</span>
                                  )}
                                </span>
                              ) : (
                                <Text type="secondary">—</Text>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {respondedVendors.length < rfq.vendors.length && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                    <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                    {rfq.vendors.length - respondedVendors.length} vendor(s) have not responded yet.
                    Comparison shows only received quotes.
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Notes */}
          {rfq.notes && (
            <Card title="Notes" size="small" className="mt-4">
              <Text>{rfq.notes}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
