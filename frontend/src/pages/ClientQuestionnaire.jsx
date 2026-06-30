import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
import { FaSpinner, FaCheckCircle, FaHospital, FaClipboardCheck, FaArrowRight } from 'react-icons/fa';
import { translations } from '../lib/translations/index';
import { useUIStore } from '../lib/stores/uiStore';
import { useQuestionnaireLocale } from '../hooks/use-questionnaire-locale';
import TTSButton from '../components/TTSButton';
import ClientToolbar from '../components/client/ClientToolbar';
import {
  CLIENT_CONTAINER,
  CLIENT_QUESTION_OPTION_GRID,
  CLIENT_OPTION_GRID_TWO,
  clientOptionLabelClass,
  getClientOptionGridClass,
  CLIENT_QUESTION_LABEL,
  CLIENT_QUESTION_LABEL_ROW,
  CLIENT_INPUT_CLASS,
  CLIENT_SUBMIT_BUTTON,
  CLIENT_RADIO_CHECKBOX,
  CLIENT_OPTION_TEXT,
  CLIENT_QUESTION_BLOCK,
  CLIENT_BULLET,
  CLIENT_PAGE_TITLE,
  CLIENT_SECTION_TITLE,
  CLIENT_CONSENT_BOX,
  CLIENT_CONSENT_TEXT,
  CLIENT_STICKY_FOOTER,
  CLIENT_THANK_CARD,
} from '../components/client/clientStyles';

export default function ClientQuestionnaire() {
  const { token, locale: localeParam = 'kh', uuid, index } = useParams();
  const locale = useQuestionnaireLocale(localeParam);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState('');
  const { initTheme } = useUIStore();

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    // If token is "index" or missing, redirect to site selection (like old system)
    if (!token || token === 'index') {
      navigate(`/client/index/${locale || 'kh'}`, { replace: true });
      return;
    }
    
    // Redirect section1 to section1a if needed (following old system flow)
    if (index === 'section1' && uuid) {
      navigate(`/client/${token}/${locale}/${uuid}/section1a`, { replace: true });
      return;
    }
    
    // Fix: If index is a locale code (kh/en) instead of a section name, redirect to consent
    if (uuid && (index === 'kh' || index === 'en')) {
      navigate(`/client/${token}/${index}/${uuid}/consent`, { replace: true });
      return;
    }
    
    loadPage();
  }, [token, locale, uuid, index, navigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [index, uuid]);

  // Handle q13c change to enable/disable q14c (following old system behavior)
  useEffect(() => {
    if (index === 'section6c') {
      // q14c should be disabled unless q13c === '1' or 1
      const shouldDisable = formData.q13c !== '1' && formData.q13c !== 1;
      if (shouldDisable && formData.q14c) {
        setFormData(prev => ({ ...prev, q14c: '' }));
      }
    }
  }, [formData.q13c, index]);

  // Debug: Log current route params
  useEffect(() => {
  }, [token, locale, uuid, index]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');
      const url = uuid && index 
        ? `/questionnaire/client/${token}/${locale || 'kh'}/${uuid}/${index}`
        : `/questionnaire/client/${token}/${locale || 'kh'}`;
      
      const response = await api.get(url);
      setPageData(response.data);
      
      // If we got a UUID but don't have one in URL, redirect
      if (response.data.uuid && !uuid && !index) {
        navigate(`/client/${token}/${locale || 'kh'}/${response.data.uuid}/consent`, { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error loading page:', error);
      setError(error.response?.data?.error || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked ? value : undefined
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Handle q13c change to enable/disable q14c (following old system)
    if (name === 'q13c' && index === 'section6c') {
      if (value !== '1' && value !== 1) {
        setFormData(prev => ({ ...prev, q14c: '' }));
      }
    }
  };

  const t = (key, type = 'questions') => {
    // Check questions first, then answers
    return translations[locale]?.client?.[type]?.[key] 
      || translations[locale]?.client?.questions?.[key]
      || translations[locale]?.client?.answers?.[key]
      || translations.en?.client?.[type]?.[key]
      || translations.en?.client?.questions?.[key]
      || translations.en?.client?.answers?.[key]
      || key;
  };

  const ta = (key) => {
    return translations[locale]?.client?.answers?.[key] || translations.en?.client?.answers?.[key] || key;
  };

  // Calculate progress
  const getProgress = () => {
    const sections = ['consent', 'section1a', 'section1a1', 'section1b', 'section1c', 'section5c', 'section6c'];
    const currentIndex = sections.indexOf(index || 'consent');
    return currentIndex >= 0 ? ((currentIndex + 1) / sections.length) * 100 : 0;
  };

  const getSectionNumber = () => {
    const sections = ['consent', 'section1a', 'section1a1', 'section1b', 'section1c', 'section5c', 'section6c'];
    const currentIndex = sections.indexOf(index || 'consent');
    return currentIndex >= 0 ? currentIndex + 1 : 0;
  };

  const getTotalSections = () => {
    return 7; // consent + 6 sections
  };

  // Render radio button question
  const renderRadioQuestion = (questionKey, name, options, required = true) => {
    const questionText = t(questionKey);
    const gridClass = getClientOptionGridClass(options.length, 'radio');
    return (
      <div className={CLIENT_QUESTION_BLOCK}>
        <Label className={`${CLIENT_QUESTION_LABEL} ${CLIENT_QUESTION_LABEL_ROW} ${locale === 'kh' ? 'font-khmer' : ''}`}>
          <span className={CLIENT_BULLET}>•</span>
          <span className={`flex-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>{questionText}</span>
          <TTSButton text={questionText} languageCode={locale} />
        </Label>
        <div className={`${gridClass} mt-2`}>
          {options.map(opt => {
            const isSelected = formData[name] === opt.value || formData[name] === String(opt.value);
            return (
              <label
                key={opt.value}
                htmlFor={`${name}_${opt.value}`}
                className={clientOptionLabelClass(isSelected)}
              >
                <input
                  type="radio"
                  id={`${name}_${opt.value}`}
                  name={name}
                  value={opt.value}
                  checked={isSelected}
                  onChange={handleInputChange}
                  className={CLIENT_RADIO_CHECKBOX}
                  required={required}
                />
                <span className={`${CLIENT_OPTION_TEXT} ${isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'} ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {ta(opt.key)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Render checkbox question (multi-select)
  const renderCheckboxQuestion = (questionKey, namePrefix, options, required = false, requireAtLeastOne = false) => {
    // Check if at least one checkbox is checked (for q3c validation like old system)
    const hasAtLeastOne = options.some(opt => 
      formData[`${namePrefix}_${opt.value}`] === '1' || formData[`${namePrefix}_${opt.value}`] === 1
    );
    
    const questionText = t(questionKey);
    return (
      <div className={CLIENT_QUESTION_BLOCK}>
        <Label className={`${CLIENT_QUESTION_LABEL} ${CLIENT_QUESTION_LABEL_ROW} ${locale === 'kh' ? 'font-khmer' : ''}`}>
          <span className={CLIENT_BULLET}>•</span>
          <span className={`flex-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>{questionText}</span>
          <TTSButton text={questionText} languageCode={locale} />
        </Label>
        <div className={`${getClientOptionGridClass(options.length, 'checkbox')} mt-2`}>
          {options.map(opt => {
            const isChecked = formData[`${namePrefix}_${opt.value}`] === '1' || formData[`${namePrefix}_${opt.value}`] === 1;
            // For q3c, first option is required initially, but becomes optional if any other is checked
            const isFirstOption = opt.value === '1';
            const isRequired = requireAtLeastOne && isFirstOption && !hasAtLeastOne;
            
            return (
              <label
                key={opt.value}
                htmlFor={`${namePrefix}_${opt.value}`}
                className={clientOptionLabelClass(isChecked, { compact: true })}
              >
                <input
                  type="checkbox"
                  id={`${namePrefix}_${opt.value}`}
                  name={`${namePrefix}_${opt.value}`}
                  value="1"
                  checked={isChecked}
                  onChange={handleInputChange}
                  required={isRequired}
                  className={`${CLIENT_RADIO_CHECKBOX} rounded`}
                />
                <span className={`${CLIENT_OPTION_TEXT} ${isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'} ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {ta(opt.key)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Render text input question
  const renderTextQuestion = (questionKey, name, placeholder = '', required = false, disabled = false, type = 'text') => {
    const questionText = t(questionKey);
    return (
      <div className={CLIENT_QUESTION_BLOCK}>
        <Label htmlFor={name} className={`${CLIENT_QUESTION_LABEL} ${CLIENT_QUESTION_LABEL_ROW} ${locale === 'kh' ? 'font-khmer' : ''}`}>
          <span className={CLIENT_BULLET}>•</span>
          <span className={`flex-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>{questionText}</span>
          <TTSButton text={questionText} languageCode={locale} />
        </Label>
        <Input
          id={name}
          name={name}
          type={type}
          value={formData[name] || ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={CLIENT_INPUT_CLASS}
        />
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Determine the section index based on current page state
      // If we're on consent page (no index or index is 'consent'), use 'consent'
      // Otherwise use the current index
      let sectionIndex = 'consent';
      
      // Check if we're on a consent page - if no uuid and no index, or index is 'consent'
      const isConsentPage = (!uuid && !index) || index === 'consent' || (pageData?.page === 'client' && !index);
      
      // Also check if index is a valid section name (not a locale code)
      const validSections = ['consent', 'section1a', 'section1a1', 'section1b', 'section1c', 'section5c', 'section6c', 'thank'];
      const isValidSection = index && validSections.includes(index);
      
      if (isConsentPage || (!isValidSection && !uuid)) {
        sectionIndex = 'consent';
      } else if (isValidSection && index !== 'thank') {
        sectionIndex = index;
      }
      
      // Ensure q9a is always sent (hidden field in old system, defaults to 0)
      const submitData = { 
        ...formData, 
        locale: locale || 'kh', 
        _uri: uuid,
        q9a: formData.q9a || '0' // Always include q9a, default to 0 if not set
      };
      
      const response = await api.post(
        `/questionnaire/client/${token}/${sectionIndex}`,
        submitData
      );
      
      
      if (response.data.redirect) {
        // Ensure redirect path is correct
        const redirectPath = response.data.redirect.startsWith('/') 
          ? response.data.redirect 
          : `/${response.data.redirect}`;
        navigate(redirectPath);
      } else {
        console.warn('[Submit] No redirect in response:', response.data);
      }
    } catch (error) {
      console.error('Error saving:', error);
      setError(error.response?.data?.error || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-background ${locale === 'kh' ? 'font-khmer' : ''} relative`} lang={locale}>
        <ClientToolbar locale={locale} />
        <div className={CLIENT_CONTAINER}>
          {/* Progress Bar Skeleton */}
          <Card className="mb-6 border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-4 w-full rounded-full" />
            </CardContent>
          </Card>

          {/* Main Form Card Skeleton */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="border-b border-border/50 p-0 pb-4 mb-6">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3 mb-8 rounded-2xl border border-border/50 p-4">
                    <Skeleton className="h-6 w-3/4" />
                    <div className={`${CLIENT_QUESTION_OPTION_GRID} mt-3`}>
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-20 w-full rounded-xl" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-border/50">
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center ${locale === 'kh' ? 'font-khmer' : ''}`} lang={locale}>
        <div className="w-full max-w-2xl mx-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return null;
  }

  // Render thank you page
  if (index === 'thank') {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background ${locale === 'kh' ? 'font-khmer' : ''} relative`} lang={locale}>
        <ClientToolbar locale={locale} />
        <Card className={CLIENT_THANK_CARD}>
          <CardHeader className="pb-3">
            <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FaCheckCircle className="text-4xl text-primary" />
            </div>
            <CardTitle className={`text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent ${locale === 'kh' ? 'font-khmer' : ''}`}>
              {locale === 'en' ? 'Thank You!' : 'សូមអរគុណ!'}
            </CardTitle>
            <CardDescription className={`text-sm md:text-base ${locale === 'kh' ? 'font-khmer' : ''}`}>
              {locale === 'en' 
                ? 'Thank you for completing the questionnaire.' 
                : 'សូមអរគុណសម្រាប់ការបំពេញ។'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className={`text-sm text-muted-foreground flex items-center justify-center gap-2 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  <FaCheckCircle className="text-primary" />
                  {locale === 'en'
                    ? 'Your responses have been saved successfully.'
                    : 'ការឆ្លើយតបរបស់អ្នកត្រូវបានរក្សាទុកដោយជោគជ័យ។'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render consent page - matching old form structure
  if (index === 'consent' || (!index && pageData?.page === 'client')) {
    return (
      <div className={`min-h-screen bg-background ${locale === 'kh' ? 'font-khmer' : ''} relative`} lang={locale}>
        <ClientToolbar locale={locale} />
        <div className={CLIENT_CONTAINER}>
          <div className="mb-6">
            <h2 className={`${CLIENT_PAGE_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
              {t('title')} {pageData?.site ? `- ${pageData.site}` : ''}
            </h2>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-0">
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="mb-6">
                <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {t('section_1A')}
                </h3>
              </div>

              <form onSubmit={handleSubmit}>
                <div className={CLIENT_CONSENT_BOX}>
                  <p
                    className={`${CLIENT_CONSENT_TEXT} ${locale === 'kh' ? 'font-khmer' : ''}`}
                    dangerouslySetInnerHTML={{ __html: t('acknowledge') }}
                  />
                </div>

                <div className={`${CLIENT_OPTION_GRID_TWO} mb-4`}>
                  <label 
                    htmlFor="consent1"
                    className={`${clientOptionLabelClass(formData.consent === '1' || formData.consent === 1)} ${locale === 'kh' ? 'font-khmer' : ''}`}
                  >
                    <input
                      type="radio"
                      id="consent1"
                      name="consent"
                      value="1"
                      checked={formData.consent === '1' || formData.consent === 1}
                      onChange={handleInputChange}
                      className={CLIENT_RADIO_CHECKBOX}
                      required
                    />
                    <span className={CLIENT_OPTION_TEXT}>{ta('yesno_1')}</span>
                  </label>
                  <label 
                    htmlFor="consent2"
                    className={`${clientOptionLabelClass(formData.consent === '2' || formData.consent === 2)} ${locale === 'kh' ? 'font-khmer' : ''}`}
                  >
                    <input
                      type="radio"
                      id="consent2"
                      name="consent"
                      value="2"
                      checked={formData.consent === '2' || formData.consent === 2}
                      onChange={handleInputChange}
                      className={CLIENT_RADIO_CHECKBOX}
                      required
                    />
                    <span className={CLIENT_OPTION_TEXT}>{ta('yesno_2')}</span>
                  </label>
                </div>

                <div className={`mt-4 ${CLIENT_STICKY_FOOTER}`}>
                  <Button 
                    type="submit" 
                    disabled={saving || !formData.consent} 
                    className={CLIENT_SUBMIT_BUTTON}
                    size="sm"
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        {locale === 'en' ? 'Saving...' : 'កំពុងរក្សាទុក...'}
                      </>
                    ) : (
                      locale === 'en' ? 'Next' : 'បន្ត'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render section-specific forms
  const renderSectionForm = () => {
    switch (index) {
      case 'section1a':
        return (
          <>
            <div className="mb-6 pb-4 border-b border-border/50">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('section_1A')}</h3>
              <p className={`text-sm text-muted-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>{locale === 'en' ? 'Please rate your satisfaction level' : 'សូមដាក់ពិន្ទុកម្រិតពេញចិត្តរបស់អ្នក'}</p>
            </div>
            {renderRadioQuestion('q1a', 'q1a', [
              { value: '1', key: 'q1a_1' },
              { value: '2', key: 'q1a_2' },
              { value: '3', key: 'q1a_3' },
              { value: '98', key: 'q1a_98' }
            ])}
            {renderRadioQuestion('q2a', 'q2a', [
              { value: '1', key: 'q1a_1' },
              { value: '2', key: 'q1a_2' },
              { value: '3', key: 'q1a_3' },
              { value: '98', key: 'q1a_98' }
            ])}
            {renderRadioQuestion('q3a', 'q3a', [
              { value: '1', key: 'q1a_1' },
              { value: '2', key: 'q1a_2' },
              { value: '3', key: 'q1a_3' },
              { value: '98', key: 'q1a_98' }
            ])}
            {renderRadioQuestion('q4a', 'q4a', [
              { value: '1', key: 'q1a_1' },
              { value: '2', key: 'q1a_2' },
              { value: '3', key: 'q1a_3' },
              { value: '98', key: 'q1a_98' }
            ])}
            {renderRadioQuestion('q5a', 'q5a', [
              { value: '1', key: 'q1a_1' },
              { value: '2', key: 'q1a_2' },
              { value: '3', key: 'q1a_3' },
              { value: '98', key: 'q1a_98' }
            ])}
          </>
        );

      case 'section1a1':
        return (
          <>
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('section_1A1')}</h3>
            </div>
            {renderRadioQuestion('q6a', 'q6a', [
              { value: '1', key: 'q6a_1' },
              { value: '2', key: 'q6a_2' },
              { value: '98', key: 'q6a_98' },
              { value: '99', key: 'q6a_99' }
            ])}
            {renderRadioQuestion('q7a', 'q7a', [
              { value: '1', key: 'q6a_1' },
              { value: '2', key: 'q6a_2' },
              { value: '98', key: 'q6a_98' },
              { value: '99', key: 'q6a_99' }
            ])}
            {renderRadioQuestion('q8a', 'q8a', [
              { value: '1', key: 'q6a_1' },
              { value: '2', key: 'q6a_2' },
              { value: '98', key: 'q6a_98' },
              { value: '99', key: 'q6a_99' }
            ])}
            {/* q9a is hidden in old system but still needs to be sent - default to 0 */}
            <input type="hidden" name="q9a" value={formData.q9a || '0'} />
            {renderRadioQuestion('q10a', 'q10a', [
              { value: '1', key: 'q6a_1' },
              { value: '2', key: 'q6a_2' },
              { value: '98', key: 'q6a_98' },
              { value: '99', key: 'q6a_99' }
            ])}
          </>
        );

      case 'section1b':
        return (
          <>
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('section_1B')}</h3>
              <h4 className={`text-sm font-semibold text-primary/80 mb-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('part1b')}</h4>
            </div>
            {renderRadioQuestion('q1b', 'q1b', [
              { value: '1', key: 'q1b_1' },
              { value: '2', key: 'q1b_2' },
              { value: '3', key: 'q1b_3' },
              { value: '4', key: 'q1b_4' },
              { value: '98', key: 'q1b_98' }
            ])}
            {renderRadioQuestion('q2b', 'q2b', [
              { value: '1', key: 'q1b_1' },
              { value: '2', key: 'q1b_2' },
              { value: '3', key: 'q1b_3' },
              { value: '4', key: 'q1b_4' },
              { value: '98', key: 'q1b_98' }
            ])}
            {renderRadioQuestion('q3b', 'q3b', [
              { value: '1', key: 'q1b_1' },
              { value: '2', key: 'q1b_2' },
              { value: '3', key: 'q1b_3' },
              { value: '4', key: 'q1b_4' },
              { value: '98', key: 'q1b_98' }
            ])}
            {renderRadioQuestion('q4b', 'q4b', [
              { value: '1', key: 'q1b_1' },
              { value: '2', key: 'q1b_2' },
              { value: '3', key: 'q1b_3' },
              { value: '4', key: 'q1b_4' },
              { value: '98', key: 'q1b_98' }
            ])}
            {renderRadioQuestion('q5b', 'q5b', [
              { value: '1', key: 'q1b_1' },
              { value: '2', key: 'q1b_2' },
              { value: '3', key: 'q1b_3' },
              { value: '4', key: 'q1b_4' },
              { value: '98', key: 'q1b_98' }
            ])}
          </>
        );

      case 'section1c':
        return (
          <>
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('section_1C')}</h3>
              <h4 className={`text-sm font-semibold text-primary/80 mb-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('part1c')}</h4>
            </div>
            {renderRadioQuestion('q1c', 'q1c', [
              { value: '1', key: 'q1c_1' },
              { value: '2', key: 'q1c_2' },
              { value: '3', key: 'q1c_3' }
            ])}
            {renderRadioQuestion('q2c', 'q2c', [
              { value: '1', key: 'q2c_1' },
              { value: '2', key: 'q2c_2' },
              { value: '3', key: 'q2c_3' },
              { value: '4', key: 'q2c_4' }
            ])}
            {renderCheckboxQuestion('q3c', 'q3c', [
              { value: '1', key: 'q3c_1' },
              { value: '2', key: 'q3c_2' },
              { value: '3', key: 'q3c_3' },
              { value: '4', key: 'q3c_4' },
              { value: '5', key: 'q3c_5' },
              { value: '6', key: 'q3c_6' },
              { value: '7', key: 'q3c_7' },
              { value: '8', key: 'q3c_8' }
            ], false, true)}
            {renderRadioQuestion('q4c', 'q4c', [
              { value: '1', key: 'q4c_1' },
              { value: '2', key: 'q4c_2' },
              { value: '3', key: 'q4c_3' },
              { value: '4', key: 'q4c_4' },
              { value: '5', key: 'q4c_5' }
            ])}
          </>
        );

      case 'section5c':
        return (
          <>
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('part5c1')}</h3>
            </div>
            {renderRadioQuestion('q5c1', 'q5c1', [
              { value: '1', key: 'q5c_1' },
              { value: '2', key: 'q5c_2' },
              { value: '98', key: 'q5c_98' },
              { value: '99', key: 'q5c_99' }
            ])}
            {renderRadioQuestion('q5c2', 'q5c2', [
              { value: '1', key: 'q5c_1' },
              { value: '2', key: 'q5c_2' },
              { value: '98', key: 'q5c_98' },
              { value: '99', key: 'q5c_99' }
            ])}
            {renderRadioQuestion('q5c3', 'q5c3', [
              { value: '1', key: 'q5c_1' },
              { value: '2', key: 'q5c_2' },
              { value: '98', key: 'q5c_98' },
              { value: '99', key: 'q5c_99' }
            ])}
          </>
        );

      case 'section6c':
        return (
          <>
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>{t('part6')}</h3>
            </div>
            {renderCheckboxQuestion('q6c', 'q6c', [
              { value: '1', key: 'q6c_1' },
              { value: '2', key: 'q6c_2' },
              { value: '3', key: 'q6c_3' },
              { value: '4', key: 'q6c_4' },
              { value: '5', key: 'q6c_5' },
              { value: '6', key: 'q6c_6' },
              { value: '7', key: 'q6c_7' },
              { value: '8', key: 'q6c_8' }
            ])}
            {renderRadioQuestion('q7c', 'q7c', [
              { value: '1', key: 'q7c_1' },
              { value: '2', key: 'q7c_2' },
              { value: '3', key: 'q7c_3' },
              { value: '4', key: 'q7c_4' },
              { value: '5', key: 'q7c_5' }
            ])}
            {renderRadioQuestion('q8c', 'q8c', [
              { value: '1', key: 'q8c_1' },
              { value: '2', key: 'q8c_2' },
              { value: '3', key: 'q8c_3' }
            ])}
            {renderCheckboxQuestion('q9c', 'q9c', [
              { value: '1', key: 'q9c_1' },
              { value: '2', key: 'q9c_2' },
              { value: '3', key: 'q9c_3' },
              { value: '4', key: 'q9c_4' },
              { value: '5', key: 'q9c_5' }
            ])}
            {renderRadioQuestion('q10c', 'q10c', [
              { value: '0', key: 'q10c_0' },
              { value: '1', key: 'q10c_1' },
              { value: '98', key: 'q10c_98' }
            ])}
            {renderRadioQuestion('q11c', 'q11c', [
              { value: '0', key: 'q10c_0' },
              { value: '1', key: 'q10c_1' },
              { value: '98', key: 'q10c_98' }
            ])}
            {renderRadioQuestion('q12c', 'q12c', [
              { value: '0', key: 'q10c_0' },
              { value: '1', key: 'q10c_1' },
              { value: '98', key: 'q10c_98' }
            ])}
            {renderRadioQuestion('q13c', 'q13c', [
              { value: '0', key: 'q10c_0' },
              { value: '1', key: 'q10c_1' },
              { value: '98', key: 'q10c_98' }
            ])}
            {renderTextQuestion('q14c', 'q14c', '', false, formData.q13c !== '1' && formData.q13c !== 1, 'number')}
          </>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            {locale === 'en' 
              ? 'Please fill in all required fields.'
              : 'សូមបំពេញចន្លោះទាំងអស់ដែលត្រូវការ។'}
          </p>
        );
    }
  };

  // Don't render if index is invalid (like 'kh' or 'en' when it should be a section)
  // This should be caught by useEffect redirect, but add safety check
  const validSections = ['section1a', 'section1a1', 'section1b', 'section1c', 'section5c', 'section6c'];
  if (uuid && index && !validSections.includes(index) && index !== 'consent' && index !== 'thank') {
    // Invalid index - redirect to consent
    useEffect(() => {
      if (index === 'kh' || index === 'en' || (!validSections.includes(index) && index !== 'consent' && index !== 'thank')) {
        navigate(`/client/${token}/${locale}/${uuid}/consent`, { replace: true });
      }
    }, [index, uuid, token, locale, navigate]);
    
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {locale === 'en' ? 'Redirecting...' : 'កំពុងប្តូរទិស...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render other sections (section1, section1a, etc.)
  return (
    <div className={`min-h-screen bg-background ${locale === 'kh' ? 'font-khmer' : ''} relative`} lang={locale}>
      <ClientToolbar locale={locale} />
      <div className={CLIENT_CONTAINER}>
        {/* Progress Bar */}
        <Card className="mb-6 border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaHospital className="text-primary text-lg" />
                <span className={`text-base font-semibold text-muted-foreground ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {locale === 'en' ? 'Progress' : 'បំពេញបាន'}
                </span>
              </div>
              <span className="text-base md:text-lg font-bold text-primary">
                {getSectionNumber()} / {getTotalSections()}
              </span>
            </div>
            <Progress value={getProgress()} className="h-4 md:h-5" />
          </CardContent>
        </Card>

        {/* Main Form Card */}
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="border-b border-border/50 p-0 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`${CLIENT_PAGE_TITLE} flex items-center gap-2 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  <FaClipboardCheck className="text-primary text-base shrink-0" />
                  {pageData?.site ? (
                    <span className="break-words">{pageData.site}</span>
                  ) : (
                    <span>{locale === 'en' ? `Section ${index}` : `ផ្នែក ${index}`}</span>
                  )}
                </CardTitle>
                <CardDescription className={`mt-2 text-base md:text-lg ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {t('title')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-2 mb-8">
                {renderSectionForm()}
              </div>
              <div className={`${CLIENT_STICKY_FOOTER} pb-2`}>
                <Button
                  type="submit"
                  disabled={saving}
                  className={CLIENT_SUBMIT_BUTTON}
                  size="sm"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      <span className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'en' ? 'Saving...' : 'កំពុងរក្សាទុក...'}</span>
                    </>
                  ) : (
                    <>
                      <span className={locale === 'kh' ? 'font-khmer' : ''}>{locale === 'en' ? 'Save & Continue' : 'រក្សាទុក & បន្ត'}</span>
                      <FaArrowRight className="ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

