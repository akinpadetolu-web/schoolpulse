import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function hashPassword(password) {
  const SALT = "SP2024_";
  const salted = SALT + password;
  return btoa(unescape(encodeURIComponent(salted)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only callable by an authenticated admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdminEmail = Deno.env.get("SUPER_ADMIN_EMAIL");
    const superAdminPassword = Deno.env.get("SUPER_ADMIN_PASSWORD");

    if (!superAdminEmail || !superAdminPassword) {
      return Response.json({ error: "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables must be set" }, { status: 500 });
    }

    const existing = await base44.asServiceRole.entities.SchoolUser.filter({
      email: superAdminEmail,
      role: "superAdmin",
    });

    if (existing && existing.length > 0) {
      return Response.json({ success: true, message: "Super admin already exists" });
    }

    const admin = await base44.asServiceRole.entities.SchoolUser.create({
      fullName: "SchoolPulse Super Admin",
      email: superAdminEmail,
      username: "superadmin",
      passwordHash: hashPassword(superAdminPassword),
      role: "superAdmin",
      schoolId: "",
      schoolName: "",
      mustChangePassword: true,
      isArchived: false,
    });

    return Response.json({ success: true, message: "Super admin created", id: admin.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});