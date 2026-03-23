'use client';

import { Input, Button, Space, DatePicker } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface CustomerFiltersProps {
  onSearch: (filters: {
    customerName?: string;
    customerMobile?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  onClear: () => void;
}

export function CustomerFilters({ onSearch, onClear }: CustomerFiltersProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const handleSearch = () => {
    onSearch({
      customerName: name || undefined,
      customerMobile: mobile || undefined,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
      endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
    });
  };

  const handleClear = () => {
    setName('');
    setMobile('');
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
          style={{ width: 200 }}
          onPressEnter={handleSearch}
        />
        <Input
          placeholder="Search by mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          style={{ width: 160 }}
          onPressEnter={handleSearch}
        />
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
