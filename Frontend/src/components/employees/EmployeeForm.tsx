'use client';

import { Form, Input, Select, Button, Row, Col, Card, DatePicker } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { getDropdownDepartment, getDropdownDesignationByDeptId } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { EmployeeDetails } from '@/types/employee';
import { MenuPermissions } from '@/types/auth';
import { PermissionsTable } from './PermissionsTable';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const employeeSchema = z.object({
  department_id: z.number({ required_error: 'Please select a department' }),
  designation_id: z.number({ required_error: 'Please select a designation' }),
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  phone_number: z.string().min(10, 'Phone number must be 10 digits'),
  hire_date: z.string().min(1, 'Hire date is required'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  reporting_to: z.number().nullable().optional(),
  reporting_manager_id: z.number().nullable().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: EmployeeDetails;
  onSubmit: (data: EmployeeFormValues, permissions?: MenuPermissions) => void;
  loading?: boolean;
  submitText?: string;
  isEdit?: boolean;
  showPermissions?: boolean;
  employeeOptions?: { value: number; label: string }[];
}

export function EmployeeForm({
  initialData,
  onSubmit,
  loading,
  submitText = 'Save Employee',
  isEdit = false,
  showPermissions = false,
  employeeOptions = [],
}: EmployeeFormProps) {
  const [permissions, setPermissions] = useState<MenuPermissions>({});
  const { getEnterpriseId } = useAuthStore();
  const enterpriseId = getEnterpriseId();
  const [selectedDepartment, setSelectedDepartment] = useState<number | undefined>(initialData?.department_id);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      department_id: initialData?.department_id,
      designation_id: initialData?.designation_id,
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      email: initialData?.email || '',
      phone_number: initialData?.phone_number || '',
      hire_date: initialData?.hire_date || '',
      status: initialData?.status || 'active',
      reporting_to: initialData?.reporting_to ?? null,
      reporting_manager_id: initialData?.reporting_manager_id ?? null,
    },
  });

  const watchDepartmentId = watch('department_id');

  useEffect(() => {
    if (watchDepartmentId !== selectedDepartment) {
      setSelectedDepartment(watchDepartmentId);
      if (!initialData || watchDepartmentId !== initialData.department_id) {
        setValue('designation_id', undefined as unknown as number);
      }
    }
  }, [watchDepartmentId, selectedDepartment, setValue, initialData]);

  const { data: departments } = useQuery({
    queryKey: ['departments-dropdown', enterpriseId],
    queryFn: () => getDropdownDepartment(enterpriseId!),
    enabled: !!enterpriseId,
  });

  const { data: designations } = useQuery({
    queryKey: ['designations-dropdown', enterpriseId, selectedDepartment],
    queryFn: () => getDropdownDesignationByDeptId(enterpriseId!, selectedDepartment!),
    enabled: !!enterpriseId && !!selectedDepartment,
  });

  return (
    <Form layout="vertical" onFinish={handleSubmit((data) => onSubmit(data, showPermissions ? permissions : undefined))}>
      <Card title="Employee Information" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="First Name"
              required
              validateStatus={errors.first_name ? 'error' : ''}
              help={errors.first_name?.message}
            >
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter first name" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Last Name"
              required
              validateStatus={errors.last_name ? 'error' : ''}
              help={errors.last_name?.message}
            >
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="Enter last name" size="large" />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Email"
              required
              validateStatus={errors.email ? 'error' : ''}
              help={errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="email@example.com" size="large" />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Phone Number"
              required
              validateStatus={errors.phone_number ? 'error' : ''}
              help={errors.phone_number?.message}
            >
              <Controller
                name="phone_number"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="10-digit phone" size="large" maxLength={10} />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        {!isEdit && (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Password"
                validateStatus={errors.password ? 'error' : ''}
                help={errors.password?.message}
              >
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input.Password {...field} placeholder="Enter password" size="large" />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Card>

      <Card title="Department & Role" className="mb-4">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Department"
              required
              validateStatus={errors.department_id ? 'error' : ''}
              help={errors.department_id?.message}
            >
              <Controller
                name="department_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="Select department"
                    size="large"
                    showSearch
                    optionFilterProp="children"
                  >
                    {departments?.data?.map((dept) => (
                      <Select.Option key={dept.id} value={dept.id}>
                        {dept.department_name}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Designation"
              required
              validateStatus={errors.designation_id ? 'error' : ''}
              help={errors.designation_id?.message}
            >
              <Controller
                name="designation_id"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    placeholder="Select designation"
                    size="large"
                    showSearch
                    optionFilterProp="children"
                    disabled={!selectedDepartment}
                  >
                    {designations?.data?.map((des) => (
                      <Select.Option key={des.id} value={des.id}>
                        {des.designation_name}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Hire Date"
              required
              validateStatus={errors.hire_date ? 'error' : ''}
              help={errors.hire_date?.message}
            >
              <Controller
                name="hire_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(date) => field.onChange(date?.format('YYYY-MM-DD') || '')}
                    className="w-full"
                    size="large"
                    format="DD-MM-YYYY"
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Status"
              validateStatus={errors.status ? 'error' : ''}
              help={errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select {...field} size="large">
                    <Select.Option value="active">Active</Select.Option>
                    <Select.Option value="inactive">Inactive</Select.Option>
                  </Select>
                )}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Reports To (Manager)">
              <Controller
                name="reporting_to"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value ?? null}
                    onChange={(val) => field.onChange(val ?? null)}
                    placeholder="Select manager (optional)"
                    size="large"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={employeeOptions}
                  />
                )}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {showPermissions && (
        <Card title="Module Permissions" className="mb-4">
          <PermissionsTable permissions={permissions} onChange={setPermissions} />
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button size="large" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="primary" htmlType="submit" size="large" loading={loading}>
          {submitText}
        </Button>
      </div>
    </Form>
  );
}
