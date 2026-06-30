import { useEffect, useState } from 'react';
import { useOfflineStore } from '../lib/stores/offlineStore';
import { FaWifi, FaBan, FaSync } from 'react-icons/fa';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useUIStore } from '../lib/stores/uiStore';

export default function OfflineIndicator() {
  const { locale } = useUIStore();
  const { isOffline, pendingSubmissions, syncPendingSubmissions } = useOfflineStore();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  const handleSync = async () => {
    if (!navigator.onLine) return;
    
    setSyncing(true);
    try {
      const api = (await import('../lib/api')).default;
      const results = await syncPendingSubmissions(api);
      setLastSyncTime(new Date());
      
      // Show success message
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  // Don't show if online and no pending submissions
  if (!isOffline && pendingSubmissions.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 space-y-3 min-w-[280px]">
        {isOffline && (
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <FaBan className="h-4 w-4" />
            <span className="text-sm font-medium">
              {locale === 'kh' ? 'មិនមានអ៊ីនធឺណិត' : 'Offline Mode'}
            </span>
          </div>
        )}
        
        {pendingSubmissions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FaSync className={syncing ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
                <span className="text-sm">
                  {pendingSubmissions.length} {locale === 'kh' 
                    ? 'ការដាក់បញ្ជូលដែលកំពុងរង់ចាំ' 
                    : pendingSubmissions.length === 1 
                      ? 'pending submission' 
                      : 'pending submissions'}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingSubmissions.length}
              </Badge>
            </div>
            
            {navigator.onLine && (
              <Button 
                size="sm" 
                onClick={handleSync}
                disabled={syncing}
                className="w-full"
              >
                {syncing 
                  ? (locale === 'kh' ? 'កំពុងធ្វើសមកាលកម្ម...' : 'Syncing...')
                  : (locale === 'kh' ? 'ធ្វើសមកាលកម្មឥឡូវ' : 'Sync Now')}
              </Button>
            )}
            
            {!navigator.onLine && (
              <p className="text-xs text-muted-foreground">
                {locale === 'kh' 
                  ? 'នឹងធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិនៅពេលមានអ៊ីនធឺណិត'
                  : 'Will sync automatically when online'}
              </p>
            )}
            
            {lastSyncTime && (
              <p className="text-xs text-muted-foreground">
                {locale === 'kh' 
                  ? `ធ្វើសមកាលកម្មចុងក្រោយ: ${lastSyncTime.toLocaleTimeString()}`
                  : `Last sync: ${lastSyncTime.toLocaleTimeString()}`}
              </p>
            )}
          </div>
        )}
        
        {!isOffline && pendingSubmissions.length === 0 && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <FaWifi className="h-4 w-4" />
            <span className="text-sm">
              {locale === 'kh' ? 'តភ្ជាប់អ៊ីនធឺណិត' : 'Online'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
