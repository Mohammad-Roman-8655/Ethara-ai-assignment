import { Response } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project';
import User from '../models/User';
import Task from '../models/Task';
import { AuthRequest } from '../middleware/auth';

const populateProject = (query: mongoose.Query<any, any>) =>
  query.populate('owner', 'name email').populate('members.user', 'name email');

const getUserRole = (project: any, userId: string): 'Admin' | 'Member' | null => {
  const member = project.members.find(
    (m: any) => m.user._id.toString() === userId || m.user.toString() === userId
  );
  return member ? member.role : null;
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }

    const project = await Project.create({
      title,
      description: description || '',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }],
    });

    const populated = await populateProject(Project.findById(project._id));
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await populateProject(
      Project.find({ 'members.user': req.user._id }).sort({ createdAt: -1 })
    );

    const withTaskCount = await Promise.all(
      projects.map(async (p: any) => {
        const taskCount = await Task.countDocuments({ project: p._id });
        return { ...p.toObject(), taskCount };
      })
    );

    res.json(withTaskCount);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (!role) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ ...project.toObject(), userRole: role });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (role !== 'Admin') {
      res.status(403).json({ message: 'Only admins can update the project' });
      return;
    }

    const { title, description } = req.body;
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    await project.save();

    const populated = await populateProject(Project.findById(project._id));
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Only the project owner can delete it' });
      return;
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (role !== 'Admin') {
      res.status(403).json({ message: 'Only admins can add members' });
      return;
    }

    const { email, memberRole } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      res.status(404).json({ message: 'User not found with that email' });
      return;
    }

    const alreadyMember = project.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      res.status(400).json({ message: 'User is already a member' });
      return;
    }

    project.members.push({ user: userToAdd._id as mongoose.Types.ObjectId, role: memberRole === 'Admin' ? 'Admin' : 'Member' });
    await project.save();

    const populated = await populateProject(Project.findById(project._id));
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const role = getUserRole(project, req.user._id.toString());
    if (role !== 'Admin') {
      res.status(403).json({ message: 'Only admins can remove members' });
      return;
    }

    const { userId } = req.params;
    if (project.owner.toString() === userId) {
      res.status(400).json({ message: 'Cannot remove the project owner' });
      return;
    }

    project.members = project.members.filter((m) => m.user.toString() !== userId) as any;
    await project.save();

    const populated = await populateProject(Project.findById(project._id));
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
