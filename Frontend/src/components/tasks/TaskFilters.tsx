import { Input, Select, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from '@/types/tasks';

interface Props {
  search: string;
  status: string;
  priority: string;
  onSearch: (v: string) => void;
  onStatus: (v: string) => void;
  onPriority: (v: string) => void;
}

export function TaskFilters({ search, status, priority, onSearch, onStatus, onPriority }: Props) {
  return (
    <Row gutter={[8, 8]} className="mb-4">
      <Col xs={24} sm={10}>
        <Input
          placeholder="Search tasks..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={search}
          onChange={e => onSearch(e.target.value)}
          allowClear
        />
      </Col>
      <Col xs={12} sm={7}>
        <Select
          placeholder="All Statuses"
          style={{ width: '100%' }}
          value={status || undefined}
          onChange={v => onStatus(v ?? '')}
          allowClear
          options={TASK_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        />
      </Col>
      <Col xs={12} sm={7}>
        <Select
          placeholder="All Priorities"
          style={{ width: '100%' }}
          value={priority || undefined}
          onChange={v => onPriority(v ?? '')}
          allowClear
          options={TASK_PRIORITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        />
      </Col>
    </Row>
  );
}
