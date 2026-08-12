import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IResume extends Document {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  fileName: string;
  s3Key: string;
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
    fileName: { type: String, required: true },
    s3Key: { type: String, required: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.Resume) {
  delete (mongoose.models as Record<string, unknown>).Resume;
}

const Resume: Model<IResume> =
  mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);

export default Resume;
