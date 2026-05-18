import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Project, Task, TaskStatus, TaskPriority, MemberRole } from '../types';
import { StatusBadge, PriorityBadge, RoleBadge } from '../components/Badge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Done'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

const STATUS_BG: Record<TaskStatus, string> = {
  'To Do': 'bg-slate-50',
  'In Progress': 'bg-blue-50',
  Done: 'bg-green-50',
};

interface TaskFormState {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee: string;
}

const emptyForm = (): TaskFormState => ({
  title: '',
  description: '',
  dueDate: '',
  priority: 'Medium',
  status: 'To Do',
  assignee: '',
});

function TaskCard({
  task,
  isAdmin,
  isAssignee,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  isAdmin: boolean;
  isAssignee: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-slate-800 text-sm leading-snug flex-1">{task.title}</h3>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
              title="Edit task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(task._id)}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <PriorityBadge priority={task.priority} />
        {isOverdue && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
            Overdue
          </span>
        )}
      </div>

      {task.dueDate && (
        <div className={`flex items-center gap-1 text-xs mb-3 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-500">{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}

        {(isAdmin || isAssignee) && (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task._id, e.target.value as TaskStatus)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyForm());
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('Member');
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [activeStatus, setActiveStatus] = useState<TaskStatus | 'All'>('All');

  const isAdmin = project?.userRole === 'Admin';
  const isOwner = project?.owner._id === user?._id;

  const loadData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm(emptyForm());
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      priority: task.priority,
      status: task.status,
      assignee: task.assignee?._id ?? '',
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskSubmitting(true);
    const payload = {
      ...taskForm,
      dueDate: taskForm.dueDate || undefined,
      assignee: taskForm.assignee || undefined,
    };
    try {
      if (editingTask) {
        const { data } = await api.put(`/projects/${id}/tasks/${editingTask._id}`, payload);
        setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      } else {
        const { data } = await api.post(`/projects/${id}/tasks`, payload);
        setTasks((prev) => [data, ...prev]);
      }
      setShowTaskModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch {
      alert('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      const { data } = await api.put(`/projects/${id}/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
    } catch {
      alert('Failed to update status');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSubmitting(true);
    try {
      const { data } = await api.post(`/projects/${id}/members`, {
        email: memberEmail,
        memberRole,
      });
      setProject(data);
      setShowMemberModal(false);
      setMemberEmail('');
      setMemberRole('Member');
    } catch (err: any) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      const { data } = await api.delete(`/projects/${id}/members/${memberId}`);
      setProject(data);
    } catch {
      alert('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-4 sm:p-8">
        <p className="text-red-500">{error || 'Project not found'}</p>
        <Link to="/projects" className="text-blue-600 text-sm mt-2 inline-block">← Back to projects</Link>
      </div>
    );
  }

  const filteredTasks = activeStatus === 'All'
    ? tasks
    : tasks.filter((t) => t.status === activeStatus);

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <Link to="/projects" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Projects
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{project.title}</h1>
            {project.description && (
              <p className="text-slate-500 mt-1 text-sm sm:text-base">{project.description}</p>
            )}
          </div>
          {isAdmin && (
            <button onClick={openCreateTask} className="btn-primary flex items-center gap-1.5 shrink-0 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 sm:gap-6">
        {/* Members panel */}
        <div className="xl:col-span-1 order-2 xl:order-1">
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="font-semibold text-slate-700 text-sm sm:text-base">Team Members</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowMemberModal(true)}
                  className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                  title="Add member"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </button>
              )}
            </div>
            {/* Horizontal scroll on mobile, vertical stack on desktop */}
            <div className="flex xl:flex-col gap-3 overflow-x-auto xl:overflow-x-visible pb-1 xl:pb-0">
              {project.members.map((member) => (
                <div key={member._id ?? member.user._id}
                  className="flex items-center justify-between shrink-0 xl:shrink min-w-[160px] xl:min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{member.user.name}</p>
                      <RoleBadge role={member.role} />
                    </div>
                  </div>
                  {isAdmin && isOwner && member.user._id !== user?._id && (
                    <button
                      onClick={() => handleRemoveMember(member.user._id)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0 ml-1"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks board */}
        <div className="xl:col-span-3 order-1 xl:order-2">
          {/* Status filter tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {(['All', ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeStatus === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s}
                <span className={`ml-1 text-xs ${activeStatus === s ? 'text-blue-200' : 'text-slate-400'}`}>
                  {s === 'All' ? tasks.length : tasksByStatus[s].length}
                </span>
              </button>
            ))}
          </div>

          {/* Kanban columns when showing All — horizontal scroll on mobile */}
          {activeStatus === 'All' ? (
            <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 pb-2">
              <div className="flex gap-4 lg:grid lg:grid-cols-3 min-w-max lg:min-w-0">
              {STATUSES.map((status) => (
                <div key={status} className={`w-72 lg:w-auto shrink-0 lg:shrink ${STATUS_BG[status]} rounded-xl p-3 min-h-[200px]`}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <StatusBadge status={status} />
                    <span className="text-xs text-slate-400 font-medium">
                      {tasksByStatus[status].length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasksByStatus[status].length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">No tasks</div>
                    ) : (
                      tasksByStatus[status].map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          isAdmin={isAdmin}
                          isAssignee={task.assignee?._id === user?._id}
                          onEdit={openEditTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-slate-400">No tasks in this status</div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    isAdmin={isAdmin}
                    isAssignee={task.assignee?._id === user?._id}
                    onEdit={openEditTask}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task create/edit modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'Create Task'}
      >
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text"
              className="input"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Task description"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <select
                className="input"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                className="input"
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Due date</label>
              <input
                type="date"
                className="input"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Assignee</label>
              <select
                className="input"
                value={taskForm.assignee}
                onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
              >
                <option value="">Unassigned</option>
                {project.members.map((m) => (
                  <option key={m.user._id} value={m.user._id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowTaskModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={taskSubmitting}>
              {taskSubmitting ? 'Saving…' : editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add member modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => { setShowMemberModal(false); setMemberError(''); }}
        title="Add Team Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {memberError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {memberError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">User email</label>
            <input
              type="email"
              className="input"
              placeholder="colleague@example.com"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select
              className="input"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as MemberRole)}
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1"
              onClick={() => { setShowMemberModal(false); setMemberError(''); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={memberSubmitting}>
              {memberSubmitting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
