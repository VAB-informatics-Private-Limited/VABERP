'use client';

import { Form, Button, Card, message, Typography } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createLead } from '@/lib/api/crm';
import { LeadForm } from '@/components/crm/LeadForm';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function AddLeadPage() {
  const [form] = Form.useForm();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (values: any) => createLead({
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
    onSuccess: (res) => {
      message.success('Lead created successfully');
      if (res.data?.id) router.push(`/crm/${res.data.id}`);
      else router.push('/crm');
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to create lead'),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
        <Title level={4} className="!mb-0">New Lead</Title>
      </div>
      <Card className="card-shadow">
        <LeadForm form={form} />
        <div className="flex justify-end gap-3 mt-4">
          <Button onClick={() => router.back()}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={mutation.isPending}
            onClick={() => form.validateFields().then(v => mutation.mutate(v))}
          >
            Create Lead
          </Button>
        </div>
      </Card>
    </div>
  );
}
