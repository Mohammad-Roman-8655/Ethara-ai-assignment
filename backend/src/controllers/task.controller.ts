import { Response } from 'express';
import Project from '../models/Project';
import Task from '../models/Task';
import { AuthRequest } from '../middleware/auth';

const getUserRole = (project: any, userId: string): 'Admin' | 'Member' | null => {
  const member = project.members.find(
    (m: any) => m.user._id?.toString() === userId || m.user.toString() === userId
  );
  return member ? member.role : null;
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (!role) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (role !== 'Admin') {
      res.status(403).json({ message: 'Only admins can create tasks' });
      return;
    }

    const { title, description, dueDate, priority, assignee } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }

    const task = await Task.create({
      title,
      description: description || '',
      dueDate: dueDate || undefined,
      priority: priority || 'Medium',
      status: 'To Do',
      project: req.params.id,
      assignee: assignee || null,
    });

    const populated = await Task.findById(task._id).populate('assignee', 'name email');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (!role) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id });
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    if (role === 'Admin') {
      const { title, description, dueDate, priority, status, assignee } = req.body;
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
      if (priority !== undefined) task.priority = priority;
      if (status !== undefined) task.status = status;
      if (assignee !== undefined) task.assignee = assignee || undefined;
    } else {
      if (task.assignee?.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'You can only update tasks assigned to you' });
        return;
      }
      if (req.body.status) task.status = req.body.status;
    }

    await task.save();
    const populated = await Task.findById(task._id).populate('assignee', 'name email');
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (role !== 'Admin') {
      res.status(403).json({ message: 'Only admins can delete tasks' });
      return;
    }

    const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.id });
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    res.json({ message: 'Task deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
