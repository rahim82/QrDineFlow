import nodemailer from "nodemailer";
import { env } from "./env.js";

function hasSmtpConfig() {
    return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
}

let transporterPromise;
let verifyPromise;

function getNormalizedSmtpConfig() {
    const host = env.smtpHost.trim();
    const user = env.smtpUser.trim();
    const from = env.smtpFrom.trim();
    const pass = env.smtpPass.replace(/\s+/g, "");
    return { host, user, from, pass };
}

async function getTransporter() {
    if (!hasSmtpConfig()) {
        return null;
    }
    if (!transporterPromise) {
        const smtp = getNormalizedSmtpConfig();
        transporterPromise = Promise.resolve(nodemailer.createTransport({
            service: smtp.host === "smtp.gmail.com" ? "gmail" : undefined,
            host: smtp.host,
            port: env.smtpPort,
            secure: env.smtpPort === 465,
            requireTLS: env.smtpPort === 587,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            auth: {
                user: smtp.user,
                pass: smtp.pass
            }
        }));
    }
    return transporterPromise;
}

export async function verifySmtpConnection() {
    const transporter = await getTransporter();
    if (!transporter) {
        return { ok: false, reason: "smtp_not_configured" };
    }
    if (!verifyPromise) {
        verifyPromise = transporter.verify()
            .then(() => ({ ok: true }))
            .catch((error) => ({
            ok: false,
            reason: error?.code || error?.responseCode || "smtp_verify_failed",
            message: error?.message || "SMTP verification failed"
        }));
    }
    return verifyPromise;
}

export async function sendOtpEmail({ email, otp }) {
    const transporter = await getTransporter();
    if (!transporter) {
        return { delivered: false, reason: "smtp_not_configured" };
    }
    const smtp = getNormalizedSmtpConfig();

    const info = await transporter.sendMail({
        from: smtp.from,
        to: email,
        subject: "Your login OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937;">
            <h2 style="margin: 0 0 12px;">Your login OTP</h2>
            <p style="margin: 0 0 16px;">Use the following one-time password to sign in to your restaurant dashboard.</p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 20px; background: #fff7ed; border-radius: 12px; color: #9a3412; display: inline-block;">
              ${otp}
            </div>
            <p style="margin: 16px 0 0; font-size: 14px; color: #6b7280;">This OTP expires in 10 minutes.</p>
          </div>
        `,
        text: `Your login OTP is ${otp}. This OTP expires in 10 minutes.`
    });

    return {
        delivered: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
    };
}
