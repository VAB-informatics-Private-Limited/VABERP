'use client';

import { useState } from 'react';
import {
  Card, Timeline, Tag, Typography, Button, Drawer,
  Table, Divider, Descriptions, Badge, Tooltip,
} from 'antd';
import {
  HistoryOutlined, EyeOutlined, ClockCircleOutlined,
  UserOutlined, FileTextOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { QuotationVersion, QuotationVersionItem } from '@/types/quotation';

const { Text, Title } = Typography;

const fmt = (n: number | undefined) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const STATUS_COLORS: Record<string, string> = {
  draft: 'default', sent: 'blue', accepted: 'green',
  rejected: 'red', expired: 'orange',
};

// Columns reference camelCase keys — matching backend JSONB snapshot shape
const snapshotItemColumns: ColumnsType<QuotationVersionItem> = [
  { title: '#', key: 'index', width: 45, render: (_, __, i) => i + 1 },
  { title: 'Product', dataIndex: 'itemName', key: 'itemName' },
  { title: 'HSN', dataIndex: 'hsnCode', key: 'hsnCode', render: (v) => v || '-' },
  { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
  {
    title: 'Unit Price',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    render: (v) => fmt(v),
  },
  {
    title: 'Disc %',
    dataIndex: 'discountPercent',
    key: 'discountPercent',
    render: (v) => (v ? `${v}%` : '-'),
  },
  {
    title: 'Tax %',
    dataIndex: 'taxPercent',
    key: 'taxPercent',
    render: (v) => (v ? `${v}%` : '-'),
  },
  {
    title: 'Line Total',
    dataIndex: 'lineTotal',
    key: 'lineTotal',
    render: (v) => <b>{fmt(v)}</b>,
  },
];

interface Props {
  versions: QuotationVersion[];
  currentVersion: number;
  quotationNumber: string;
}

export default function QuotationVersionHistory({ versions, currentVersion, quotationNumber }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<QuotationVersion | null>(null);

  const openDrawer = (v: QuotationVersion) => {
    setSelected(v);
    setDrawerOpen(true);
  };

  const snap = selected?.snapshot;
  const totalVersions = versions.length + 1; // archived + current

  return (
    <>
      <Card
        className="mt-4 print:hidden"
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-blue-500" />
            <span className="font-semibold">Revision History</span>
            <Tag color="blue" className="ml-1">
              {totalVersions} version{totalVersions !== 1 ? 's' : ''}
            </Tag>
          </div>
        }
      >
        <Timeline
          mode="left"
          items={[
            // ── CURRENT (active) version — always shown first ──────────────
            {
              dot: (
                <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-green-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  v{currentVersion}
                </div>
              ),
              children: (
                <Card
                  size="small"
                  className="mb-2 border-green-300 bg-green-50"
                  style={{ borderLeft: '4px solid #52c41a' }}
                >
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text strong className="text-green-700">
                          {quotationNumber} — Version {currentVersion}
                        </Text>
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          Latest · Active
                        </Tag>
                      </div>
                      <Text type="secondary" className="text-xs">
                        This is the current revision shown above
                      </Text>
                    </div>
                    <Badge status="processing" text={<span className="text-green-600 font-medium text-xs">LIVE</span>} />
                  </div>
                </Card>
              ),
            },

            // ── Archived previous versions ─────────────────────────────────
            ...versions.map((v) => ({
              dot: (
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">
                  v{v.version_number}
                </div>
              ),
              children: (
                <Card
                  size="small"
                  className="mb-2 hover:shadow-md transition-shadow bg-gray-50"
                  style={{ borderLeft: '3px solid #d9d9d9' }}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text strong className="text-gray-600">
                          {quotationNumber} — Version {v.version_number}
                        </Text>
                        <Tag color="default">Archived</Tag>
                        <Tag color={STATUS_COLORS[v.snapshot.status] || 'default'}>
                          {v.snapshot.status}
                        </Tag>
                        <Text className="text-blue-600 font-semibold text-sm">
                          {fmt(v.snapshot.grandTotal)}
                        </Text>
                      </div>

                      <div className="flex items-center gap-3 text-gray-400 text-xs flex-wrap">
                        <span className="flex items-center gap-1">
                          <ClockCircleOutlined />
                          Saved on {fmtDate(v.changed_at)}
                        </span>
                        {v.changed_by_name && (
                          <span className="flex items-center gap-1">
                            <UserOutlined />
                            {v.changed_by_name}
                          </span>
                        )}
                        {v.change_notes && (
                          <Tooltip title={v.change_notes}>
                            <span className="flex items-center gap-1 text-orange-500 cursor-help">
                              <FileTextOutlined />
                              Change note
                            </span>
                          </Tooltip>
                        )}
                      </div>

                      <Text type="secondary" className="text-xs">
                        {v.snapshot.items?.length || 0} item
                        {(v.snapshot.items?.length || 0) !== 1 ? 's' : ''}
                        &nbsp;·&nbsp;Subtotal {fmt(v.snapshot.subTotal)}
                        {v.snapshot.discountAmount && Number(v.snapshot.discountAmount) > 0
                          ? ` · Disc −${fmt(v.snapshot.discountAmount)}`
                          : ''}
                        {v.snapshot.taxAmount && Number(v.snapshot.taxAmount) > 0
                          ? ` · Tax ${fmt(v.snapshot.taxAmount)}`
                          : ''}
                      </Text>
                    </div>

                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => openDrawer(v)}
                    >
                      View
                    </Button>
                  </div>
                </Card>
              ),
            })),
          ]}
        />
      </Card>

      {/* ── Full snapshot drawer ─────────────────────────────────────────── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <HistoryOutlined />
            <span>
              {quotationNumber} — Version {selected?.version_number}
            </span>
            {snap && (
              <>
                <Tag color="default">Archived</Tag>
                <Tag color={STATUS_COLORS[snap.status] || 'default'}>{snap.status}</Tag>
              </>
            )}
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={820}
        extra={
          selected && (
            <Text type="secondary" className="text-sm">
              Saved {fmtDate(selected.changed_at)}
              {selected.changed_by_name ? ` by ${selected.changed_by_name}` : ''}
            </Text>
          )
        }
      >
        {snap && (
          <>
            {selected?.change_notes && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <Text strong>Change Notes: </Text>
                <Text>{selected.change_notes}</Text>
              </div>
            )}

            <Descriptions
              title="Quotation Details"
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              className="mb-4"
            >
              <Descriptions.Item label="Customer">{snap.customerName}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[snap.status] || 'default'}>{snap.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Quotation Date">
                {snap.quotationDate ? new Date(snap.quotationDate).toLocaleDateString('en-IN') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Valid Until">
                {snap.validUntil ? new Date(snap.validUntil).toLocaleDateString('en-IN') : '—'}
              </Descriptions.Item>
              {snap.email && <Descriptions.Item label="Email">{snap.email}</Descriptions.Item>}
              {snap.mobile && <Descriptions.Item label="Mobile">{snap.mobile}</Descriptions.Item>}
              {snap.billingAddress && (
                <Descriptions.Item label="Billing Address" span={2}>{snap.billingAddress}</Descriptions.Item>
              )}
              {snap.shippingAddress && (
                <Descriptions.Item label="Shipping Address" span={2}>{snap.shippingAddress}</Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} className="mb-2">Line Items</Title>
            <Table
              columns={snapshotItemColumns}
              dataSource={snap.items || []}
              rowKey={(_, i) => String(i)}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />

            <div className="flex justify-end mt-4">
              <div className="w-72 space-y-1">
                <div className="flex justify-between py-1 border-b text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{fmt(snap.subTotal)}</span>
                </div>
                {Number(snap.discountAmount) > 0 && (
                  <div className="flex justify-between py-1 border-b text-sm text-red-600">
                    <span>
                      Discount
                      {snap.discountType === 'percentage' && snap.discountValue
                        ? ` (${snap.discountValue}%)`
                        : ''}
                    </span>
                    <span>−{fmt(snap.discountAmount)}</span>
                  </div>
                )}
                {Number(snap.taxAmount) > 0 && (
                  <div className="flex justify-between py-1 border-b text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span>{fmt(snap.taxAmount)}</span>
                  </div>
                )}
                {Number(snap.shippingCharges) > 0 && (
                  <div className="flex justify-between py-1 border-b text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span>{fmt(snap.shippingCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-bold text-base border-t">
                  <span>Grand Total</span>
                  <span className="text-blue-700">{fmt(snap.grandTotal)}</span>
                </div>
              </div>
            </div>

            {snap.notes && (
              <>
                <Divider />
                <Title level={5}>Notes</Title>
                <Text type="secondary" className="whitespace-pre-wrap">{snap.notes}</Text>
              </>
            )}
            {snap.termsConditions && (
              <>
                <Divider />
                <Title level={5}>Terms & Conditions</Title>
                <Text type="secondary" className="whitespace-pre-wrap">{snap.termsConditions}</Text>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
