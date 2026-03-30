import { createHash, randomInt } from "node:crypto";

const OTP_VALIDITY_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;

export function generateOtpCode() {
    return randomInt(100000, 1000000).toString();
}

export function hashOtpCode(code) {
    return createHash("sha256").update(`${code}:${process.env.JWT_SECRET || "otp-secret"}`).digest("hex");
}

export function createOtpRecord(code) {
    const now = new Date();
    return {
        otpCodeHash: hashOtpCode(code),
        otpExpiresAt: new Date(now.getTime() + OTP_VALIDITY_MS),
        otpRequestedAt: now
    };
}

export function canRequestOtp(user) {
    if (!user?.otpRequestedAt) {
        return true;
    }
    return new Date(user.otpRequestedAt).getTime() + OTP_RESEND_MS <= Date.now();
}

export function isOtpValid(user, code) {
    if (!user?.otpCodeHash || !user?.otpExpiresAt) {
        return false;
    }
    if (new Date(user.otpExpiresAt).getTime() < Date.now()) {
        return false;
    }
    return user.otpCodeHash === hashOtpCode(code);
}

export function clearOtp(user) {
    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpRequestedAt = undefined;
}
