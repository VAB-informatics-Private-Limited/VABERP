import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import {
  JobCard,
  JobCardFormData,
  JobCardListParams,
  JobCardProgress,
  JobCardStageHistory,
  StageProgress,
  ProcessTemplate,
  ProcessTemplateFormData,
  JobCardProcess,
  JobCardProcessFormData,
  JobCardStatus,
} from '@/types/manufacturing';

// Helper functions to map backend camelCase to frontend snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPriorityFromNumber(priority: number): 'low' | 'medium' | 'high' | 'urgent' {
  switch (priority) {
    case 1: return 'urgent';
    case 2: return 'high';
    case 3: return 'medium';
    default: return 'low';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJobCardFromBackend(data: any): JobCard {
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    job_card_number: data.jobNumber,
    job_name: data.jobName,
    parent_job_card_id: data.parentJobCardId,
    stage_number: data.stageNumber,
    child_job_cards: (data.childJobCards || []).map(mapJobCardFromBackend),
    selected_materials: data.selectedMaterials,
    product_id: data.productId,
    product_name: data.product?.productName,
    product_code: data.product?.productCode,
    customer_id: data.customerId,
    customer_name: data.customer?.customerName || data.customerName || undefined,
    order_id: data.quotationId,
    order_number: data.purchaseOrder?.orderNumber || data.quotation?.quotationNumber,
    sales_order_id: data.purchaseOrderId,
    quantity: Number(data.quantity),
    unit: data.product?.unitOfMeasure,
    start_date: data.startDate,
    due_date: data.expectedCompletion,
    completed_date: data.actualCompletion,
    priority: mapPriorityFromNumber(data.priority),
    status: (data.status || 'pending') as JobCardStatus,
    assigned_to: data.assignedTo,
    assigned_to_name: data.assignedEmployee?.firstName
      ? `${data.assignedEmployee.firstName} ${data.assignedEmployee.lastName || ''}`.trim()
      : undefined,
    remarks: data.notes,
    // New production tracking fields
    estimated_production_days: data.estimatedProductionDays ?? undefined,
    quantity_completed: Number(data.quantityCompleted || 0),
    shortage_notes: data.shortageNotes ?? undefined,
    dispatch_on_hold: data.dispatchOnHold || false,
    production_stage: data.productionStage || '',
    material_status: data.materialStatus || 'PENDING_INVENTORY',
    material_request_id: data.materialRequestId || undefined,
    material_request_number: data.materialRequestNumber || undefined,
    material_request_status: data.materialRequestStatus || undefined,
    stage_progress: (data.stageProgress || data.stages || []).map((s: any) => ({
      id: s.id,
      stage_master_id: s.stageMasterId,
      stage_name: s.stageName,
      description: s.description,
      sort_order: s.sortOrder,
      status: s.status || 'pending',
      start_time: s.startTime,
      end_time: s.endTime,
      actual_hours: s.actualHours,
      completed_by: s.completedBy,
      completed_by_name: s.completedByEmployee
        ? `${s.completedByEmployee.firstName || ''} ${s.completedByEmployee.lastName || ''}`.trim()
        : undefined,
      notes: s.notes,
    })),
    stage_history: (data.stageHistory || []).map((h: any) => ({
      id: h.id,
      from_stage: h.fromStage,
      to_stage: h.toStage,
      moved_by: h.movedBy,
      moved_by_name: h.movedByEmployee
        ? `${h.movedByEmployee.firstName || ''} ${h.movedByEmployee.lastName || ''}`.trim()
        : h.movedByName,
      started_at: h.startedAt,
      completed_at: h.completedAt,
      notes: h.notes,
      created_date: h.createdDate,
    })),
    created_by: data.createdById,
    created_by_name: data.createdBy?.firstName
      ? `${data.createdBy.firstName} ${data.createdBy.lastName || ''}`.trim()
      : undefined,
    created_date: data.createdDate,
    modified_date: data.modifiedDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProgressFromBackend(data: any): JobCardProgress {
  return {
    id: data.id,
    job_card_id: data.jobCardId,
    progress_date: data.progressDate,
    quantity_completed: Number(data.quantityCompleted),
    remarks: data.remarks,
    updated_by: data.updatedBy,
    updated_by_name: data.updatedByName,
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProcessTemplateFromBackend(data: any): ProcessTemplate {
  const stage = data.stages?.[0];
  return {
    id: data.id,
    enterprise_id: data.enterpriseId,
    process_name: data.templateName,
    description: data.description,
    estimated_time: stage?.estimatedHours,
    time_unit: 'hours',
    sequence_order: stage?.sortOrder || 1,
    status: data.status || 'active',
    created_date: data.createdDate,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJobCardProcessFromBackend(data: any): JobCardProcess {
  return {
    id: data.id,
    job_card_id: data.jobCardId || data.jobId,
    process_id: data.stageMasterId || data.id,
    process_name: data.stageName,
    sequence_order: data.sortOrder,
    status: (data.status || 'pending') as JobCardProcess['status'],
    started_at: data.startTime || data.startedAt,
    completed_at: data.endTime || data.completedAt,
    assigned_to: data.assignedTo,
    assigned_to_name: data.assignedEmployee?.firstName
      ? `${data.assignedEmployee.firstName} ${data.assignedEmployee.lastName || ''}`.trim()
      : undefined,
    completed_by: data.completedBy,
    completed_by_name: data.completedByEmployee?.firstName
      ? `${data.completedByEmployee.firstName} ${data.completedByEmployee.lastName || ''}`.trim()
      : undefined,
    description: data.description,
    remarks: data.notes || data.remarks,
    created_date: data.createdDate,
  };
}

// ============ Job Cards ============

export async function getJobCardList(params: Partial<JobCardListParams> & { salesOrderId?: number }): Promise<PaginatedResponse<JobCard>> {
  const response = await apiClient.get<PaginatedResponse<JobCard>>('/manufacturing/jobs', {
    params: {
      page: params.page,
      limit: params.pageSize,
      status: params.status,
      productId: params.productId,
      customerId: params.customerId,
      purchaseOrderId: params.salesOrderId,
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapJobCardFromBackend),
    totalRecords: backendData.totalRecords,
    page: backendData.page,
    limit: backendData.limit,
  };
}

export async function getJobCardById(id: number, _enterpriseId?: number): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.get<ApiResponse<JobCard>>(`/manufacturing/jobs/${id}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: backendData.data ? mapJobCardFromBackend(backendData.data) : undefined,
  };
}

export async function addJobCard(
  data: JobCardFormData & { enterprise_id?: number; created_by?: number }
): Promise<ApiResponse<{ id: number; job_card_number: string }>> {
  const payload: Record<string, unknown> = {
    productId: data.product_id,
    quotationId: data.order_id,
    assignedTo: data.assigned_to,
    jobName: data.job_name || `Job Card`,
    quantity: data.quantity,
    startDate: data.start_date,
    expectedCompletion: data.due_date,
    priority: data.priority === 'urgent' ? 1 : data.priority === 'high' ? 2 : data.priority === 'medium' ? 3 : 4,
    notes: data.remarks,
    status: data.status,
  };

  if (data.materials && data.materials.length > 0) {
    payload.materials = data.materials.map((m) => ({
      rawMaterialId: m.rawMaterialId,
      itemName: m.itemName,
      requiredQuantity: m.requiredQuantity,
      unitOfMeasure: m.unitOfMeasure,
    }));
  }

  const response = await apiClient.post<ApiResponse<{ id: number; job_card_number: string }>>(
    '/manufacturing/jobs',
    payload
  );
  return response.data;
}

export async function updateJobCard(
  data: JobCardFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    productId: data.product_id,
    quotationId: data.order_id,
    assignedTo: data.assigned_to,
    quantity: data.quantity,
    startDate: data.start_date,
    expectedCompletion: data.due_date,
    priority: data.priority === 'urgent' ? 1 : data.priority === 'high' ? 2 : data.priority === 'medium' ? 3 : 4,
    notes: data.remarks,
    status: data.status,
  };
  const response = await apiClient.put<ApiResponse>(`/manufacturing/jobs/${id}`, payload);
  return response.data;
}

export async function updateJobCardStatus(
  id: number,
  status: string,
  _enterpriseId?: number
): Promise<ApiResponse> {
  const response = await apiClient.put<ApiResponse>(`/manufacturing/jobs/${id}/status`, { status });
  return response.data;
}

export async function setJobCardEstimate(id: number, estimatedProductionDays: number): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.put(`/manufacturing/jobs/${id}/estimate`, { estimatedProductionDays });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapJobCardFromBackend(d.data) : undefined };
}

export async function verifyJobCardStock(
  id: number,
  data: { hasStock: boolean; shortageNotes?: string }
): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.post(`/manufacturing/jobs/${id}/verify-stock`, data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapJobCardFromBackend(d.data) : undefined };
}

export async function addJobCardProgress(
  id: number,
  data: { progressDate: string; quantityCompleted: number; remarks?: string }
): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.post(`/manufacturing/jobs/${id}/progress`, data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapJobCardFromBackend(d.data) : undefined };
}

export async function getJobCardProgress(id: number): Promise<ApiResponse<JobCardProgress[]>> {
  const response = await apiClient.get(`/manufacturing/jobs/${id}/progress`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: (d.data || []).map(mapProgressFromBackend),
  };
}

export async function jobCardDispatchAction(
  id: number,
  action: 'approve' | 'dispatch' | 'hold' | 'unhold' | 'request_modification',
  remarks?: string,
  dispatchDate?: string,
): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.post(`/manufacturing/jobs/${id}/dispatch-action`, { action, remarks, dispatchDate });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapJobCardFromBackend(d.data) : undefined };
}

export async function sendJobCardForApproval(id: number): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.post(`/manufacturing/jobs/${id}/send-for-approval`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapJobCardFromBackend(d.data) : undefined };
}

export async function deleteJobCard(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/manufacturing/jobs/${id}`);
  return response.data;
}

// ============ Process Templates ============

export async function getProcessTemplates(_enterpriseId?: number): Promise<ApiResponse<ProcessTemplate[]>> {
  const response = await apiClient.get<PaginatedResponse<ProcessTemplate>>('/manufacturing/templates', {
    params: { limit: 1000 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return { message: backendData.message, data: (backendData.data || []).map(mapProcessTemplateFromBackend) };
}

export async function addProcessTemplate(
  data: ProcessTemplateFormData & { enterprise_id?: number }
): Promise<ApiResponse> {
  const payload = {
    templateName: data.process_name,
    description: data.description,
    stages: [{
      name: data.process_name,
      description: data.description,
      estimatedHours: data.estimated_time,
      sortOrder: data.sequence_order,
    }],
  };
  const response = await apiClient.post<ApiResponse>('/manufacturing/templates', payload);
  return response.data;
}

export async function updateProcessTemplate(
  data: ProcessTemplateFormData & { id: number; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    templateName: data.process_name,
    description: data.description,
    stages: [{
      name: data.process_name,
      description: data.description,
      estimatedHours: data.estimated_time,
      sortOrder: data.sequence_order,
    }],
  };
  const response = await apiClient.put<ApiResponse>(`/manufacturing/templates/${id}`, payload);
  return response.data;
}

export async function deleteProcessTemplate(id: number, _enterpriseId?: number): Promise<ApiResponse> {
  const response = await apiClient.delete<ApiResponse>(`/manufacturing/templates/${id}`);
  return response.data;
}

// ============ Job Card Processes (Stages) ============

export async function getJobCardProcesses(
  jobCardId: number,
  _enterpriseId?: number
): Promise<ApiResponse<JobCardProcess[]>> {
  const response = await apiClient.get<ApiResponse<JobCardProcess[]>>(`/manufacturing/jobs/${jobCardId}/stages`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backendData = response.data as any;
  return {
    message: backendData.message,
    data: (backendData.data || []).map(mapJobCardProcessFromBackend),
  };
}

export async function addJobCardProcess(
  data: JobCardProcessFormData & { enterprise_id?: number }
): Promise<ApiResponse> {
  const payload = {
    stageName: data.process_name || `Stage ${data.sequence_order}`,
    assignedTo: data.assigned_to,
    sortOrder: data.sequence_order,
    notes: data.remarks,
  };
  const response = await apiClient.post<ApiResponse>(`/manufacturing/jobs/${data.job_card_id}/stages`, payload);
  return response.data;
}

export async function updateJobCardProcess(
  data: { id: number; status: string; remarks?: string; enterprise_id?: number }
): Promise<ApiResponse> {
  const { id } = data;
  const payload = {
    status: data.status,
    notes: data.remarks,
  };
  const response = await apiClient.put<ApiResponse>(`/manufacturing/stages/${id}`, payload);
  return response.data;
}

// ============ Stage-Based Workflow ============

export async function moveToNextStage(
  id: number,
  notes?: string,
  completedDate?: string,
  description?: string,
): Promise<ApiResponse<JobCard>> {
  const response = await apiClient.post(`/manufacturing/jobs/${id}/move-stage`, { notes, completedDate, description });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return { message: d.message, data: d.data ? mapJobCardFromBackend(d.data) : undefined };
}

export async function getStageHistory(id: number): Promise<ApiResponse<JobCardStageHistory[]>> {
  const response = await apiClient.get(`/manufacturing/jobs/${id}/stage-history`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = response.data as any;
  return {
    message: d.message,
    data: d.data || [],
  };
}
