import bcrypt from "bcryptjs";
import { connectToDatabase } from "../lib/db.js";
import { User } from "../models/User.js";

function readArg(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

async function updateAdminCredentials() {
    const currentEmail = readArg("--current-email");
    const newEmail = readArg("--new-email");
    const newPassword = readArg("--new-password");

    if (!currentEmail || !newEmail || !newPassword) {
        throw new Error("Usage: npm run update-admin -- --current-email old@example.com --new-email new@example.com --new-password NewPassword123");
    }

    await connectToDatabase();

    const admin = await User.findOne({ email: currentEmail, role: "admin" });
    if (!admin) {
        throw new Error(`Admin not found for email: ${currentEmail}`);
    }

    const duplicate = await User.findOne({
        email: newEmail,
        _id: { $ne: admin._id }
    }).lean();

    if (duplicate) {
        throw new Error(`Another user already uses email: ${newEmail}`);
    }

    admin.email = newEmail;
    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return {
        ok: true,
        adminId: String(admin._id),
        email: admin.email
    };
}

const isDirectRun = process.argv[1]?.includes("update-admin.js");

if (isDirectRun) {
    updateAdminCredentials()
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        })
        .catch((error) => {
            console.error(error.message || error);
            process.exit(1);
        });
}

export { updateAdminCredentials };
