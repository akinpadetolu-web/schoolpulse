import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple password hashing — same logic as lib/auth.js
function hashPassword(password) {
  const SALT = "SP2024_";
  const salted = SALT + password;
  // Use btoa with encoding-safe method
  return btoa(unescape(encodeURIComponent(salted)));
}

function generateUsername(fullName, existingUsernames = []) {
  if (!fullName) return "user";
  const parts = fullName.trim().split(/\s+/);
  const first = (parts[0] || "user").toLowerCase().slice(0, 4);
  const lastInitial = parts.length > 1 ? (parts[parts.length - 1] || "x")[0].toLowerCase() : "x";
  let base = `${first}.${lastInitial}`;
  let username = base;
  let counter = 1;
  while (existingUsernames.includes(username)) {
    username = `${base}${counter}`;
    counter++;
  }
  return username;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { schoolId, linkCodes, fullName, email, password } = await req.json();

    if (!schoolId || !linkCodes?.length || !fullName || !email || !password) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const trimmedCodes = linkCodes.map((c) => c.trim()).filter(Boolean);
    if (trimmedCodes.length === 0) {
      return Response.json({ error: "Please provide at least one student link code" }, { status: 400 });
    }

    // Use service role to read/create school users
    const students = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: "student",
      isArchived: false,
    });

    const linked = (students || []).filter((s) => trimmedCodes.includes(s.parentLinkCode));

    if (linked.length === 0) {
      return Response.json({ error: "No students found with those link codes. Please check and try again." }, { status: 400 });
    }

    if (linked.length !== trimmedCodes.length) {
      const foundCodes = linked.map((s) => s.parentLinkCode);
      const notFound = trimmedCodes.filter((c) => !foundCodes.includes(c));
      return Response.json({ error: `Code(s) not found: ${notFound.join(", ")}. Please verify them with the school.` }, { status: 400 });
    }

    // Check email not already taken
    const existingParents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: "parent",
    });

    if ((existingParents || []).some((p) => p.email === email.trim())) {
      return Response.json({ error: "An account with this email already exists. Please sign in." }, { status: 400 });
    }

    const existingUsernames = (existingParents || []).map((p) => p.username).filter(Boolean);

    // Get school name
    const schools = await base44.asServiceRole.entities.School.filter({ id: schoolId });
    const school = (schools || [])[0];

    const newUsername = generateUsername(fullName, existingUsernames);

    await base44.asServiceRole.entities.SchoolUser.create({
      schoolId,
      schoolName: school?.schoolName || "",
      fullName: fullName.trim(),
      email: email.trim(),
      username: newUsername,
      passwordHash: hashPassword(password),
      role: "parent",
      linkedStudentIds: linked.map((s) => s.id),
      mustChangePassword: false,
      isArchived: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});