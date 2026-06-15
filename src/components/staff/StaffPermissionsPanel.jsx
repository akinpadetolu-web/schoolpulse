import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const MODULES = {
  'Finance': {
    key: 'finance',
    permissions: [
      { key: 'view', label: 'View Transactions' },
      { key: 'create', label: 'Create & Edit' },
      { key: 'approve', label: 'Approve Payments' },
      { key: 'reports', label: 'Generate Reports' },
    ]
  },
  'Hostel Management': {
    key: 'hostel',
    permissions: [
      { key: 'view', label: 'View Rooms & Allocations' },
      { key: 'create', label: 'Create & Edit Allocations' },
      { key: 'approve', label: 'Approve Boarding' },
      { key: 'reports', label: 'Hostel Reports' },
    ]
  },
  'Library': {
    key: 'library',
    permissions: [
      { key: 'view', label: 'View Catalog' },
      { key: 'create', label: 'Add & Edit Books' },
      { key: 'approve', label: 'Approve Requests' },
    ]
  },
  'Transport': {
    key: 'transport',
    permissions: [
      { key: 'view', label: 'View Routes & Vehicles' },
      { key: 'create', label: 'Manage Routes' },
      { key: 'reports', label: 'Transport Reports' },
    ]
  },
  'Medical / Clinic': {
    key: 'medical',
    permissions: [
      { key: 'view', label: 'View Medical Records' },
      { key: 'create', label: 'Create & Edit Records' },
      { key: 'approve', label: 'Approve Treatment' },
    ]
  },
  'Inventory': {
    key: 'inventory',
    permissions: [
      { key: 'view', label: 'View Stock' },
      { key: 'create', label: 'Add & Edit Items' },
      { key: 'approve', label: 'Approve Requisitions' },
    ]
  },
  'Human Resources': {
    key: 'hr',
    permissions: [
      { key: 'view', label: 'View Staff' },
      { key: 'create', label: 'Manage Staff' },
      { key: 'approve', label: 'Approve Leave' },
    ]
  },
  'Reports & Analytics': {
    key: 'reports',
    permissions: [
      { key: 'view', label: 'View Reports' },
      { key: 'export', label: 'Export Data' },
    ]
  },
};

export default function StaffPermissionsPanel({ permissions, setPermissions }) {
  const togglePermission = (moduleKey, permKey) => {
    setPermissions(prev => {
      const current = prev[moduleKey] || [];
      const idx = current.indexOf(permKey);
      const updated = idx === -1
        ? [...current, permKey]
        : current.filter((_, i) => i !== idx);
      return { ...prev, [moduleKey]: updated.length > 0 ? updated : undefined };
    });
  };

  return (
    <div className="space-y-4 border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/20">
      <h3 className="font-semibold text-sm">Module Permissions</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Select which modules this staff member can access and what they can do
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(MODULES).map(([moduleName, module]) => (
          <div key={module.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800/50">
            <h4 className="font-medium text-sm mb-2">{moduleName}</h4>
            <div className="space-y-2">
              {module.permissions.map(perm => (
                <div key={perm.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`${module.key}-${perm.key}`}
                    checked={(permissions[module.key] || []).includes(perm.key)}
                    onCheckedChange={() => togglePermission(module.key, perm.key)}
                  />
                  <Label
                    htmlFor={`${module.key}-${perm.key}`}
                    className="text-xs cursor-pointer font-normal"
                  >
                    {perm.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {Object.keys(permissions).length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-400">
          <strong>Access Summary:</strong> {Object.keys(permissions).length} module(s) enabled
        </div>
      )}
    </div>
  );
}