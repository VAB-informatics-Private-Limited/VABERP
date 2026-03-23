'use client';

import { Input, Button, Space, DatePicker, Select } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dayjs } from 'dayjs';
import { InterestStatus, INTEREST_STATUS_OPTIONS } from '@/types/enquiry';
import { getSources } from '@/lib/api/sources';

const { RangePicker } = DatePicker;

interface EnquiryFiltersProps {
  onSearch: (filters: {
    customerName?: string;
    customerMobile?: string;
    interestStatus?: InterestStatus;
    source?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  onClear: () => void;
}

export function EnquiryFilters({ onSearch, onClear }: EnquiryFiltersProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [status, setStatus] = useState<InterestStatus | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data: sourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: () => getSources(),
  });
  const sourceOptions = (sourcesData?.data || [])
    .filter((s) => s.is_active)
    .map((s) => ({ value: s.source_name, label: s.source_name }));

  const handleSearch = () => {
    onSearch({
      customerName: name || undefined,
      customerMobile: mobile || undefined,
      interestStatus: status,
      source: source,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
      endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
    });
  };

  const handleClear = () => {
    setName('');
    setMobile('');
    setStatus(undefined);
    setSource(undefined);
    setDateRange(null);
    onClear();
  };

  return (
    <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
      <Space wrap>
        <Input
          placeholder="Search by name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: 180 }}
          onPressEnter={handleSearch}
          prefix={<SearchOutlined />}
          allowClear
        />
        <Input
          placeholder="Search by mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          style={{ width: 150 }}
          onPressEnter={handleSearch}
          allowClear
        />
        <Select
          placeholder="Interest Status"
          value={status}
          onChange={setStatus}
          style={{ width: 160 }}
          allowClear
        >
          {INTEREST_STATUS_OPTIONS.map((s) => (
            <Select.Option key={s.value} value={s.value}>
              {s.label}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Lead Source"
          value={source}
          onChange={setSource}
          style={{ width: 150 }}
          allowClear
        >
          {sourceOptions.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates)}
          format="DD-MM-YYYY"
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          Search
        </Button>
        <Button icon={<ClearOutlined />} onClick={handleClear}>
          Clear
        </Button>
      </Space>
    </div>
  );
}
