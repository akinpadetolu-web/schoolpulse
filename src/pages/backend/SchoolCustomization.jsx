import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { hashPassword, generateTemporaryPassword, generateUsername } from '@/lib/auth';
import { logAudit } from '@/lib/auditLogger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Search, Loader2, ChevronRight, Building2, Settings2,
  CheckCircle2, Copy, GraduationCap, Users, UserCog, Shield, CreditCard
} from 'lucide-react';
import SubscriptionPricingPanel from '@/components/backend/SubscriptionPricingPanel';
import { toast } from 'sonner';
import { getDefaultFeatures, clearFeatureCache } from '@/lib/featureToggleManager';
import { PORTAL_FEATURES, PORTAL_LABELS, ALL_FEATURES } from '@/lib/featureCatalog';
import PortalFeaturePanel from '@/components/backend/PortalFeaturePanel';

export default function SchoolCustomization() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => { loadSchools(); }, []);

  async function loadSchools() {
    setLoading(true);
    try {
      const data = await base44.entities.School.list('-created_date');
      setSchools(data || []);
      if (data?.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(data[0].id);
      }
    } catch { setSchools([]); }
    setLoading(false);
  }

  const filtered = schools.filter(s =>
    (s.schoolName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.schoolCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">School Customization</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create schools, set up admin accounts, and configure portal features per school.</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" /> Build New School
        </Button>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* School List */}
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No schools found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(school => (
                <Card
                  key={school.id}
                  className={`border-0 shadow-sm cursor-pointer transition-all ${selectedSchoolId === school.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedSchoolId(school.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {(school.schoolCode || '?').slice(0, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{school.schoolName}</p>
                      <p className="text-xs text-muted-foreground truncate">{school.schoolCode}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Feature Configuration */}
        {selectedSchool ? (
          <div>
            <Card className="border-0 shadow-sm mb-4">
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedSchool.schoolName}</p>
                    <p className="text-sm text-muted-foreground">{selectedSchool.schoolCode} {selectedSchool.address ? `• ${selectedSchool.address}` : ''}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/backend/schools/${selectedSchool.id}`)}>
                  <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Manage Staff & Classes
                </Button>
              </CardContent>
            </Card>

            <Tabs defaultValue="admin">
              <TabsList className="mb-4">
                <TabsTrigger value="admin">
                  <Shield className="w-3.5 h-3.5 mr-1.5" /> Admin Portal
                </TabsTrigger>
                <TabsTrigger value="teacher">
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Teacher Portal
                </TabsTrigger>
                <TabsTrigger value="student">
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Student Portal
                </TabsTrigger>
                <TabsTrigger value="parent">
                  <UserCog className="w-3.5 h-3.5 mr-1.5" /> Parent Portal
                </TabsTrigger>
                <TabsTrigger value="subscription">
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Subscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin">
                <PortalFeaturePanel school={selectedSchool} role="admin" />
              </TabsContent>
              <TabsContent value="teacher">
                <PortalFeaturePanel school={selectedSchool} role="teacher" />
              </TabsContent>
              <TabsContent value="student">
                <PortalFeaturePanel school={selectedSchool} role="student" />
              </TabsContent>
              <TabsContent value="parent">
                <PortalFeaturePanel school={selectedSchool} role="parent" />
              </TabsContent>
              <TabsContent value="subscription">
                <SubscriptionPricingPanel school={selectedSchool} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a school to configure portal features</p>
              <p className="text-sm mt-1">or click "Build New School" to create one.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showWizard && (
        <SchoolBuilderWizard
          onClose={() => setShowWizard(false)}
          onCreated={(newSchoolId) => {
            setShowWizard(false);
            loadSchools();
            setSelectedSchoolId(newSchoolId);
          }}
        />
      )}
    </div>
  );
}

// ─── Multi-step School Builder Wizard ───────────────────────────

function SchoolBuilderWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState({ schoolName: '', schoolCode: '', address: '', contactEmail: '', contactPhone: '' });
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '' });
  const [createdSchool, setCreatedSchool] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [portalFeatures, setPortalFeatures] = useState({
    admin: getDefaultFeatures('admin'),
    teacher: getDefaultFeatures('teacher'),
    student: getDefaultFeatures('student'),
    parent: getDefaultFeatures('parent'),
  });
  const [activePortal, setActivePortal] = useState('admin');
  const [copied, setCopied] = useState(false);

  function reset() {
    setStep(1);
    setSchool({ schoolName: '', schoolCode: '', address: '', contactEmail: '', contactPhone: '' });
    setAdminForm({ fullName: '', email: '' });
    setCreatedSchool(null);
    setCredentials(null);
    setPortalFeatures({
      teacher: getDefaultFeatures('teacher'),
      student: getDefaultFeatures('student'),
      parent: getDefaultFeatures('parent'),
    });
    setActivePortal('admin');
    setCopied(false);
  }

  async function handleCreateSchool(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await base44.entities.School.create({ ...school, isActive: true, isArchived: false });
      setCreatedSchool(created);
      await logAudit({ schoolId: created.id, schoolName: created.schoolName, action: 'school_created', entityType: 'School', entityId: created.id, performedBy: 'superAdmin', performedByName: 'Super Admin', details: `School "${created.schoolName}" created` });
      setStep(2);
    } catch { toast.error('Failed to create school'); }
    setLoading(false);
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const allUsers = await base44.entities.SchoolUser.list();
      const existingUsernames = (allUsers || []).map(u => u.username).filter(Boolean);
      const username = generateUsername(adminForm.fullName, existingUsernames);
      const tempPassword = generateTemporaryPassword();

      await base44.entities.SchoolUser.create({
        fullName: adminForm.fullName,
        email: adminForm.email,
        username,
        passwordHash: hashPassword(tempPassword),
        role: 'admin',
        schoolId: createdSchool.id,
        schoolName: createdSchool.schoolName,
        mustChangePassword: true,
        isArchived: false,
      });

      await logAudit({ schoolId: createdSchool.id, schoolName: createdSchool.schoolName, action: 'school_admin_created', entityType: 'SchoolUser', performedBy: 'superAdmin', performedByName: 'Super Admin', details: `Admin "${adminForm.fullName}" created for ${createdSchool.schoolName}` });
      setCredentials({ username, password: tempPassword });
      setStep(3);
    } catch { toast.error('Failed to create admin account'); }
    setLoading(false);
  }

  function togglePortalFeature(portal, featureId, checked) {
    setPortalFeatures(prev => ({
      ...prev,
      [portal]: { ...prev[portal], [featureId]: checked },
    }));
  }

  async function handleSaveFeatures() {
    setLoading(true);
    try {
      for (const role of ['admin', 'teacher', 'student', 'parent']) {
        await base44.entities.FeatureToggle.create({
          schoolId: createdSchool.id,
          schoolName: createdSchool.schoolName,
          role,
          features: portalFeatures[role],
          isActive: true,
        });
      }
      clearFeatureCache();
      setStep(4);
    } catch { toast.error('Failed to save feature configuration'); }
    setLoading(false);
  }

  function handleCopy() {
    if (!credentials) return;
    navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDone() {
    reset();
    onCreated(createdSchool?.id);
  }

  const steps = ['School Details', 'Admin Account', 'Portal Features', 'Complete'];
  const currentPortalFeatures = PORTAL_FEATURES[activePortal] || [];
  const currentFeatureList = currentPortalFeatures
    .map(id => ALL_FEATURES.find(f => f.id === id))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b">
          <h2 className="font-bold text-lg">Build New School</h2>
          <div className="flex items-center gap-2 mt-3">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i + 1 <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1 < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i + 1 === step ? 'font-semibold' : 'text-muted-foreground'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`h-px flex-1 ${i + 1 < step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="space-y-2">
                <Label>School Name *</Label>
                <Input value={school.schoolName} onChange={e => setSchool({ ...school, schoolName: e.target.value })} required placeholder="e.g. Greenfield Academy" />
              </div>
              <div className="space-y-2">
                <Label>School Code *</Label>
                <Input value={school.schoolCode} onChange={e => setSchool({ ...school, schoolCode: e.target.value })} required placeholder="e.g. SCH001" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={school.address} onChange={e => setSchool({ ...school, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" value={school.contactEmail} onChange={e => setSchool({ ...school, contactEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input value={school.contactPhone} onChange={e => setSchool({ ...school, contactPhone: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create School & Continue
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="bg-primary/5 p-3 rounded-lg text-sm">
                <strong>School:</strong> {createdSchool?.schoolName}
              </div>
              <div className="space-y-2">
                <Label>Admin Full Name *</Label>
                <Input value={adminForm.fullName} onChange={e => setAdminForm({ ...adminForm, fullName: e.target.value })} required placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Admin Email *</Label>
                <Input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required placeholder="admin@school.com" />
              </div>
              <p className="text-xs text-muted-foreground">A username and temporary password will be generated automatically. Additional staff can be added after setup.</p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Admin Account
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-primary/5 p-3 rounded-lg text-sm">
                <strong>School:</strong> {createdSchool?.schoolName}
              </div>

              <div className="flex gap-2">
                {Object.entries(PORTAL_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePortal(key)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activePortal === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentFeatureList.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <Switch
                      checked={portalFeatures[activePortal][f.id] || false}
                      onCheckedChange={checked => togglePortalFeature(activePortal, f.id, checked)}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleSaveFeatures} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save & Finish
              </Button>
            </div>
          )}

          {step === 4 && credentials && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-700 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">School Created Successfully</span>
                </div>
                <p className="text-sm text-emerald-700 mb-3">{createdSchool?.schoolName} is ready with admin account and portal features configured.</p>
                <div className="space-y-2 text-sm bg-white/60 rounded-lg p-3">
                  <div><span className="text-muted-foreground">Admin Username:</span> <strong>{credentials.username}</strong></div>
                  <div><span className="text-muted-foreground">Temporary Password:</span> <strong>{credentials.password}</strong></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Save these credentials — the password won't be shown again. The admin will be prompted to change it on first login.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Credentials'}
                </Button>
                <Button className="flex-1" onClick={handleDone}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}