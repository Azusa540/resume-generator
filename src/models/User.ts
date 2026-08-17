import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  password: string;
  is_admin: boolean;
  apiKeyHash?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  createWithHashedPassword(username: string, password: string, isAdmin?: boolean): Promise<IUser>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    is_admin: { type: Boolean, default: false },
    apiKeyHash: { type: String, sparse: true, index: true },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

UserSchema.statics.createWithHashedPassword = async function (
  username: string,
  password: string,
  isAdmin = false
): Promise<IUser> {
  const hashed = await bcrypt.hash(password, 12);
  return this.create({ username, password: hashed, is_admin: isAdmin });
};

if (process.env.NODE_ENV !== 'production' && mongoose.models.User) {
  delete (mongoose.models as Record<string, unknown>).User;
}

const User = (mongoose.models.User ||
  mongoose.model<IUser, IUserModel>('User', UserSchema)) as IUserModel;

export default User;
