import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectMember {
  user: mongoose.Types.ObjectId;
  role: 'Admin' | 'Member';
}

export interface IProject extends Document {
  title: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  members: IProjectMember[];
}

const projectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['Admin', 'Member'], default: 'Member' },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IProject>('Project', projectSchema);
