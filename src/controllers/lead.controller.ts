import { Request, Response } from "express";
import { Lead } from "../models/lead.model";
import { sendReportEmail } from "../config/mail";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/lead
 * - Body: { email } only → capture email (no duplicate), no report email.
 * - Body: { email, bandScore, accuracy, avgTime, totalTime, correctCount?, totalQuestions? } → upsert lead, push attempt, send report email.
 */
export async function createLead(req: Request, res: Response): Promise<void> {
  const { email, bandScore, accuracy, avgTime, totalTime, correctCount, totalQuestions } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    res.status(400).json({ success: false, message: "Invalid email format" });
    return;
  }

  const hasResult =
    bandScore != null &&
    typeof accuracy === "number" &&
    typeof avgTime === "number" &&
    typeof totalTime === "number";

  if (hasResult) {
    const attempt = {
      bandScore: String(bandScore),
      accuracy: Number(accuracy),
      avgTime: Number(avgTime),
      totalTime: Number(totalTime),
      correctCount: correctCount != null ? Number(correctCount) : undefined,
      totalQuestions: totalQuestions != null ? Number(totalQuestions) : undefined,
      completedAt: new Date(),
    };

    const lead = await Lead.findOneAndUpdate(
      { email: trimmedEmail },
      { $push: { attempts: attempt } },
      { new: true, upsert: true }
    );

    try {
      await sendReportEmail({
        to: trimmedEmail,
        bandScore: String(bandScore),
        accuracy: Number(accuracy),
        avgTime: Number(avgTime),
        totalTime: Number(totalTime),
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Lead saved but email could not be sent",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Lead saved and report email sent",
      id: lead._id,
      attemptNumber: lead.attempts.length,
    });
    return;
  }

  await Lead.findOneAndUpdate(
    { email: trimmedEmail },
    { $setOnInsert: { email: trimmedEmail } },
    { upsert: true, new: true }
  );

  res.status(201).json({
    success: true,
    message: "Email captured",
  });
}
