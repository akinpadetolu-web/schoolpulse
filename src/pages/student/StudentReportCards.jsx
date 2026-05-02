import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FileText, Eye, Loader2, Download, Loader } from 'lucide-react';
import { toast } from 'sonner';
import ReportCardViewer from '@/components/school/ReportCardViewer';

export default function StudentReportCards() {
  const { schoolUser: user } = useSchoolAuth();
  const [reportCards, setReportCards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [cards, tmpl] = await Promise.all([
      base44.entities.ReportCard.filter({ schoolId: user?.schoolId, studentId: user?.id }),
      base44.entities.ReportCardTemplate.filter({ schoolId: user?.schoolId }),
    ]);
    setReportCards((cards || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setTemplates(tmpl || []);
    setLoading(false);
  }

  const getTemplate = (templateId) => templates.find(t => t.id === templateId);

  async function handleDownload(cardId) {
    try {
      setDownloading(cardId);
      const response = await base44.functions.invoke('downloadReportCard', { reportCardId: cardId });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${cardId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report card downloaded');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download report card');
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Report Cards</h1>

      {reportCards.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No report cards available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reportCards.map(rc => (
            <Card key={rc.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{rc.period}</h3>
                    <p className="text-sm text-muted-foreground">{rc.className} • Generated {rc.generatedDate || 'N/A'}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{rc.overallLetterGrade || '-'}</Badge>
                      <Badge variant="outline">{rc.overallAverage ?? '-'}%</Badge>
                      {rc.promotionRecommendation && (
                        <Badge className={
                          rc.promotionRecommendation === 'promote' ? 'bg-green-100 text-green-700' :
                          rc.promotionRecommendation === 'repeat' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {rc.promotionRecommendation}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCard(rc)}>
                      <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(rc.id)} disabled={downloading === rc.id}>
                      {downloading === rc.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedCard && (
            <ReportCardViewer
              reportCard={selectedCard}
              template={getTemplate(selectedCard.templateId)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}