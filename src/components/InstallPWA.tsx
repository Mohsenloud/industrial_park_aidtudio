import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Detect if already installed (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      // Show iOS prompt after a short delay
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Auto-dismiss the popup after 5 seconds
  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setShowPrompt(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-indigo-600 text-white rounded-2xl shadow-2xl p-4 z-50 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl shrink-0">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">نصب اپلیکیشن شهرک صنعتی</h4>
            <p className="text-xs text-indigo-100 mt-0.5">
              {isIOS 
                ? 'برای نصب، دکمه Share را زده و Add to Home Screen را انتخاب کنید.' 
                : 'برای دسترسی سریع‌تر و آفلاین، اپلیکیشن را روی گوشی خود نصب کنید.'}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {!isIOS && (
            <button
              onClick={handleInstallClick}
              className="bg-white text-indigo-600 text-xs font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
            >
              نصب سریع
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-indigo-200 hover:text-white flex items-center justify-center p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
