import mongoose from "mongoose";

const passwordResetOtpSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
});

passwordResetOtpSchema.index({ email: 1 });
passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetOtp = mongoose.model("passwordResetOtp", passwordResetOtpSchema);
export default PasswordResetOtp;
