'use client';

import { useState } from 'react';
import { Typography, message, Spin, Alert, Button, Modal, Input, Tag } from 'antd';
import { LockOutlined, HistoryOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuotationBuilder } from '@/components/quotations/QuotationBuilder';
import { getQuotationById, updateQuotation } from '@/lib/api/quotations';
import { useAuthStore } from '@/stores/authStore';
import { QuotationFormData } from '@/types/quotation';

const { Title, Text } = Typography;

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = Number(params.id);
  const queryClient = useQueryClient();
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();

  // Change notes state — shown in a modal before saving
  const [pendingFormData, setPendingFormData] = useState<QuotationFormData | null>(null);
  const [changeNotesModalOpen, setChangeNotesModalOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => getQuotationById(quotationId, enterpriseId!),
    enabled: !!enterpriseId && !!quotationId,
  });

  const mutation = useMutation({
    mutationFn: ({ formData, notes }: { formData: QuotationFormData; notes?: string }) =>
      updateQuotation({
        ...formData,
        id: quotationId,
        enterprise_id: enterpriseId!,
        change_notes: notes || undefined,
      }),
    onSuccess: () => {
      message.success('Quotation revised successfully — new version saved');
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      router.push(`/quotations/${quotationId}`);
    },
    onError: () => {
      message.error('Failed to save revision');
    },
  });

  // Called when QuotationBuilder submits — intercept to show change notes modal
  const handleFormSubmit = (formData: QuotationFormData) => {
    setPendingFormData(formData);
    setChangeNotes('');
    setChangeNotesModalOpen(true);
  };

  const handleConfirmRevision = () => {
    if (!pendingFormData) return;
    mutation.mutate({ formData: pendingFormData, notes: changeNotes || undefined });
    setChangeNotesModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="text-center py-8">
        <Title level={4}>Quotation not found</Title>
      </div>
    );
  }

  if (data.data.is_locked) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <Alert
          type="error"
          icon={<LockOutlined />}
          showIcon
          message="Quotation is Locked"
          description={
            <div>
              <p className="mt-1">
                This quotation has been accepted and converted to a Purchase Order. It cannot be revised.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Button onClick={() => router.push(`/quotations/${quotationId}`)}>
                  View Quotation
                </Button>
                {data.data.sales_order_id && (
                  <Button type="primary" onClick={() => router.push(`/purchase-orders/${data.data!.sales_order_id}`)}>
                    View Purchase Order
                  </Button>
                )}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  const quotation = data.data;
  const nextVersion = (quotation.current_version ?? 1) + 1;

  return (
    <div>
      {/* Header with version info */}
      <div className="flex items-center gap-3 mb-6">
        <Title level={4} className="!mb-0">
          Revise: {quotation.quotation_number}
        </Title>
        <Tag color="default" icon={<HistoryOutlined />}>
          Current: v{quotation.current_version}
        </Tag>
        <Tag color="purple" icon={<HistoryOutlined />}>
          Saving as: v{nextVersion}
        </Tag>
      </div>

      <Alert
        type="info"
        showIcon
        className="mb-4"
        message={`You are creating revision v${nextVersion} of ${quotation.quotation_number}.`}
        description="The current version will be archived and a new version will be saved. You can optionally add change notes to describe what was revised."
      />

      <QuotationBuilder
        initialData={quotation}
        onSubmit={handleFormSubmit}
        loading={mutation.isPending}
        submitText={`Save as v${nextVersion}`}
        isEdit
      />

      {/* Change notes modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-purple-500" />
            <span>Save Revision v{nextVersion}</span>
          </div>
        }
        open={changeNotesModalOpen}
        onOk={handleConfirmRevision}
        onCancel={() => setChangeNotesModalOpen(false)}
        okText={`Save v${nextVersion}`}
        cancelText="Go Back"
        confirmLoading={mutation.isPending}
        okButtonProps={{ type: 'primary' }}
      >
        <div className="space-y-3">
          <Text type="secondary">
            The current version <strong>v{quotation.current_version}</strong> will be archived and a
            new version <strong>v{nextVersion}</strong> will become the active quotation.
          </Text>
          <div>
            <Text strong className="block mb-1">
              Change Notes <Text type="secondary">(optional)</Text>
            </Text>
            <Input.TextArea
              rows={3}
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe what was changed in this revision (e.g. Updated pricing, Added 2 items, Revised delivery terms...)"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
