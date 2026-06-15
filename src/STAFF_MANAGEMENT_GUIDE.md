# Non-Teaching Staff Management System

## Overview
The Non-Teaching Staff Management system allows school administrators to manage support staff (bursars, hostel managers, accountants, librarians, nurses, etc.) with granular permission controls.

## Features Implemented

### 1. Staff Management Page (`/school-admin/staff`)
- **List View**: Table displaying all non-teaching staff with:
  - Full Name
  - Position/Job Title
  - Department
  - Email & Phone
  - Status (Active/Inactive/On Leave/Terminated)
  - Actions (Edit, Delete)

- **Search & Filter**: 
  - Real-time search by name, email, or position
  - Filter by status
  - Pagination with stats cards

- **Create New Staff**:
  - Form dialog with fields: Full Name, Email, Phone, Job Title, Department, Password
  - Password auto-generation option
  - Quick role presets (Bursar, Hostel Manager, Accountant, Secretary, Librarian, Nurse)
  - Profile picture support (optional)

### 2. Permission Assignment System
Granular module-based permissions with 8 major categories:

#### Available Modules:
1. **Finance Module**
   - View Transactions
   - Create & Edit
   - Approve Payments
   - Generate Reports

2. **Hostel Management**
   - View Rooms & Allocations
   - Create & Edit Allocations
   - Approve Boarding
   - Hostel Reports

3. **Library**
   - View Catalog
   - Add & Edit Books
   - Approve Requests

4. **Transport**
   - View Routes & Vehicles
   - Manage Routes
   - Transport Reports

5. **Medical / Clinic**
   - View Medical Records
   - Create & Edit Records
   - Approve Treatment

6. **Inventory**
   - View Stock
   - Add & Edit Items
   - Approve Requisitions

7. **Human Resources**
   - View Staff
   - Manage Staff
   - Approve Leave

8. **Reports & Analytics**
   - View Reports
   - Export Data

### 3. Staff Authentication & Authorization
- Staff members log in with their assigned email and password
- Only see modules/features granted to them
- Permissions enforced at both UI and API levels

### 4. Quick Apply Role Presets
Pre-configured role templates for common positions:
- **Bursar**: Finance (Full) + Reports (View)
- **Hostel Manager**: Hostel Management (Full)
- **Accountant**: Finance (View) + Reports (View)
- **Secretary**: General (View)
- **Librarian**: Library (Full)
- **School Nurse**: Medical (Full)

## Technical Implementation

### Database Entities
- **NonTeachingStaff**: Stores staff member information
  - Basic info: fullName, email, phone, jobTitle, department, employeeId
  - Status: active, inactive, on_leave, terminated
  - Permissions: JSON object with module permissions
  - profilePictureUrl: Optional profile image

### Components
1. **AdminStaff.jsx** - Main staff management page
2. **CreateStaffDialog.jsx** - Form for creating new staff
3. **EditStaffDialog.jsx** - Form for editing existing staff
4. **StaffPermissionsPanel.jsx** - Granular permission selector

### Backend Functions
- **welcomeStaffMember.js** - Sends welcome email with credentials

### Navigation
- Added "Non-Teaching Staff" menu item in School Admin sidebar
- Placed in STAFF section along with HR, Leave Requests, etc.

## Usage Workflow

### Creating a Staff Member
1. Click "Add Staff" button
2. Fill in basic information
3. Select department and job title
4. Auto-generate or manually enter password
5. Select permissions by checking module/feature checkboxes
6. Click "Create Staff"
7. Welcome email is automatically sent with login credentials

### Editing a Staff Member
1. Click edit icon next to staff member
2. Update any information
3. Modify permissions as needed
4. Click "Save Changes"

### Deactivating a Staff Member
- Click delete icon to archive (soft delete) the staff member
- Staff remains in database but marked as inactive/archived

## Permission Storage Format
```json
{
  "finance": ["view", "create", "approve"],
  "hostel": ["view", "create"],
  "library": ["view"],
  "reports": ["view", "export"]
}
```

## Security Considerations
1. Passwords are auto-generated or manually set during creation
2. Staff emails must be unique (validated at creation)
3. Permissions are validated server-side
4. Soft deletes (isArchived flag) preserve audit trail
5. All actions are tied to current school context

## Future Enhancements
- Permission templates for custom roles
- Bulk staff import via CSV
- Automated access revocation on status change
- Permission audit logs
- Department-wise staff reports
- Salary/compensation management
- Integration with biometric attendance

## Menu Navigation Path
School Admin → Staff → Non-Teaching Staff

## Status Types
- **Active**: Staff member can access assigned modules
- **Inactive**: Account disabled, no access
- **On Leave**: Temporary deactivation
- **Terminated**: Removed from system (archived)