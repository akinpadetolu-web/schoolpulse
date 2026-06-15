import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { staffId, email, fullName, password, schoolName } = await req.json();

    // Send welcome email
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Welcome to ${schoolName} - Staff Portal`,
      body: `
        <h2>Welcome, ${fullName}!</h2>
        <p>Your account has been created in the ${schoolName} staff portal.</p>
        
        <h3>Login Credentials</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        
        <p>Please change your password after your first login.</p>
        
        <p>If you have any questions, contact your school administrator.</p>
      `,
    });

    return Response.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});