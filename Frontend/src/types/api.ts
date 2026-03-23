export interface ApiResponse<T = unknown> {
  status?: 'success' | 'failed';
  statuscode?: number;
  message: string;
  data?: T;
  res?: T;
}

export interface PaginatedResponse<T> {
  status?: 'success' | 'failed';
  statuscode?: number;
  message: string;
  data: T[];
  totalRecords?: number;
  currentPage?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
}

export interface ApiError {
  status?: 'failed';
  statuscode?: number;
  message: string;
}
