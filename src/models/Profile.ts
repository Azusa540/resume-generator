import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IEducation {
  university: string;
  degree: string;
  from: string;
  to: string;
}

export interface IEmployment {
  companyName: string;
  from?: string;
  to?: string;
  position?: string;
  desc?: string;
}

export interface IProfile extends Document {
  userId: Types.ObjectId;
  fullName: string;
  address?: string;
  email: string;
  phone?: string;
  linkedin?: string;
  education: IEducation[];
  employment: IEmployment[];
  pdfTemplate?: 'template1' | 'template2' | 'template3';
  profileType?: 'software' | 'other';
  customPrompt?: string;
  templatePath?: string;
  templateName?: string;
}

const EducationSchema = new Schema<IEducation>(
  {
    university: { type: String, required: true },
    degree: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const EmploymentSchema = new Schema<IEmployment>(
  {
    companyName: { type: String, required: true },
    from: { type: String },
    to: { type: String },
    position: { type: String },
    desc: { type: String },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true },
    address: { type: String },
    email: { type: String, required: true },
    phone: { type: String },
    linkedin: { type: String },
    education: { type: [EducationSchema], default: [] },
    employment: { type: [EmploymentSchema], default: [] },
    pdfTemplate: { type: String, enum: ['template1', 'template2', 'template3'], default: 'template1' },
    profileType: { type: String, enum: ['software', 'other'], default: 'software' },
    customPrompt: { type: String },
    templatePath: { type: String },
    templateName: { type: String },
  },
  { timestamps: true }
);

// Always re-register in dev so hot-reload picks up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.Profile) {
  delete (mongoose.models as Record<string, unknown>).Profile;
}

const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema);

export default Profile;
