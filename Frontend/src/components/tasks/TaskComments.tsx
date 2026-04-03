'use client';

import { useState } from 'react';
import { Input, Button, Avatar, message as antMessage } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addTaskComment } from '@/lib/api/tasks';
import { TaskComment } from '@/types/tasks';

interface Props {
  taskId: number;
  comments: TaskComment[];
}

export function TaskComments({ taskId, comments }: Props) {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (comment: string) => addTaskComment(taskId, comment),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: () => antMessage.error('Failed to add comment'),
  });

  return (
    <div>
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No comments yet</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: '#2563eb', flexShrink: 0 }}>
              {c.created_by_name?.charAt(0).toUpperCase()}
            </Avatar>
            <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700">{c.created_by_name ?? `#${c.created_by}`}</span>
                <span className="text-xs text-gray-400">
                  {new Date(c.created_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-sm text-gray-700 m-0 whitespace-pre-wrap">{c.comment}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input.TextArea
          rows={2}
          placeholder="Write a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); if (text.trim()) mutation.mutate(text.trim()); } }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={mutation.isPending}
          disabled={!text.trim()}
          onClick={() => mutation.mutate(text.trim())}
        />
      </div>
    </div>
  );
}
