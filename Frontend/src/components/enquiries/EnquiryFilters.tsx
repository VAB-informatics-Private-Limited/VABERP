'use client';

import { Input, Button, Space, DatePicker, Select } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
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
  // One unified search box — backend matches name / email / mobile / business name
  const [search, setSearch] = useState('');
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

  const fire = (
    overrides: Partial<{
      search: string;
      status: InterestStatus | undefined;
      source: string | undefined;
      dateRange: [Dayjs | null, Dayjs | null] | null;
    }> = {},
  ) => {
    const q = overrides.search ?? search;
    const s = overrides.status !== undefined ? overrides.status : status;
    const src = overrides.source !== undefined ? overrides.source : source;
    const dr = overrides.dateRange !== undefined ? overrides.dateRange : dateRange;
    // The backend takes a single `search` param that matches across customer_name,
    // email, mobile, and business_name. Frontend `getEnquiryList` already collapses
    // customerName || customerMobile into that param, so we pass the query as
    // customerName (first non-empty) and leave customerMobile undefined.
    onSearch({
      customerName: q || undefined,
      customerMobile: undefined,
      interestStatus: s,
      source: src,
      startDate: dr?.[0]?.format('YYYY-MM-DD') || undefined,
      endDate: dr?.[1]?.format('YYYY-MM-DD') || undefined,
    });
  };

  // Debounce auto-search on the text input so typing doesn't flood the API.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fire(), 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleClear = () => {
    setSearch('');
    setStatus(undefined);
    setSource(undefined);
    setDateRange(null);
    onClear();
  };

  return (
    <div className="bg-white p-4 rounded-lg mb-4 card-shadow">
      <Space wrap>
        <Input
          placeholder="Search by name, mobile or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
          onPressEnter={() => fire()}
          prefix={<SearchOutlined />}
          allowClear
        />
        <Select
          placeholder="Interest Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            fire({ status: v });
          }}
          style={{ width: 160 }}
          allowClear
        >
          {INTEREST_STATUS_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Lead Source"
          value={source}
          onChange={(v) => {
            setSource(v);
            fire({ source: v });
          }}
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
          onChange={(dates) => {
            setDateRange(dates);
            fire({ dateRange: dates });
          }}
          format="DD-MM-YYYY"
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => fire()}>
          Search
        </Button>
        <Button icon={<ClearOutlined />} onClick={handleClear}>
          Clear
        </Button>
      </Space>
    </div>
  );
}
