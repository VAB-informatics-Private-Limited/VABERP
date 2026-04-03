'use client';

import { Modal, Select, Form, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignableEmployees, assignLead } from '@/lib/api/crm';
import { CrmLead } from '@/types/crm';

interface Props {
  open: boolean;
  lead: CrmLead | null;
  onClose: () => void;
}

export function AssignLeadModal({ open, lead, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: teamData } = useQuery({
    queryKey: ['crm-team-assignable'],
    queryFn: getAssignableEmployees,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: number }) =>
      assignLead(id, assignedTo),
    onSuccess: () => {
      message.success('Lead assigned successfully');
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      onClose();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Failed to assign lead'),
  });

  const team = teamData?.data || [];

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!lead) return;
      mutation.mutate({ id: lead.id, assignedTo: values.assignedTo });
    });
  };

  return (
    <Modal
      title={`Assign Lead — ${lead?.lead_number}`}
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose(); }}
      confirmLoading={mutation.isPending}
      okText="Assign"
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item name="assignedTo" label="Assign To" rules={[{ required: true, message: 'Please select an employee' }]}>
          <Select
            placeholder="Select team member"
            showSearch
            optionFilterProp="label"
            options={team.map(e => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
