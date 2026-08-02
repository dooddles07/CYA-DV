import { Schema, model, models } from "mongoose";

// Append-only trail for privileged mutations. Never updated or deleted by the
// app; retention/rotation is an operational decision, not enforced here.
const AdminAuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorLabel: { type: String, required: true, maxlength: 120 },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, maxlength: 40 },
    targetId: { type: String, maxlength: 120 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLog = models.AdminAuditLog ?? model("AdminAuditLog", AdminAuditLogSchema);
