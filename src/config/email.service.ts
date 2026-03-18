import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

export const sendEmail = async (payload: SendEmailOptions) => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    return response;
  } catch (error: any) {
    console.error("Email send failed:", error?.message);
    throw new Error("Failed to send email");
  }
};
