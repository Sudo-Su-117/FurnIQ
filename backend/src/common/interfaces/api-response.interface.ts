export interface ApiResponse<T = any> {
  error: boolean;
  statusCode: number;
  statuscode?: number;
  message: string;
  data: T;
  timestamp?: string;
}

export interface PaginatedData<T = any> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

