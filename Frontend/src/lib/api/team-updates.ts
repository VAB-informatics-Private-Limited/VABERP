import { apiClient } from './client';

export interface TeamUpdate {
  id: number;
  managerId: number;
  title: string;
  content: string;
  category: string;
  createdDate: string;
  modifiedDate: string;
}

export interface TeamUpdatesResponse {
  message: string;
  data: TeamUpdate[];
  manager?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

// Manager: post an update to their team
export async function postTeamUpdate(data: { title: string; content: string; category?: string }): Promise<{ message: string; data: TeamUpdate }> {
  const response = await apiClient.post('/team-updates', data);
  return response.data;
}

// Manager: get their own posted updates
export async function getMyTeamUpdates(): Promise<TeamUpdatesResponse> {
  const response = await apiClient.get('/team-updates/mine');
  return response.data;
}

// Employee: get updates from their assigned manager
export async function getUpdatesFromManager(): Promise<TeamUpdatesResponse> {
  const response = await apiClient.get('/team-updates/from-manager');
  return response.data;
}

// Manager: delete an update
export async function deleteTeamUpdate(id: number): Promise<{ message: string }> {
  const response = await apiClient.delete(`/team-updates/${id}`);
  return response.data;
}
