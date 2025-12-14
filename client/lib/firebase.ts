import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  doc,
  getDoc,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCpSifW0WN1PuTuHPwsjCpxvQZFnPA7660",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "timdouin25.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "timdouin25",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "timdouin25.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "967661678985",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:967661678985:web:99b31a326903f70776b158"
};

// Debug: Log Firebase config
console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...'
});

// Initialize Firebase - prevent duplicate app error
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
    // If app already exists, get the existing instance
    const { getApp } = await import('firebase/app');
    app = getApp();
  } else {
    throw error;
  }
}

// Firebase uses its own networking - don't intercept fetch

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore with persistent cache and better network compatibility
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});

// Test Firebase connectivity with retry logic
export const testFirebaseConnection = async (retryCount = 0): Promise<{ success: boolean; error?: string }> => {
  const maxRetries = 3;
  try {
    if (retryCount === 0) {
      console.log(`Testing Firebase connection...`);
    }

    // First check if we're online
    if (!navigator.onLine) {
      return { success: false, error: 'Device is offline' };
    }

    // Get current auth state
    const currentUser = auth.currentUser;

    // If no user is authenticated, perform a lighter connectivity check
    if (!currentUser) {
      console.log('No authenticated user - performing lightweight connectivity check');
      // For unauthenticated users, just verify the Firebase app is initialized
      // and network is available
      return { success: true };
    }

    // For authenticated users, test actual Firestore connectivity
    const testDoc = doc(db, 'app_config', 'connection_test');

    // Extended timeout for deployed environments (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 30000);
    });

    const connectionPromise = getDoc(testDoc);
    await Promise.race([connectionPromise, timeoutPromise]);

    console.log('Firebase connection: SUCCESS');
    return { success: true };
  } catch (error: any) {
    // Only log errors on first attempt to reduce noise
    if (retryCount === 0) {
      console.error('Firebase connection test failed:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
    }

    // Handle specific error cases
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'Firestore rules not deployed. Deploy rules via Firebase Console.'
      };
    }

    if (error.code === 'failed-precondition') {
      return {
        success: false,
        error: 'Firestore database not created - please initialize database in Firebase Console'
      };
    }

    if (error.code === 'unavailable') {
      return {
        success: false,
        error: 'Firebase backend temporarily unavailable. Client will operate in offline mode.'
      };
    }

    let errorMessage = 'Connection failed';
    if (error.code) {
      errorMessage = `Firebase error: ${error.code}`;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Connection timeout - server may be slow, retrying...';
    } else if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      if (retryCount === 0) {
        console.warn('Network connectivity issue detected');
      }
      errorMessage = 'Network connectivity issue - check your internet connection';
    } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      errorMessage = 'Network error - try refreshing the page';
    }

    // Retry on timeout and fetch failures with exponential backoff
    if ((error.message?.includes('timeout') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) && retryCount < maxRetries) {
      if (retryCount === 0) {
        console.log(`Retrying connection test... (attempt ${retryCount + 2}/${maxRetries + 1})`);
      }
      const delay = 2000 * Math.pow(2, retryCount); // Exponential backoff: 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
      return testFirebaseConnection(retryCount + 1);
    }

    return { success: false, error: errorMessage };
  }
};

// Connection recovery utility
export const attemptConnectionRecovery = async () => {
  console.log('🔄 Attempting connection recovery...');

  try {
    // Try to re-enable network if it was disabled
    await enableNetwork(db);
    console.log('📡 Network re-enabled for Firestore');
  } catch (error) {
    console.log('Network was already enabled or error enabling:', error);
  }

  // Test actual Firestore connection
  return await testFirebaseConnection();
};

// Force offline mode utility
export const forceOfflineMode = async () => {
  try {
    await disableNetwork(db);
    console.log('📴 Firestore forced into offline mode');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to disable network:', error);
    return { success: false, error: error.message };
  }
};

// Force online mode utility
export const forceOnlineMode = async () => {
  try {
    await enableNetwork(db);
    console.log('📡 Firestore forced into online mode');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to enable network:', error);
    return { success: false, error: error.message };
  }
};

// Auto attempt recovery when the browser regains connectivity
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    attemptConnectionRecovery().then((res) => {
      if (res.success) {
        console.log('✅ Firestore reconnected after coming online');
      } else {
        console.log('⚠️ Firestore recovery attempt failed after coming online:', res.error);
      }
    });
  });
}

// Emergency recovery - clear cache and reload
export const emergencyFirebaseRecovery = () => {
  console.log('🚨 Emergency Firebase recovery - clearing cache and reloading...');

  // Clear localStorage
  try {
    localStorage.clear();
  } catch (e) {
    console.log('Could not clear localStorage:', e);
  }

  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.log('Could not clear sessionStorage:', e);
  }

  // Force reload the page
  window.location.reload();
};

// Nuclear option - aggressive recovery
export const aggressiveFirebaseRecovery = () => {
  console.log('☢️ Aggressive Firebase recovery - nuclear option...');

  return new Promise<void>((resolve) => {
    // Clear all possible storage
    const clearStorage = async () => {
      try {
        // Clear all storage types
        localStorage.clear();
        sessionStorage.clear();

        // Clear IndexedDB
        if ('indexedDB' in window) {
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.map(db => {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            })
          );
        }

        // Clear service worker cache
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        console.log('✅ All storage cleared');
        resolve();
      } catch (error) {
        console.error('Storage clearing failed:', error);
        resolve(); // Continue anyway
      }
    };

    clearStorage().then(() => {
      // Force reload with cache busting
      const url = new URL(window.location.href);
      url.searchParams.set('cache_bust', Date.now().toString());
      url.searchParams.set('force_reload', 'true');
      window.location.href = url.toString();
    });
  });
};

export default app;
