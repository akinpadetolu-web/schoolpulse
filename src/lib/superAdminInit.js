import { base44 } from '@/api/base44Client';
import { hashPassword } from './auth';

const SUPER_ADMIN_EMAIL = "thespaceshipagency@gmail.com";
const SUPER_ADMIN_PASSWORD = "superadmin123";

export async function ensureSuperAdminExists() {
  try {
    const existing = await base44.entities.SchoolUser.filter({ email: SUPER_ADMIN_EMAIL, role: "superAdmin" });
    if (existing && existing.length > 0) return existing[0];
    
    const admin = await base44.entities.SchoolUser.create({
      fullName: "SchoolPulse Super Admin",
      email: SUPER_ADMIN_EMAIL,
      username: "superadmin",
      passwordHash: hashPassword(SUPER_ADMIN_PASSWORD),
      role: "superAdmin",
      schoolId: "",
      schoolName: "",
      mustChangePassword: false,
      isArchived: false,
    });
    return admin;
  } catch (e) {
    console.error("Super admin init error:", e);
    return null;
  }
}