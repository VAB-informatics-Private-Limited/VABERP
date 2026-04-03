'use client';

import { Form, Button, Card, message, Typography, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getLeadById, updateLead } from '@/lib/api/crm';
import { LeadForm } from '@/components/crm/LeadForm';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function EditLeadPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const params = useParams();
  const leadId = Number(params.id);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: () => getLeadById(leadId),
    enabled: !!leadId,
  });

  const lead = data?.data;

  const mutation = useMutation({
    mutationFn: (values: any) => updateLead(leadId, {
      customerName:     values.customerName,
      email:            values.email,
      mobile:           values.mobile,
      businessName:     values.businessName,
      gstNumber:        values.gstNumber,
      address:          values.address,
      city:             values.city,
      state:            values.state,
      country:          values.country,
      pincode:          values.pincode,
      source:           values.source,
      expectedValue:    values.expectedValue,
      requirements:     values.requirements,
      remarks:          values.remarks,
      nextFollowupDate: values.nextFollowupDate ? dayjs(values.nextFollowupDate).format('YYYY-MM-DD') : undefined,
    }),
    onSuccess: () => {
      message.success('Lead updated');
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      router.push(`/crm/${leadId}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to update'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
        <Title level={4} className="!mb-0">Edit Lead — {lead?.lead_number}</Title>
      </div>
      <Card className="card-shadow">
        {lead && <LeadForm form={form} initial={lead} />}
        <div className="flex justify-end gap-3 mt-4">
          <Button onClick={() => router.back()}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={mutation.isPending}
            onClick={() => form.validateFields().then(v => mutation.mutate(v))}
          >
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
