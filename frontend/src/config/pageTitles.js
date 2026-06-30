/** Route path → i18n key for the top navbar title */
export const PAGE_TITLE_KEYS = {
  '/patients': 'admin.common.dashboard',
  '/reporting': 'admin.common.patientReporting',
  '/hfs_dashboard': 'admin.hfs.dashboard',
  '/hfs': 'admin.hfs.export',
  '/admin_dashboard': 'admin.dashboard.title',
  '/survey-analysis': 'admin.common.surveyAnalysis',
  '/users': 'admin.users.title',
  '/permissions': 'admin.permissions.title',
  '/roles': 'admin.roles.title',
  '/sites': 'admin.sites.title',
  '/devices': 'admin.devices.title',
  '/questions': 'admin.questions.title',
  '/qr-codes': 'admin.qrCodes.title',
  '/settings': 'admin.settings.title',
  '/change_password': 'admin.settings.changePassword',
};

export function getPageTitleKey(pathname) {
  return PAGE_TITLE_KEYS[pathname] ?? null;
}
