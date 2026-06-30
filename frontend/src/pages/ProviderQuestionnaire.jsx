import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import { useUIStore } from '../lib/stores/uiStore';
import { useQuestionnaireLocale } from '../hooks/use-questionnaire-locale';
import TTSButton from '../components/TTSButton';
import { t } from '../lib/translations/index';
import ClientToolbar from '../components/client/ClientToolbar';
import {
  CLIENT_CONTAINER,
  CLIENT_QUESTION_OPTION_GRID,
  CLIENT_OPTION_GRID_TWO,
  clientOptionLabelClass,
  getClientOptionGridClass,
  CLIENT_QUESTION_LABEL,
  CLIENT_QUESTION_LABEL_ROW,
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

function ProviderShell({ locale, children }) {
  return (
    <div
      className={`min-h-screen bg-background ${locale === 'kh' ? 'font-khmer' : ''} relative`}
      lang={locale}
    >
      <ClientToolbar locale={locale} />
      <div className={CLIENT_CONTAINER}>{children}</div>
    </div>
  );
}

export default function ProviderQuestionnaire() {
  const { token, locale: urlLocale, uuid, index } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState('');
  const { initTheme } = useUIStore();
  const locale = useQuestionnaireLocale(urlLocale || 'kh');

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    if (!token || token === 'index') {
      navigate(`/provider/index/${locale}`, { replace: true });
      return;
    }
    loadPage();
  }, [token, locale, uuid, index, navigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [index, uuid]);

  useEffect(() => {
    if (pageData && (index === 'consent' || (!index && pageData.page === 'provider'))) {
      if (formData.consent === undefined || formData.consent === null || formData.consent === '') {
        setFormData(prev => ({ ...prev, consent: '1' }));
      }
    }
  }, [index, pageData]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');
      const url = uuid && index
        ? `/questionnaire/provider/${token}/${locale}/${uuid}/${index}`
        : `/questionnaire/provider/${token}/${locale}`;

      const response = await api.get(url);
      setPageData(response.data);

      if (response.data.uuid && !uuid && !index) {
        navigate(`/provider/${token}/${locale}/${response.data.uuid}/consent`, { replace: true });
        return;
      }
    } catch (err) {
      console.error('Error loading page:', err);
      setError(err.response?.data?.error || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const submitData = { ...formData, locale, _uri: uuid };
      const response = await api.post(`/questionnaire/provider/${token}/${index}`, submitData);
      if (response.data.redirect) {
        navigate(response.data.redirect);
      }
    } catch (err) {
      console.error('Error saving:', err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const getAudioUrl = (questionKey) => {
    const q = pageData?.questions?.find(item => item.question_key === questionKey);
    return q?.[locale === 'en' ? 'audio_url_en' : 'audio_url_kh'];
  };

  const renderRadioQuestion = (name, questionKey, values, answerKeyFn, { html = false } = {}) => {
    const questionText = t(locale, `provider.questions.${questionKey}`);
    const gridClass = getClientOptionGridClass(values.length, 'radio');

    return (
      <div className={CLIENT_QUESTION_BLOCK}>
        <Label className={`${CLIENT_QUESTION_LABEL} ${CLIENT_QUESTION_LABEL_ROW} ${locale === 'kh' ? 'font-khmer' : ''}`}>
          <span className={CLIENT_BULLET}>•</span>
          {html ? (
            <span
              className={`flex-1 ${locale === 'kh' ? 'font-khmer' : ''}`}
              dangerouslySetInnerHTML={{ __html: questionText }}
            />
          ) : (
            <span className={`flex-1 ${locale === 'kh' ? 'font-khmer' : ''}`}>{questionText}</span>
          )}
          <TTSButton
            text={questionText.replace(/<[^>]*>/g, '')}
            languageCode={locale}
            audioUrl={getAudioUrl(questionKey)}
          />
        </Label>
        <div className={`${gridClass} mt-2`}>
          {values.map((value) => {
            const isSelected = formData[name] === value.toString() || formData[name] === value;
            return (
              <label
                key={value}
                htmlFor={`${name}_${value}`}
                className={clientOptionLabelClass(isSelected)}
              >
                <input
                  type="radio"
                  id={`${name}_${value}`}
                  name={name}
                  value={value.toString()}
                  checked={isSelected}
                  onChange={handleInputChange}
                  className={CLIENT_RADIO_CHECKBOX}
                  required
                />
                <span
                  className={`${CLIENT_OPTION_TEXT} ${isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'} ${locale === 'kh' ? 'font-khmer' : ''}`}
                >
                  {t(locale, answerKeyFn(value))}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ProviderShell locale={locale}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-2/3 rounded-lg bg-muted" />
          <div className={CLIENT_QUESTION_OPTION_GRID}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </ProviderShell>
    );
  }

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
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className={`text-base text-muted-foreground flex items-center justify-center gap-2 ${locale === 'kh' ? 'font-khmer' : ''}`}>
                <FaCheckCircle className="text-primary" />
                {locale === 'en'
                  ? 'Your responses have been saved successfully.'
                  : 'ការឆ្លើយតបរបស់អ្នកត្រូវបានរក្សាទុកដោយជោគជ័យ។'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !pageData && index !== 'thank') {
    return (
      <ProviderShell locale={locale}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </ProviderShell>
    );
  }

  if (!pageData && index !== 'thank') {
    return null;
  }

  if (index === 'consent' || (!index && pageData?.page === 'provider')) {
    return (
      <ProviderShell locale={locale}>
        <div className="mb-4">
          <h2 className={`${CLIENT_PAGE_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
            {t(locale, 'provider.questions.title')} {pageData?.site ? `- ${pageData.site}` : ''}
          </h2>
        </div>

        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mb-4">
              <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
                {t(locale, 'provider.questions.section1')}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={CLIENT_CONSENT_BOX}>
                <p
                  className={`${CLIENT_CONSENT_TEXT} ${locale === 'kh' ? 'font-khmer' : ''}`}
                  dangerouslySetInnerHTML={{ __html: t(locale, 'provider.questions.consent') }}
                />
              </div>

              <div className={`${CLIENT_OPTION_GRID_TWO} mb-4`}>
                <label
                  htmlFor="consent-yes"
                  className={`${clientOptionLabelClass(formData.consent === '1' || formData.consent === 1)} ${locale === 'kh' ? 'font-khmer' : ''}`}
                >
                  <input
                    type="radio"
                    id="consent-yes"
                    name="consent"
                    value="1"
                    checked={formData.consent === '1' || formData.consent === 1}
                    onChange={handleInputChange}
                    className={CLIENT_RADIO_CHECKBOX}
                    required
                  />
                  <span className={CLIENT_OPTION_TEXT}>{locale === 'en' ? 'Yes' : 'បាទ/ចាស'}</span>
                </label>
                <label
                  htmlFor="consent-no"
                  className={`${clientOptionLabelClass(formData.consent === '0' || formData.consent === 0)} ${locale === 'kh' ? 'font-khmer' : ''}`}
                >
                  <input
                    type="radio"
                    id="consent-no"
                    name="consent"
                    value="0"
                    checked={formData.consent === '0' || formData.consent === 0}
                    onChange={handleInputChange}
                    className={CLIENT_RADIO_CHECKBOX}
                    required
                  />
                  <span className={CLIENT_OPTION_TEXT}>{locale === 'en' ? 'No' : 'ទេ'}</span>
                </label>
              </div>

              <div className={CLIENT_STICKY_FOOTER}>
                <Button
                  type="submit"
                  disabled={saving || formData.consent === undefined || formData.consent === null || formData.consent === ''}
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
      </ProviderShell>
    );
  }

  if (index === 'section1') {
    return (
      <ProviderShell locale={locale}>
        <div className="mb-4">
          <h2 className={`${CLIENT_PAGE_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
            {t(locale, 'provider.questions.title')} {pageData?.site ? `- ${pageData.site}` : ''}
          </h2>
        </div>

        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4 pb-3 border-b border-border/50">
                <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {t(locale, 'provider.questions.section1')}
                </h3>
              </div>

              {renderRadioQuestion('dept', 'dept', [1, 2, 3, 4, 5, 6, 99], v => `provider.answers.d1_${v}`, { html: true })}

              <div className="mb-4 pb-3 border-b border-border/50 mt-3">
                <h3 className={`${CLIENT_SECTION_TITLE} ${locale === 'kh' ? 'font-khmer' : ''}`}>
                  {t(locale, 'provider.questions.section2')}
                </h3>
              </div>

              {renderRadioQuestion('e1', 'e1', [1, 2, 98], v => `provider.answers.e1_${v}`)}
              {renderRadioQuestion('e2', 'e2', [1, 2, 98], v => `provider.answers.e2_${v}`)}
              {renderRadioQuestion('e3', 'e3', [1, 2, 98, 99], v => `provider.answers.e3_${v}`)}
              {renderRadioQuestion('e4', 'e4', [1, 2, 3, 4], v => `provider.answers.e4_${v}`)}
              {renderRadioQuestion('e5', 'e5', [1, 2, 3], v => `provider.answers.e5_${v}`)}
              {renderRadioQuestion('e6', 'e6', [1, 2, 3, 4, 5], v => `provider.answers.e6_${v}`)}

              <div className={`${CLIENT_STICKY_FOOTER} pb-2`}>
                <Button type="submit" disabled={saving} className={CLIENT_SUBMIT_BUTTON} size="sm">
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      <span className={locale === 'kh' ? 'font-khmer' : ''}>
                        {locale === 'en' ? 'Saving...' : 'កំពុងរក្សាទុក...'}
                      </span>
                    </>
                  ) : (
                    <span className={locale === 'kh' ? 'font-khmer' : ''}>
                      {locale === 'en' ? 'Save & Continue' : 'រក្សាទុក & បន្ត'}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ProviderShell>
    );
  }

  return null;
}
