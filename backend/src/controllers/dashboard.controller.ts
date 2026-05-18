import { Response } from 'express';
import Project from '../models/Project';
import Task from '../models/Task';
import { AuthRequest } from '../middleware/auth';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({ 'members.user': userId });
    const projectIds = projects.map((p) => p._id);

    const tasks = await Task.find({ project: { $in: projectIds } }).populate(
      'assignee',
      'name email'
    );

    const now = new Date();
    const totalTasks = tasks.length;
    const tasksByStatus = {
      'To Do': tasks.filter((t) => t.status === 'To Do').length,
      'In Progress': tasks.filter((t) => t.status === 'In Progress').length,
      Done: tasks.filter((t) => t.status === 'Done').length,
    };
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== 'Done'
    ).length;

    const userMap: Record<string, { name: string; count: number }> = {};
    tasks.forEach((task) => {
      if (task.assignee) {
        const a = task.assignee as any;
        const key = a._id.toString();
        if (!userMap[key]) userMap[key] = { name: a.name, count: 0 };
        userMap[key].count++;
      }
    });

    const tasksByUser = Object.entries(userMap).map(([id, data]) => ({
      userId: id,
      name: data.name,
      count: data.count,
    }));

    res.json({
      totalTasks,
      tasksByStatus,
      overdueTasks,
      tasksByUser,
      totalProjects: projects.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
