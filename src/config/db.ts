import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/gamlish-prelaunch";
  await mongoose.connect(uri);
}
