import { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '../lib/stores/uiStore';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { FaPlus, FaTrash, FaEdit, FaQuestionCircle, FaVolumeUp, FaFileExcel, FaCheckCircle, FaPlay } from 'react-icons/fa';
import { t, translations } from '../lib/translations/index';
import api from '../lib/api';
import { useOfflineStore } from '../lib/stores/offlineStore';
import PageToolbar from '../components/PageToolbar';
import DataTableSection from '../components/DataTableSection';
import TablePagination from '../components/TablePagination';
import TableRowActions from '../components/TableRowActions';
import { useTablePagination } from '../hooks/use-table-pagination';

// Questions that share an answer prefix in translations (so Options column and edit modal show all answers).
const ANSWER_PREFIX_FALLBACK = {
  client: {
    acknowledge: 'yesno',
    consent: 'yesno',
    q2a: 'q1a',
    q3a: 'q1a',
    q4a: 'q1a',
    q5a: 'q1a',
    q7a: 'q6a',
    q8a: 'q6a',
    q9a: 'q6a',
    q10a: 'q6a',
    q2b: 'q1b',
    q3b: 'q1b',
    q4b: 'q1b',
    q5b: 'q1b',
    q5c1: 'q5c',
    q5c2: 'q5c',
    q5c3: 'q5c',
    q11c: 'q10c',
    q12c: 'q10c',
    q13c: 'q10c',
  },
  provider: { consent: 'yesno', acknowledge: 'yesno', dept: 'd1' },
};

// Get all answer options from translations for a question key (e.g. e1 -> e1_1, e1_2, e1_98)
function getDefaultOptionsFromTranslations(questionKey, questionnaireType) {
  const type = questionnaireType === 'provider' ? 'provider' : 'client';
  const answersEn = translations.en?.[type]?.answers || {};
  const answersKh = translations.kh?.[type]?.answers || {};
  let prefix = questionKey + '_';
  let keys = Object.keys(answersEn).filter((k) => k.startsWith(prefix));
  if (keys.length === 0) {
    const fallbackPrefix = ANSWER_PREFIX_FALLBACK[type]?.[questionKey];
    if (fallbackPrefix) {
      prefix = fallbackPrefix + '_';
      keys = Object.keys(answersEn).filter((k) => k.startsWith(prefix));
    }
  }
  if (keys.length === 0) return [];
  return keys.map((key, index) => {
    const value = key.slice(prefix.length);
    return {
      value,
      text_en: answersEn[key] || '',
      text_kh: answersKh[key] || '',
      order: index
    };
  });
}

// On edit: show ALL answers (saved + from translations), so user can update any. Saved text overrides translation.
function mergeOptionsForEdit(savedOptions, questionKey, questionnaireType, questionType) {
  if (questionType !== 'radio' && questionType !== 'checkbox') return [];
  const fromTranslations = getDefaultOptionsFromTranslations(questionKey, questionnaireType);
  const savedMap = new Map();
  (savedOptions || []).forEach((o, i) => {
    const v = String(o.value ?? '').trim();
    if (v) savedMap.set(v, { value: v, text_en: o.text_en ?? '', text_kh: o.text_kh ?? '', order: o.order ?? i });
  });
  const merged = fromTranslations.map((opt, index) => {
    const saved = savedMap.get(opt.value);
    if (saved) {
      savedMap.delete(opt.value);
      return { ...saved, order: index };
    }
    return { ...opt, order: index };
  });
  savedMap.forEach((saved) => merged.push({ ...saved, order: merged.length }));
  return merged;
}
import AudioRecorder from '../components/AudioRecorder';
export default function QuestionManager() {
  const { locale } = useUIStore();
  const { toast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    questionKey: '',
    questionnaireType: 'client', // 'client' or 'provider'
    section: '',
    questionType: 'text', // 'text', 'radio', 'checkbox', 'textarea'
    textEn: '',
    textKh: '',
    audioUrlEn: null,
    audioUrlKh: null,
    order: 0,
    isActive: true,
    options: [] // [{ value, text_en, text_kh, order }] for radio/checkbox
  });
  const [uploadingEn, setUploadingEn] = useState(false);
  const [uploadingKh, setUploadingKh] = useState(false);
  const [answersModalOpen, setAnswersModalOpen] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/questions');
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditingQuestion(null);
      setAnswersModalOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const questionId = editingQuestion?.id;
    try {
      const isOptionType = formData.questionType === 'radio' || formData.questionType === 'checkbox';
      const normalizedOptions = isOptionType && Array.isArray(formData.options)
        ? formData.options
            .map((o, index) => ({
              value: String(o.value ?? '').trim(),
              text_en: o.text_en ?? '',
              text_kh: o.text_kh ?? '',
              order: o.order ?? index,
            }))
            .filter((o) => o.value)
        : null;
      const dataToSend = {
        ...formData,
        audioUrlEn: formData.audioUrlEn || null,
        audioUrlKh: formData.audioUrlKh || null,
        options: normalizedOptions,
      };

      let response;
      if (questionId) {
        response = await api.put(`/admin/questions/${questionId}`, dataToSend);
      } else {
        response = await api.post('/admin/questions', dataToSend);
      }

      if (response?.data?.queued) {
        toast({
          variant: 'destructive',
          title: 'Offline',
          description: 'Changes queued — connect to the internet and try again.',
        });
        return;
      }

      useOfflineStore.getState().clearCachedResponse('/admin/questions');

      setOpen(false);
      setEditingQuestion(null);
      setFormData({
        questionKey: '',
        questionnaireType: 'client',
        section: '',
        questionType: 'text',
        textEn: '',
        textKh: '',
        audioUrlEn: null,
        audioUrlKh: null,
        order: 0,
        isActive: true,
        options: []
      });
      await fetchQuestions();
      toast({
        title: 'Success',
        description: questionId
          ? (t(locale, 'admin.common.update') || 'Question updated')
          : (t(locale, 'admin.common.create') || 'Question created'),
      });
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || 'Failed to save question',
      });
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    // Support options as array or JSON string (e.g. from some DB drivers)
    let opts = question.options;
    if (typeof opts === 'string') {
      try {
        opts = JSON.parse(opts || '[]');
      } catch {
        opts = [];
      }
    }
    const savedList = Array.isArray(opts) ? opts.map((o) => ({ value: o.value ?? '', text_en: o.text_en ?? '', text_kh: o.text_kh ?? '', order: o.order ?? 0 })) : [];
    // On edit: show ALL answers (from translations + saved), merged so saved text is used when present; user can update any
    const optionsList = mergeOptionsForEdit(savedList, question.question_key, question.questionnaire_type, question.question_type);
    setFormData({
      questionKey: question.question_key,
      questionnaireType: question.questionnaire_type,
      section: question.section,
      questionType: question.question_type,
      textEn: question.text_en,
      textKh: question.text_kh,
      audioUrlEn: question.audio_url_en || null,
      audioUrlKh: question.audio_url_kh || null,
      order: question.order,
      isActive: question.is_active,
      options: optionsList
    });
    setOpen(true);
  };

  const handleDeleteClick = (id) => {
    setQuestionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    
    try {
      await api.delete(`/admin/questions/${questionToDelete}`);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
      fetchQuestions();
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || 'Failed to delete question',
      });
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  const handleNew = () => {
    setEditingQuestion(null);
    const defaultType = activeTab === 'all' ? 'client' : activeTab;
    setFormData({
      questionKey: '',
      questionnaireType: defaultType,
      section: '',
      questionType: 'text',
      textEn: '',
      textKh: '',
      audioUrlEn: null,
      audioUrlKh: null,
      order: questions.length + 1,
      isActive: true,
      options: []
    });
    setOpen(true);
  };

  const showAnswerOptions = formData.questionType === 'radio' || formData.questionType === 'checkbox';
  const addAnswerOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...(prev.options || []), { value: '', text_en: '', text_kh: '', order: (prev.options?.length ?? 0) }]
    }));
  };
  const removeAnswerOption = (index) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };
  const updateAnswerOption = (index, field, value) => {
    setFormData((prev) => {
      const next = [...(prev.options || [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return { ...prev, options: next };
    });
  };

  const handleAudioUpload = async (file, language) => {
    if (!file) return;
    
    if (!formData.questionKey) {
      toast({
        variant: "destructive",
        title: "Missing Key",
        description: "Please enter a question key first before uploading audio",
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('audio', file);
    formDataToSend.append('questionKey', formData.questionKey);
    formDataToSend.append('language', language);

    try {
      if (language === 'en') {
        setUploadingEn(true);
      } else {
        setUploadingKh(true);
      }

      const response = await api.post('/admin/questions/upload-audio', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (language === 'en') {
        setFormData({ ...formData, audioUrlEn: response.data.url });
        setUploadingEn(false);
      } else {
        setFormData({ ...formData, audioUrlKh: response.data.url });
        setUploadingKh(false);
      }
      
      toast({
        title: "Success",
        description: "Audio uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.response?.data?.error || 'Failed to upload audio',
      });
      if (language === 'en') {
        setUploadingEn(false);
      } else {
        setUploadingKh(false);
      }
    }
  };

  // Filter questions based on active tab
  const filteredQuestions = useMemo(
    () =>
      activeTab === 'all'
        ? questions
        : questions.filter((q) => q.questionnaire_type === activeTab),
    [questions, activeTab]
  );

  const sortedFilteredQuestions = useMemo(
    () => [...filteredQuestions].sort((a, b) => a.order - b.order),
    [filteredQuestions]
  );

  const {
    paginatedItems: paginatedQuestions,
    safePage,
    totalPages,
    rangeFrom,
    rangeTo,
    setPage,
  } = useTablePagination(sortedFilteredQuestions, 10, [activeTab, sortedFilteredQuestions.length]);

  const getOptionCount = (question) => {
    const hasOptions = question.question_type === 'radio' || question.question_type === 'checkbox';
    if (!hasOptions) return 0;
    let opts = question.options;
    if (typeof opts === 'string') {
      try {
        opts = JSON.parse(opts || '[]') || [];
      } catch {
        opts = [];
      }
    }
    const savedCount = Array.isArray(opts) ? opts.length : 0;
    const fromTranslations = getDefaultOptionsFromTranslations(
      question.question_key,
      question.questionnaire_type
    );
    return savedCount > 0 ? savedCount : fromTranslations.length;
  };

  const listMeta =
    filteredQuestions.length > 0
      ? `${t(locale, 'admin.questions.totalQuestions', { count: filteredQuestions.length })} · ${t(locale, 'admin.common.showingRange', { from: rangeFrom, to: rangeTo, total: filteredQuestions.length })} · ${t(locale, 'admin.common.pageOf', { page: safePage + 1, total: totalPages })}`
      : t(locale, 'admin.questions.totalQuestions', { count: 0 });

  const formatOptionsForExport = (options, lang = 'en') => {
    if (!Array.isArray(options) || options.length === 0) return '';
    const textKey = lang === 'kh' ? 'text_kh' : 'text_en';
    return options
      .map((o) => {
        const text = (o[textKey] || o.text_en || o.text_kh || '').replace(/\n/g, ' ');
        return `${o.value ?? ''}: ${text}`;
      })
      .join('; ');
  };

  // Get full options list for export: use saved options, or fall back to translation-derived options (same as table)
  const getOptionsForExport = (question) => {
    const hasOptions = question.question_type === 'radio' || question.question_type === 'checkbox';
    if (!hasOptions) return [];
    let opts = question.options;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts || '[]') || []; } catch { opts = []; }
    }
    if (Array.isArray(opts) && opts.length > 0) return opts;
    return getDefaultOptionsFromTranslations(question.question_key, question.questionnaire_type);
  };

  const handleExportToExcel = async () => {
    if (filteredQuestions.length === 0) return;
    const XLSX = await import('xlsx');
    const headers = [
      t(locale, 'admin.questions.questionKey'),
      t(locale, 'admin.questions.type'),
      t(locale, 'admin.questions.section'),
      t(locale, 'admin.questions.questionType'),
      t(locale, 'admin.questions.textEn'),
      t(locale, 'admin.questions.textKh'),
      locale === 'kh' ? 'ជម្រើសចម្លើយ (EN)' : 'Answer options (EN)',
      locale === 'kh' ? 'ជម្រើសចម្លើយ (ខ្មែរ)' : 'Answer options (Khmer)',
      t(locale, 'admin.questions.order'),
      t(locale, 'admin.questions.status'),
    ];
    const rows = filteredQuestions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const opts = getOptionsForExport(q);
        return [
          q.question_key,
          q.questionnaire_type === 'client' ? t(locale, 'admin.questions.client') : t(locale, 'admin.questions.provider'),
          q.section,
          q.question_type,
          q.text_en ?? '',
          q.text_kh ?? '',
          formatOptionsForExport(opts, 'en'),
          formatOptionsForExport(opts, 'kh'),
          q.order,
          q.is_active ? t(locale, 'admin.common.active') : t(locale, 'admin.common.inactive'),
        ];
      });
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, locale === 'kh' ? 'សំណួរ' : 'Questions');
    const fileName = `questions-export-${activeTab}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageToolbar className="flex-col items-stretch [&_button]:w-full sm:flex-row sm:items-center sm:[&_button]:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              disabled={filteredQuestions.length === 0}
              title={filteredQuestions.length === 0 ? (locale === 'kh' ? 'មិនមានទិន្នន័យដើម្បីនាំចេញ' : 'No data to export') : undefined}
              className="gap-1.5 border-primary/30 hover:bg-primary/5 hover:border-primary/50"
            >
              <FaFileExcel className="h-3.5 w-3.5 text-green-600" />
              {t(locale, 'admin.questions.exportToExcel')}
            </Button>
            <Dialog open={open} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleNew} className="gap-1.5">
                  <FaPlus className="h-3.5 w-3.5" />
                  {t(locale, 'admin.questions.addQuestion')}
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border-primary/10 shadow-xl">
            <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
              <DialogTitle className="text-xl">
                {editingQuestion
                  ? t(locale, 'admin.questions.editQuestion')
                  : t(locale, 'admin.questions.addQuestion')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {t(locale, 'admin.questions.formDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-1">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {locale === 'kh' ? 'ព័ត៌មានមូលដ្ឋាន' : 'Basic info'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(locale, 'admin.questions.questionKey')}</Label>
                  <Input
                    value={formData.questionKey}
                    onChange={(e) => setFormData({ ...formData, questionKey: e.target.value })}
                    placeholder="e.g., q1a"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(locale, 'admin.questions.questionnaireType')}</Label>
                  <Select
                    value={formData.questionnaireType}
                    onValueChange={(value) => setFormData({ ...formData, questionnaireType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">{t(locale, 'admin.questions.client')}</SelectItem>
                      <SelectItem value="provider">{t(locale, 'admin.questions.provider')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(locale, 'admin.questions.section')}</Label>
                  <Input
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g., section_1A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(locale, 'admin.questions.questionType')}</Label>
                  <Select
                    value={formData.questionType}
                    onValueChange={(value) => setFormData({ ...formData, questionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{t(locale, 'admin.questions.text')}</SelectItem>
                      <SelectItem value="radio">{t(locale, 'admin.questions.radio')}</SelectItem>
                      <SelectItem value="checkbox">{t(locale, 'admin.questions.checkbox')}</SelectItem>
                      <SelectItem value="textarea">{t(locale, 'admin.questions.textarea')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>

              {showAnswerOptions && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-semibold">{t(locale, 'admin.questions.answerOptions')}</Label>
                    <button
                      type="button"
                      onClick={() => setAnswersModalOpen(true)}
                      className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start px-4 py-3 rounded-lg border-2 border-dashed border-primary/30 bg-background hover:bg-primary/5 hover:border-primary/50 transition-colors text-sm font-medium text-foreground"
                    >
                      <FaQuestionCircle className="h-4 w-4 text-primary" />
                      <span>{t(locale, 'admin.questions.answerOptions')}</span>
                      <Badge variant="secondary" className="ml-1 font-semibold">{(formData.options || []).length}</Badge>
                    </button>
                  </div>
                  <Dialog open={answersModalOpen} onOpenChange={setAnswersModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-xl border-primary/10 shadow-xl">
                      <DialogHeader className="space-y-1.5 pb-3 border-b border-border/50">
                        <DialogTitle className="text-lg">{t(locale, 'admin.questions.answerOptions')}</DialogTitle>
                        <DialogDescription className="text-sm">
                          {t(locale, 'admin.questions.answerOptionsDescription')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col flex-1 min-h-0 space-y-4 py-2">
                        <Button type="button" size="sm" className="w-fit shadow-sm" onClick={addAnswerOption}>
                          <FaPlus className="mr-2 h-4 w-4" />
                          {t(locale, 'admin.questions.addOption')}
                        </Button>
                        <div className="rounded-lg border border-border/60 bg-muted/10 overflow-hidden">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 bg-muted/20">
                            <span className="col-span-2">{t(locale, 'admin.questions.optionValue')}</span>
                            <span className="col-span-4">Text (EN)</span>
                            <span className="col-span-4">អត្ថបទ (ខ្មែរ)</span>
                            <span className="col-span-2 text-right">{t(locale, 'admin.questions.removeOption')}</span>
                          </div>
                          <div className="space-y-0 max-h-[50vh] overflow-y-auto">
                            {(formData.options || []).map((opt, index) => (
                              <div key={index} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 even:bg-muted/10 border-b border-border/40 last:border-b-0">
                                <div className="col-span-2 flex items-center gap-2">
                                  <span className="text-muted-foreground font-mono text-xs w-5">{index + 1}.</span>
                                  <Input
                                    placeholder={t(locale, 'admin.questions.optionValue')}
                                    value={opt.value}
                                    onChange={(e) => updateAnswerOption(index, 'value', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <Input
                                  placeholder="Text (EN)"
                                  value={opt.text_en || ''}
                                  onChange={(e) => updateAnswerOption(index, 'text_en', e.target.value)}
                                  className="col-span-4 h-8 text-sm"
                                />
                                <Input
                                  placeholder="អត្ថបទ (ខ្មែរ)"
                                  value={opt.text_kh || ''}
                                  onChange={(e) => updateAnswerOption(index, 'text_kh', e.target.value)}
                                  className="col-span-4 h-8 text-sm"
                                />
                                <div className="col-span-2 flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeAnswerOption(index)}
                                  >
                                    <FaTrash className="h-3.5 w-3.5" />
                                    <span className="sr-only">{t(locale, 'admin.questions.removeOption')}</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(formData.options || []).length === 0 && (
                            <div className="px-4 py-8 text-center">
                              <FaQuestionCircle className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                {locale === 'kh' ? 'ចុច «បន្ថែមជម្រើស» ដើម្បីបន្ថែមជម្រើសចម្លើយ។' : 'Click "Add option" above to add answer choices.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter className="pt-2 border-t border-border/50">
                        <Button type="button" variant="secondary" onClick={() => setAnswersModalOpen(false)}>
                          {locale === 'kh' ? 'រួចរាល់' : 'Done'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {locale === 'kh' ? 'អត្ថបទសំណួរ' : 'Question text'}
                </h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(locale, 'admin.questions.textEn')}</Label>
                  <Textarea
                    value={formData.textEn}
                    onChange={(e) => setFormData({ ...formData, textEn: e.target.value })}
                    placeholder="Question text in English"
                    rows={3}
                    required
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t(locale, 'admin.questions.textKh')}</Label>
                  <Textarea
                    value={formData.textKh}
                    onChange={(e) => setFormData({ ...formData, textKh: e.target.value })}
                    placeholder="Question text in Khmer"
                    rows={3}
                    required
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FaVolumeUp className="text-primary/70" />
                  Voice-over Audio
                </h3>
                
                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 gap-2 mb-4">
                    <TabsTrigger value="en">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        English
                        {formData.audioUrlEn && <FaCheckCircle className="h-3 w-3 text-green-500 ml-1" />}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="kh">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                        Khmer
                        {formData.audioUrlKh && <FaCheckCircle className="h-3 w-3 text-green-500 ml-1" />}
                      </div>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="en" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border/60 bg-card shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      
                      <div className="flex-1 flex flex-col justify-center my-1">
                        <AudioRecorder
                          onUpload={async (file) => {
                            await handleAudioUpload(file, 'en');
                          }}
                          disabled={!formData.questionKey}
                          language="en"
                        />
                      </div>
                      
                      {formData.audioUrlEn && (
                        <div className="flex items-center justify-between p-2.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 mt-2 mx-1">
                          <div className="flex items-center gap-2">
                            <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Audio uploaded</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900"
                              onClick={() => {
                                const audio = new Audio(formData.audioUrlEn);
                                audio.play();
                              }}
                            >
                              <FaPlay className="h-3 w-3 mr-1.5" />
                              <span className="text-[11px]">Play</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                              title="Delete existing audio"
                              onClick={() => setFormData({ ...formData, audioUrlEn: null })}
                            >
                              <FaTrash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-3 border-t border-border/60 mt-auto space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground block">Or upload existing file:</Label>
                        <div className="relative group">
                          <Input
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file size (max 50MB)
                                if (file.size > 50 * 1024 * 1024) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: 'File size must be less than 50MB',
                                  });
                                  e.target.value = '';
                                  return;
                                }
                                
                                // Validate file type
                                const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/flac'];
                                if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: 'Please select a valid audio file',
                                  });
                                  e.target.value = '';
                                  return;
                                }
                                
                                handleAudioUpload(file, 'en');
                              }
                            }}
                            disabled={uploadingEn || !formData.questionKey}
                            className="h-11 text-[11px] cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:transition-colors w-full bg-muted/30 hover:bg-muted/50 transition-colors peer"
                            id="en-audio-upload"
                          />
                          
                          {/* Upload progress indicator */}
                          {uploadingEn && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-md flex items-center justify-center">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
                                Uploading...
                              </div>
                            </div>
                          )}
                          
                          {/* File format hint */}
                          <div className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity">
                            Supports: MP3, WAV, M4A, AAC, OGG, FLAC (max 50MB)
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="kh" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border/60 bg-card shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                      
                      <div className="flex-1 flex flex-col justify-center my-1">
                        <AudioRecorder
                          onUpload={async (file) => {
                            await handleAudioUpload(file, 'kh');
                          }}
                          disabled={!formData.questionKey}
                          language="kh"
                        />
                      </div>
                      
                      {formData.audioUrlKh && (
                        <div className="flex items-center justify-between p-2.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 mt-2 mx-1">
                          <div className="flex items-center gap-2">
                            <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Audio uploaded</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900"
                              onClick={() => {
                                const audio = new Audio(formData.audioUrlKh);
                                audio.play();
                              }}
                            >
                              <FaPlay className="h-3 w-3 mr-1.5" />
                              <span className="text-[11px]">Play</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                              title="Delete existing audio"
                              onClick={() => setFormData({ ...formData, audioUrlKh: null })}
                            >
                              <FaTrash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-3 border-t border-border/60 mt-auto space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground block">Or upload existing file:</Label>
                        <div className="relative group">
                          <Input
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file size (max 50MB)
                                if (file.size > 50 * 1024 * 1024) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: 'File size must be less than 50MB',
                                  });
                                  e.target.value = '';
                                  return;
                                }
                                
                                // Validate file type
                                const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/flac'];
                                if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: 'Please select a valid audio file',
                                  });
                                  e.target.value = '';
                                  return;
                                }
                                
                                handleAudioUpload(file, 'kh');
                              }
                            }}
                            disabled={uploadingKh || !formData.questionKey}
                            className="h-11 text-[11px] cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:transition-colors w-full bg-muted/30 hover:bg-muted/50 transition-colors peer"
                            id="kh-audio-upload"
                          />
                          
                          {/* Upload progress indicator */}
                          {uploadingKh && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-md flex items-center justify-center">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
                                Uploading...
                              </div>
                            </div>
                          )}
                          
                          {/* File format hint */}
                          <div className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity">
                            Supports: MP3, WAV, M4A, AAC, OGG, FLAC (max 50MB)
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {!formData.questionKey && (
                  <div className="p-2.5 mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
                    <span className="text-amber-500 text-sm">⚠️</span>
                    <p className="text-xs text-amber-700 dark:text-amber-400 m-0">
                      Enter a <strong>Question Key</strong> first to enable audio recording.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {locale === 'kh' ? 'ការកំណត់' : 'Settings'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t(locale, 'admin.questions.order')}</Label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t(locale, 'admin.questions.isActive')}</Label>
                    <Select
                      value={formData.isActive ? 'true' : 'false'}
                      onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t(locale, 'admin.common.yes')}</SelectItem>
                        <SelectItem value="false">{t(locale, 'admin.common.no')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  size="sm"
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  {t(locale, 'admin.common.cancel')}
                </Button>
                <Button 
                  type="submit"
                  size="sm"
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {editingQuestion
                    ? t(locale, 'admin.common.update')
                    : t(locale, 'admin.common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
      </PageToolbar>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1.5 sm:grid sm:max-w-lg sm:grid-cols-3 sm:gap-2">
          <TabsTrigger value="all">{t(locale, 'admin.common.all')}</TabsTrigger>
          <TabsTrigger value="client">{t(locale, 'admin.questions.client')}</TabsTrigger>
          <TabsTrigger value="provider">{t(locale, 'admin.questions.provider')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3">
          {filteredQuestions.length === 0 ? (
            <EmptyState
              icon={FaQuestionCircle}
              title={t(locale, 'admin.questions.noQuestions')}
              description={t(locale, 'admin.questions.noQuestionsDescription')}
            />
          ) : (
            <DataTableSection meta={listMeta}>
              <>
                {/* Phone / narrow: card list */}
                <div className="space-y-2 md:hidden">
                  {paginatedQuestions.map((question) => {
                    const hasOptions =
                      question.question_type === 'radio' || question.question_type === 'checkbox';
                    const optionCount = getOptionCount(question);
                    const rawText = locale === 'en' ? question.text_en : question.text_kh;
                    const previewText = (rawText || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                    return (
                      <div
                        key={question.id}
                        className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <code className="text-xs font-semibold text-primary">{question.question_key}</code>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {question.questionnaire_type === 'client'
                              ? t(locale, 'admin.questions.client')
                              : t(locale, 'admin.questions.provider')}
                          </Badge>
                        </div>
                        <p className={`text-sm leading-snug line-clamp-3 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                          {previewText || '—'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{question.section}</span>
                          <span>·</span>
                          <span>#{question.order}</span>
                          {hasOptions && (
                            <>
                              <span>·</span>
                              <span>
                                {t(locale, 'admin.questions.answers')}: {optionCount}
                              </span>
                            </>
                          )}
                          <Badge
                            variant={question.is_active ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {question.is_active
                              ? t(locale, 'admin.common.active')
                              : t(locale, 'admin.common.inactive')}
                          </Badge>
                        </div>
                        <div className="flex justify-end border-t border-border/40 pt-2">
                          <TableRowActions
                            onEdit={() => handleEdit(question)}
                            onDelete={() => handleDeleteClick(question.id)}
                            editTitle={t(locale, 'admin.users.edit')}
                            deleteTitle={t(locale, 'admin.common.delete')}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet+ : table with horizontal scroll */}
                <div className="hidden md:block">
                  <Table containerClassName="min-w-[52rem]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="font-semibold text-muted-foreground">{t(locale, 'admin.questions.questionKey')}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t(locale, 'admin.questions.type')}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t(locale, 'admin.questions.section')}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{locale === 'en' ? t(locale, 'admin.questions.textEn') : t(locale, 'admin.questions.textKh')}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t(locale, 'admin.questions.order')}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground" title={t(locale, 'admin.questions.answersOnlyForChoice')}>
                          {t(locale, 'admin.questions.answers')}
                        </TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t(locale, 'admin.questions.status')}</TableHead>
                        <TableHead className="text-right w-[88px] font-semibold text-muted-foreground">{t(locale, 'admin.common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuestions.map((question) => {
                        const hasOptions =
                          question.question_type === 'radio' || question.question_type === 'checkbox';
                        const optionCount = getOptionCount(question);
                        return (
                          <TableRow key={question.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-sm">{question.question_key}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {question.questionnaire_type === 'client'
                                  ? t(locale, 'admin.questions.client')
                                  : t(locale, 'admin.questions.provider')}
                              </Badge>
                            </TableCell>
                            <TableCell>{question.section}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {locale === 'en' ? question.text_en : question.text_kh}
                            </TableCell>
                            <TableCell>{question.order}</TableCell>
                            <TableCell title={hasOptions ? undefined : t(locale, 'admin.questions.answersOnlyForChoice')}>
                              {hasOptions ? (
                                <Badge variant="secondary" className="font-mono tabular-nums">
                                  {optionCount}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">{t(locale, 'admin.questions.na')}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={question.is_active ? 'default' : 'secondary'}>
                                {question.is_active
                                  ? t(locale, 'admin.common.active')
                                  : t(locale, 'admin.common.inactive')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <TableRowActions
                                onEdit={() => handleEdit(question)}
                                onDelete={() => handleDeleteClick(question.id)}
                                editTitle={t(locale, 'admin.users.edit')}
                                deleteTitle={t(locale, 'admin.common.delete')}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  locale={locale}
                  total={sortedFilteredQuestions.length}
                  safePage={safePage}
                  totalPages={totalPages}
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  onPrev={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                />
              </>
            </DataTableSection>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(locale, 'admin.common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(locale, 'admin.questions.areYouSureDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t(locale, 'admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t(locale, 'admin.common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

