import type {
  User,
  UserEntry,
  LeaderboardUser,
  ActivityType,
  AuthResponse,
  ErrorResponse,
  ValidationStatus,
  PersonalProject,
  WeeklyProgress,
  ProjectDailyLog,
  EntryReport,
  VotingStats,
  VotingEntry,
} from '@/types';

const API_BASE = '/api';

/**
 * Erro personalizado para erros de API
 * Preserva a mensagem de erro vinda do servidor
 */
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = (data as ErrorResponse).error || 'Erro na requisição';
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

// Autenticação
export async function register(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getCurrentUser(): Promise<{ user: User } | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    return handleResponse<{ user: User }>(response);
  } catch {
    return null;
  }
}

export async function resetPassword(userId: number, newPassword: string): Promise<{
  message: string;
  user: { id: number; username: string };
}> {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId, newPassword }),
  });
  return handleResponse(response);
}

export async function deleteUser(userId: number): Promise<{
  message: string;
  user: { id: number; username: string };
}> {
  const response = await fetch(`${API_BASE}/auth/users/${userId}/delete`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function restoreUser(userId: number): Promise<{
  message: string;
  user: { id: number; username: string };
}> {
  const response = await fetch(`${API_BASE}/auth/users/${userId}/restore`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response);
}

// Leaderboard
export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardUser[] }> {
  const response = await fetch(`${API_BASE}/leaderboard`, {
    credentials: 'include',
  });
  return handleResponse<{ leaderboard: LeaderboardUser[] }>(response);
}

export async function getUserEntries(userId: number): Promise<{
  user: User;
  entries: {
    positive: UserEntry[];
    negative: UserEntry[];
    all: UserEntry[];
  };
}> {
  const response = await fetch(`${API_BASE}/leaderboard/users/${userId}/entries`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getAllUsers(): Promise<{ users: (User & { created_at: string; total_points: number })[] }> {
  const response = await fetch(`${API_BASE}/leaderboard/users`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// Entradas
export async function getMyEntries(): Promise<{ entries: UserEntry[] }> {
  const response = await fetch(`${API_BASE}/entries`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function createEntry(data: {
  activityTypeId: number;
  description: string;
  photoUrl?: string;
  photoIdentifier?: string;
  photoOriginalName?: string;
  durationMinutes?: number;
  entryDate?: string;
}): Promise<{ message: string; entry: UserEntry }> {
  const response = await fetch(`${API_BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateEntry(
  id: number,
  data: { description?: string; photoUrl?: string; durationMinutes?: number; entryDate?: string }
): Promise<{ message: string; entry: UserEntry }> {
  const response = await fetch(`${API_BASE}/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteEntry(id: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/entries/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getActivityTypesForEntries(): Promise<{ activityTypes: ActivityType[] }> {
  const response = await fetch(`${API_BASE}/entries/activity-types/options`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// Activity Types e Votação
export async function getAllActivityTypes(): Promise<{ activityTypes: ActivityType[] }> {
  const response = await fetch(`${API_BASE}/activity-types`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getValidatedActivityTypes(): Promise<{ activityTypes: ActivityType[] }> {
  const response = await fetch(`${API_BASE}/activity-types/validated`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getActivityTypesByCategory(categoryId: number): Promise<{ activityTypes: ActivityType[] }> {
  const response = await fetch(`${API_BASE}/activity-types/category/${categoryId}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function voteActivityType(activityTypeId: number, voteType: 1 | -1): Promise<{
  message: string;
  vote: { id: number; user_id: number; activity_type_id: number; vote_type: number };
  invalidated: boolean;
  status: ValidationStatus;
}> {
  const response = await fetch(`${API_BASE}/activity-types/${activityTypeId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ voteType }),
  });
  return handleResponse(response);
}

export async function getActivityTypeValidationStatus(activityTypeId: number): Promise<{ status: ValidationStatus }> {
  const response = await fetch(`${API_BASE}/activity-types/${activityTypeId}/validation-status`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function createActivityType(data: {
  name: string;
  categoryId: number;
  isPositive: boolean;
}): Promise<{ message: string; activityType: ActivityType }> {
  const response = await fetch(`${API_BASE}/activity-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// Projetos Pessoais
export async function getMyProjects(): Promise<{ projects: PersonalProject[] }> {
  const response = await fetch(`${API_BASE}/projects`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function createProject(data: {
  name: string;
  description: string;
  weeklyHoursGoal: number;
}): Promise<{ message: string; project: PersonalProject }> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateProject(
  id: number,
  data: { name?: string; description?: string; weeklyHoursGoal?: number; isActive?: boolean }
): Promise<{ message: string; project: PersonalProject }> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteProject(id: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getProjectDetails(id: number): Promise<{ project: PersonalProject }> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function logProjectTime(
  projectId: number,
  durationMinutes: number,
  date?: string
): Promise<{ message: string; log: ProjectDailyLog }> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ durationMinutes, date }),
  });
  return handleResponse(response);
}

export async function getProjectWeeklyProgress(
  projectId: number,
  weekNumber?: number,
  year?: number
): Promise<{ progress: WeeklyProgress }> {
  const params = new URLSearchParams();
  if (weekNumber) params.append('week', weekNumber.toString());
  if (year) params.append('year', year.toString());

  const url = `${API_BASE}/projects/${projectId}/weekly-progress${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// Upload de Imagem
export async function uploadImage(file: File): Promise<{
  message: string;
  image: {
    identifier: string;
    originalName: string;
    url: string;
  };
}> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/upload/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return handleResponse(response);
}

// Votação / Reports de Entradas
export async function reportEntry(entryId: number): Promise<{
  message: string;
  report: EntryReport;
  invalidated: boolean;
  reportCount: number;
}> {
  const response = await fetch(`${API_BASE}/entries/${entryId}/report`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function removeEntryReport(entryId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/entries/${entryId}/report`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getVotingAvailableEntries(): Promise<{ entries: VotingEntry[] }> {
  const response = await fetch(`${API_BASE}/entries/voting/available`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getVotingInvalidatedEntries(): Promise<{ entries: VotingEntry[] }> {
  const response = await fetch(`${API_BASE}/entries/voting/invalidated`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getMyVotingInvalidatedEntries(): Promise<{ entries: VotingEntry[] }> {
  const response = await fetch(`${API_BASE}/entries/voting/my-invalidated`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getMyReports(): Promise<{
  reports: Array<{
    id: number;
    entry_id: number;
    entry_description: string;
    entry_photo_url: string | null;
    entry_points: number;
    entry_created_at: string;
    entry_is_invalidated: boolean;
    report_created_at: string;
    owner_username: string;
    report_count: number;
  }>;
}> {
  const response = await fetch(`${API_BASE}/entries/voting/my-reports`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getMyReportedEntries(): Promise<{
  entries: Array<{
    id: number;
    description: string;
    photo_url: string | null;
    points: number;
    created_at: string;
    is_invalidated: boolean;
    report_count: number;
    report_created_at: string | null;
  }>;
}> {
  const response = await fetch(`${API_BASE}/entries/voting/my-reported-entries`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getVotingStats(): Promise<{ stats: VotingStats }> {
  const response = await fetch(`${API_BASE}/entries/voting/stats`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function getEntryReports(entryId: number): Promise<{
  reports: EntryReport[];
  hasReported: boolean;
}> {
  const response = await fetch(`${API_BASE}/entries/${entryId}/reports`, {
    credentials: 'include',
  });
  return handleResponse(response);
}
