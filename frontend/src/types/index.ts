export interface User {
  _id: string;
  name: string;
  email: string;
}

export type MemberRole = 'Admin' | 'Member';

export interface ProjectMember {
  user: User;
  role: MemberRole;
  _id?: string;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  owner: User;
  members: ProjectMember[];
  taskCount?: number;
  userRole?: MemberRole;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  project: string;
  assignee?: User;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  totalProjects: number;
  overdueTasks: number;
  tasksByStatus: {
    'To Do': number;
    'In Progress': number;
    Done: number;
  };
  tasksByUser: Array<{ userId: string; name: string; count: number }>;
}
