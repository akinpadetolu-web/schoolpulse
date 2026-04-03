import { base44 } from '@/api/base44Client';

export async function logAudit({ schoolId, schoolName, action, entityType, entityId, performedBy, performedByName, details }) {
  try {
    await base44.entities.AuditLog.create({
      schoolId: schoolId || "",
      schoolName: schoolName || "",
      action: action || "unknown",
      entityType: entityType || "",
      entityId: entityId || "",
      performedBy: performedBy || "",
      performedByName: performedByName || "",
      details: details || "",
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}