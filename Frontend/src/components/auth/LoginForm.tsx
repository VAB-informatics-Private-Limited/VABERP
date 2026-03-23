'use client';

import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { employeeLogin, getPermissions } from '@/lib/api';
import { normalizePermissions } from '@/lib/api/employees';
import { useAuthStore } from '@/stores/authStore';
import { Employee, MenuPermissions } from '@/types';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { login, setPermissions } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const response = await employeeLogin(data);

      if (response.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loginData = response.data as any;

        // Map backend camelCase response to frontend snake_case Employee type
        const mappedUser: Employee = {
          id: loginData.user.id,
          enterprise_id: loginData.user.enterpriseId,
          department_id: loginData.user.departmentId,
          designation_id: loginData.user.designationId,
          first_name: loginData.user.firstName,
          last_name: loginData.user.lastName,
          email: loginData.user.email,
          phone_number: loginData.user.phoneNumber,
          hire_date: loginData.user.hireDate,
          created_date: loginData.user.createdDate,
          status: loginData.user.status,
        };
        login(mappedUser, 'employee', loginData.token);

        // Set permissions if returned with login
        if (loginData.permissions) {
          setPermissions(normalizePermissions(loginData.permissions as MenuPermissions));
        } else {
          // Fetch permissions separately
          try {
            const permResponse = await getPermissions();
            if (permResponse.data) {
              setPermissions(normalizePermissions(permResponse.data));
            }
          } catch (err) {
            console.warn('Could not fetch permissions:', err);
          }
        }

        message.success(response.message || 'Login successful!');
        router.push('/dashboard');
      } else {
        message.error(response.message || 'Invalid email or password');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item
        label="Email"
        validateStatus={errors.email ? 'error' : ''}
        help={errors.email?.message}
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="Enter your email"
              size="large"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Password"
        validateStatus={errors.password ? 'error' : ''}
        help={errors.password?.message}
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Enter your password"
              size="large"
            />
          )}
        />
      </Form.Item>

      <Form.Item className="mb-0 mt-6">
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Sign In
        </Button>
      </Form.Item>
    </Form>
  );
}
