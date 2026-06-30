import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FaLock, FaCheckCircle } from 'react-icons/fa';
import { t } from '../lib/translations/index';
import { useUIStore } from '../lib/stores/uiStore';
import api from '../lib/api';

function ChangePasswordForm({ locale = 'en' }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t(locale, 'admin.settings.passwordMismatch'));
      return;
    }

    if (formData.newPassword.length < 8) {
      setError(t(locale, 'admin.settings.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess(t(locale, 'admin.settings.passwordChangedSuccess'));
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || t(locale, 'admin.settings.passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="flex items-center gap-2">
              <FaLock className="h-4 w-4" />
              {t(locale, 'admin.settings.currentPassword')}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder={t(locale, 'admin.settings.currentPasswordPlaceholder')}
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t(locale, 'admin.settings.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder={t(locale, 'admin.settings.newPasswordPlaceholder')}
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              {t(locale, 'admin.settings.passwordMinLength')}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t(locale, 'admin.settings.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t(locale, 'admin.settings.confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="h-11"
            />
          </div>
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm border border-green-200 dark:border-green-800 flex items-center gap-2">
              <FaCheckCircle className="h-4 w-4" />
              {success}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full h-11">
            {loading ? t(locale, 'admin.settings.changingPassword') : t(locale, 'admin.settings.changePassword')}
          </Button>
        </form>
      </div>

      <div className="md:col-span-1">
        <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
          <h3 className="text-lg font-semibold">{t(locale, 'admin.settings.passwordRequirements')}</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>{t(locale, 'admin.settings.passwordReq1')}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>{t(locale, 'admin.settings.passwordReq2')}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>{t(locale, 'admin.settings.passwordReq3')}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>{t(locale, 'admin.settings.passwordReq4')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ChangePasswordForm };

export default function ChangePassword() {
  const { locale } = useUIStore();

  return (
    <div className="page-stack">
      <ChangePasswordForm locale={locale} />
    </div>
  );
}
