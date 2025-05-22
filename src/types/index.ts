// Firebase compatible types
export interface Course {
  id: number;
  קורס: string;
  שיעורים: Lesson[];
}

export interface Lesson {
  שם: string;
  מצגת: string;
  נושאים: Topic[];
}

export interface Topic {
  כותרת: string;
  מטרות: string[];
  completedGoals: string[];
}

export interface StudySession {
  id: string;
  courseId?: number;
  lessonName?: string;
  topicTitle?: string;
  duration: number;
  startTime: Date;
  endTime?: Date;
  type: 'work' | 'break';
  completed: boolean;
}

export interface UserProfile {
  email: string;
  displayName: string;
  createdAt: Date;
}

export interface SyncState {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
  isOffline: boolean;
}