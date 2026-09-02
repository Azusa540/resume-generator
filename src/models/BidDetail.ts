import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IBidDetail extends Document {
  userId: Types.ObjectId;
  profileId?: Types.ObjectId;
  jobTitle: string;
  company: string;
  jobLink?: string;
  jobDescription?: string;
}

const BidDetailSchema = new Schema<IBidDetail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    jobTitle: { type: String, required: true },
    company: { type: String, required: true },
    jobLink: { type: String },
    jobDescription: { type: String },
  },
  // Force the collection name; Mongoose would otherwise pluralize to "biddetails"
  { timestamps: true, collection: 'bid_details' }
);

// Always re-register in dev so hot-reload picks up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.BidDetail) {
  delete (mongoose.models as Record<string, unknown>).BidDetail;
}

const BidDetail: Model<IBidDetail> =
  mongoose.models.BidDetail || mongoose.model<IBidDetail>('BidDetail', BidDetailSchema);

export default BidDetail;
