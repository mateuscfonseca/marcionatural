export interface User {
  id: number;
  username: string;
  deleted_at?: string | null;
}

export interface UserEntry {
  id: number;
  user_id: number;
  activity_type_id: number;
  description: string;
  photo_url: string | null;
  photo_original_name: string | null;
  photo_identifier: string | null;
  duration_minutes: number | null;
  points: number;
  entry_date: string | null;
  is_invalidated: boolean;
  invalidated_at: string | null;
  created_at: string;
  activity_type_name?: string;
  category_id?: number;
  category_name?: string;
  is_activity_validated?: boolean;
  is_activity_positive?: boolean;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEntriesResponse {
  entries: UserEntry[];
  pagination: PaginationResponse;
}

export interface LeaderboardUser {
  id: number;
  username: string;
  total_points: number;
  valid_entries_count: number;
}

export interface LeaderboardUserWithMovement extends LeaderboardUser {
  position: number;
  previousPosition: number | null;
  positionDiff: number;
  movement: 'up' | 'down' | 'same';
}

export interface LeaderboardSnapshot {
  date: string;
  users: Array<{
    id: number;
    username: string;
    total_points: number;
  }>;
}

export interface TimelineEntry {
  id: number;
  user_id: number;
  username: string;
  activity_type_id: number | null;
  activity_type_name: string | null;
  category_id: number | null;
  category_name: string | null;
  description: string;
  photo_url: string | null;
  photo_identifier: string | null;
  photo_original_name: string | null;
  points: number;
  entry_date: string;
  created_at: string;
  is_invalidated: boolean;
  // Campos para projetos pessoais
  entry_type: 'activity' | 'project';
  project_id: number | null;
  project_name: string | null;
  duration_minutes: number | null;
  week_number: number | null;
  year: number | null;
}

export interface ActivityType {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  is_positive: boolean;
  base_points: number;
  is_validated: boolean;
  created_by_user_id: number | null;
  created_at: string;
  positive_votes?: number;
  negative_votes?: number;
  total_votes?: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface ValidationStatus {
  totalVotes: number;
  positiveVotes: number;
  negativeVotes: number;
  isValidated: boolean;
  isInvalidated: boolean;
  negativePercentage: number;
}

export interface PersonalProject {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  weekly_hours_goal: number;
  is_active: boolean;
  created_at: string;
  total_points?: number;
}

export interface ProjectWithProgress extends PersonalProject {
  totalMinutes: number;
  goalMinutes: number;
  goalReached: boolean;
  percentage: number;
  weekNumber: number;
  year: number;
}

export interface ProjectDailyLog {
  id: number;
  project_id: number;
  user_id: number;
  date: string;
  duration_minutes: number;
  week_number: number;
  year: number;
  created_at: string;
}

export interface WeeklyProgress {
  weekNumber: number;
  year: number;
  totalMinutes: number;
  goalMinutes: number;
  goalReached: boolean;
  percentage: number;
  dailyLogs: ProjectDailyLog[];
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface ErrorResponse {
  error: string;
}

export interface EntryReport {
  id: number;
  entry_id: number;
  reporter_user_id: number;
  created_at: string;
  entry_description?: string;
  reporter_username?: string;
}

export interface EntryReportStats {
  entryId: number;
  reportCount: number;
  isInvalidated: boolean;
}

export interface VotingStats {
  entriesAvailableToVote: number;
  myInvalidatedEntries: number;
  totalInvalidatedEntries: number;
  myTotalReports: number;
}

export interface VotingEntry {
  id: number;
  user_id: number;
  username: string;
  description: string;
  photo_url: string | null;
  points: number;
  created_at: string;
  report_count: number;
  is_invalidated: boolean;
  invalidated_at: string | null;
}

export interface PerfectWeek {
  weekNumber: number;
  year: number;
  points: number;
  startDate: string;
  endDate: string;
}

export interface PerfectWeeksResponse {
  perfectWeeks: PerfectWeek[];
  totalBonusPoints: number;
}
