export const notify = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  // Check if notifications are permitted (in a real app, this would check the Settings state or browser API)
  const notificationsEnabled = true; // Placeholder for actual permission check
  const soundEnabled = true; // Placeholder for actual permission check

  if (!notificationsEnabled) return;

  // 1. On-screen banner (using a custom event that a global Toast component could listen to)
  const event = new CustomEvent('app-notification', { detail: { title, message, type } });
  window.dispatchEvent(event);

  // 2. Sound alert
  if (soundEnabled) {
    try {
      // A simple beep sound using Web Audio API
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(type === 'error' ? 300 : 800, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Failed to play notification sound", e);
    }
  }

  // 3. Vibration (if supported)
  if (navigator.vibrate) {
    if (type === 'error') {
      navigator.vibrate([200, 100, 200]);
    } else {
      navigator.vibrate(200);
    }
  }
};
