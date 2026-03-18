import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttempt {
  bandScore: string;
  accuracy: number;
  avgTime: number;
  totalTime: number;
  correctCount?: number;
  totalQuestions?: number;
  completedAt: Date;
}

export interface ILead extends Document {
  email: string;
  attempts: IAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

const attemptSchema = new Schema<IAttempt>(
  {
    bandScore: { type: String, required: true },
    accuracy: { type: Number, required: true },
    avgTime: { type: Number, required: true },
    totalTime: { type: Number, required: true },
    correctCount: { type: Number },
    totalQuestions: { type: Number },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new Schema<ILead>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    attempts: { type: [attemptSchema], default: [] },
  },
  { timestamps: true }
);

leadSchema.index({ email: 1 }, { unique: true });

export const Lead: Model<ILead> =
  mongoose.models.Lead ?? mongoose.model<ILead>("Lead", leadSchema);
