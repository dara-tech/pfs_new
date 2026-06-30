import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Development flag to force offline mode for testing
// Set to true to simulate offline mode even when connected
const FORCE_OFFLINE_MODE = false; // Change to true to test offline functionality

const OFFLINE_QUEUE_KEY = '@psf_offline_queue';
const FORM_DATA_PREFIX = '@psf_form_data_';

// Save form data locally
export const saveFormDataLocally = async (key, data) => {
  try {
    await AsyncStorage.setItem(`${FORM_DATA_PREFIX}${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving form data locally:', error);
    return false;
  }
};

// Get form data from local storage
export const getFormDataLocally = async (key) => {
  try {
    const data = await AsyncStorage.getItem(`${FORM_DATA_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting form data locally:', error);
    return null;
  }
};

// Add submission to offline queue
export const addToOfflineQueue = async (submission) => {
  try {
    const queue = await getOfflineQueue();
    queue.push({
      ...submission,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.error('Error adding to offline queue:', error);
    return false;
  }
};

// Get offline queue
export const getOfflineQueue = async () => {
  try {
    const queue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
};

// Clear offline queue
export const clearOfflineQueue = async () => {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing offline queue:', error);
    return false;
  }
};

// Remove item from offline queue
export const removeFromOfflineQueue = async (id) => {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing from offline queue:', error);
    return false;
  }
};

// Sync offline queue when online
export const syncOfflineQueue = async (apiFunction) => {
  // Development mode: force offline for testing
  if (__DEV__ && FORCE_OFFLINE_MODE) {
    console.log('[OfflineStorage] 🔧 Development mode: Forcing offline mode - skipping sync');
    return { synced: 0, failed: 0, removed: 0 };
  }
  
  const isConnected = await NetInfo.fetch();
  if (!isConnected.isConnected) {
    console.log('[OfflineStorage] ⚠️ Not connected - skipping sync');
    return { synced: 0, failed: 0, removed: 0 };
  }

  const queue = await getOfflineQueue();
  console.log('[OfflineStorage] 📋 Queue check:', { queueLength: queue.length, queue });
  
  if (queue.length === 0) {
    console.log('[OfflineStorage] ℹ️ No items in queue to sync');
    return { synced: 0, failed: 0, removed: 0 };
  }

  console.log(`[OfflineStorage] 🔄 Starting sync of ${queue.length} items...`);
  let synced = 0;
  let failed = 0;
  let removed = 0;
  // Cache fetched UUID per (type, token) so we reuse for multiple items (e.g. consent + section1a)
  const uuidCache = {};

  const isUriMissing = (uri) => !uri || uri === 'offline' || String(uri).trim() === '';

  for (const item of queue) {
    try {
      console.log(`[OfflineStorage] Syncing item:`, {
        type: item.type,
        token: item.token,
        index: item.index,
        id: item.id,
        hasUri: !!item.data?._uri,
        uriValue: item.data?._uri,
        dataKeys: Object.keys(item.data || {})
      });

      // Any item missing or placeholder UUID: fetch real UUID and cache by (type, token)
      if (item.data && isUriMissing(item.data._uri)) {
        const cacheKey = `${item.type}:${item.token}`;
        if (!uuidCache[cacheKey]) {
          console.log(`[OfflineStorage] ⚠️ Item missing UUID (got "${item.data._uri}"), fetching from server...`);
          const { questionnaireAPI } = await import('../services/api');
          try {
            const getPageResponse = item.type === 'client'
              ? await questionnaireAPI.getClientPage(item.token, item.data?.locale || 'kh')
              : await questionnaireAPI.getProviderPage(item.token, item.data?.locale || 'kh');
            const uuid = getPageResponse.data?.uuid;
            if (uuid) {
              uuidCache[cacheKey] = uuid;
              console.log(`[OfflineStorage] ✅ Got UUID for ${cacheKey}: ${uuid}`);
            } else {
              throw new Error('Server did not return UUID');
            }
          } catch (uuidError) {
            console.error(`[OfflineStorage] ❌ Failed to get UUID for ${cacheKey}:`, uuidError?.message || uuidError);
            failed++;
            continue;
          }
        }
        item.data = { ...item.data, _uri: uuidCache[cacheKey] };
      }
      
      // Log the data being sent before API call
      console.log(`[OfflineStorage] 📤 Sending data to API:`, {
        type: item.type,
        token: item.token,
        index: item.index,
        data: item.data,
        hasUri: !!item.data?._uri,
        uriValue: item.data?._uri
      });
      
      await apiFunction(item);
      
      // Log success after API call
      console.log(`[OfflineStorage] ✅ API call succeeded for item ${item.id}`);
      
      await removeFromOfflineQueue(item.id);
      synced++;
      console.log(`[OfflineStorage] ✅ Successfully synced and removed item ${item.id}`);
    } catch (error) {
      console.error(`[OfflineStorage] ❌ Error syncing item ${item.id}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // If token is invalid (404) or expired, remove from queue
      if (error.response?.status === 404) {
        console.log(`[OfflineStorage] 🗑️ Removing invalid/expired item ${item.id} (404)`);
        await removeFromOfflineQueue(item.id);
        removed++;
      } else {
        // Keep other errors in queue for retry
        failed++;
      }
    }
  }

  console.log(`[OfflineStorage] 📊 Sync complete: ${synced} synced, ${failed} failed, ${removed} removed`);
  return { synced, failed, removed };
};
