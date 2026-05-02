import React, { useState, useRef, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Check, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATE_CSV = `fullName,email,classId,phone
John Doe,john.doe@example.com,CLASS_ID_1,+1-555-0001
Jane Smith,jane.smith@example.com,CLASS_ID_1,+1-555-0002
Bob Johnson,bob.johnson@example.com,CLASS_ID_2,+1-555-0003`;

export default function AdminBulkStudentImport() {
  const { schoolUser: user } = useSchoolAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const cls = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false });
      setClasses(cls || []);
    } finally {
      setLoadingClasses(false);
    }
  }

  function downloadTemplate() {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(TEMPLATE_CSV));
    element.setAttribute('download', 'student_import_template.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.some(v => v)) { // Skip empty rows
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        data.push(row);
      }
    }
    return data;
  }

  async function handleFileSelect(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const data = parseCSV(text);
        
        if (data.length === 0) {
          toast.error('No valid data found in CSV');
          return;
        }

        // Validate required fields
        const hasErrors = data.some((row, idx) => {
          if (!row.fullname) {
            toast.error(`Row ${idx + 2}: fullName is required`);
            return true;
          }
          if (!row.classid) {
            toast.error(`Row ${idx + 2}: classId is required`);
            return true;
          }
          return false;
        });

        if (hasErrors) return;

        setFile(selectedFile);
        setParsedData(data);
        setResults(null);
      } catch (err) {
        toast.error('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(selectedFile);
  }

  async function handleImport() {
    if (parsedData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setImporting(true);
    const importResults = { success: 0, failed: 0, errors: [] };

    try {
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        try {
          const selectedClass = classes.find(c => c.id === row.classid);
          
          await base44.entities.SchoolUser.create({
            fullName: row.fullname || '',
            email: row.email || '',
            phone: row.phone || '',
            role: 'student',
            schoolId: user.schoolId,
            schoolName: user.schoolName,
            classId: row.classid || '',
            className: selectedClass?.className || '',
            baseLevel: selectedClass?.baseLevel || '',
            educationLevel: selectedClass?.educationLevel || '',
            academicTrack: selectedClass?.academicTrack || '',
            username: row.email || `student_${Date.now()}_${i}`,
            mustChangePassword: true,
          });
          importResults.success++;
        } catch (err) {
          importResults.failed++;
          importResults.errors.push(`Row ${i + 2}: ${err.message}`);
        }
      }

      setResults(importResults);
      if (importResults.success > 0) {
        toast.success(`${importResults.success} students imported successfully`);
      }
      if (importResults.failed > 0) {
        toast.error(`${importResults.failed} students failed to import`);
      }
      
      // Reset
      setFile(null);
      setParsedData([]);
      fileInputRef.current.value = '';
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Bulk Import Students</h1>
        <p className="text-muted-foreground">Import multiple students from a CSV file</p>
      </div>

      {/* Template Download Card */}
      <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Get Started</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Download the template CSV file to see the required format</p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={importing || loadingClasses}
            />
            <p className="text-xs text-muted-foreground">
              Required columns: fullName, classId. Optional: email, phone
            </p>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Preview ({parsedData.length} rows)</h4>
              <div className="border rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-left font-medium">Class ID</th>
                      <th className="px-3 py-2 text-left font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{row.fullname}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                        <td className="px-3 py-2">{row.classid}</td>
                        <td className="px-3 py-2">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-xs text-muted-foreground">... and {parsedData.length - 10} more rows</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || importing || loadingClasses}
              className="flex-1"
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {importing ? 'Importing...' : 'Import Students'}
            </Button>
            {file && (
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setResults(null);
                  fileInputRef.current.value = '';
                }}
                disabled={importing}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.failed === 0 ? (
                <>
                  <Check className="w-5 h-5 text-green-600" /> Import Complete
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" /> Import Completed with Issues
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <p className="text-xs text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{results.success}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{results.failed}</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">Errors</h4>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-32 overflow-y-auto text-xs space-y-1">
                  {results.errors.map((err, idx) => (
                    <div key={idx} className="text-red-700 dark:text-red-400">{err}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}