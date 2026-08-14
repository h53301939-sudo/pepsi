import React, { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext({
  isInstallable: false,
  isInstalled: false,
  installApp: async () => false,
  updateAvailable: false,
  applyUpdate: () => {},
  isOnline: true
});

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Check if already running in Standalone / PWA Mode
    const checkInstalled = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsInstalled(Boolean(isStandaloneMode));
    };

    checkInstalled();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => setIsInstalled(e.matches);
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // 2. Capture Browser `beforeinstallprompt` event (Chrome, Edge, Android browsers)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent default automatic mini-infobar
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('✅ [PWA] App is ready for installation prompt');
    };

    // 3. Listen for successful install
    const handleAppInstalled = () => {
      console.log('🎉 [PWA] App installed successfully');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Online/Offline Network Status Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Register Service Worker (in production and dev if supported)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          setSwRegistration(registration);
          console.log('🚀 [PWA] Service Worker registered with scope:', registration.scope);

          // Check if an update is found
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('⚡ [PWA] New update available');
                  setUpdateAvailable(true);
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration skipped or failed:', err);
        });

      // Reload on controller change
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener?.('change', handleMediaChange);
    };
  }, []);

  // 📲 Trigger Native PWA Installation Prompt
  const installApp = async () => {
    if (!deferredPrompt) {
      // Fallback instructions for browsers that don't support beforeinstallprompt (e.g. iOS Safari)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("To install this app on your iPhone/iPad:\n1. Tap the 'Share' icon (square with arrow) in Safari.\n2. Scroll down and tap 'Add to Home Screen'.");
        return false;
      }
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);

      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Error invoking install prompt:', err);
      return false;
    }
  };

  // 🔄 Apply Update Instantly
  const applyUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        installApp,
        updateAvailable,
        applyUpdate,
        isOnline
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
export default PWAContext;
