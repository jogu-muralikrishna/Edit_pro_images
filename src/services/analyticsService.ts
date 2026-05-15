import FingerprintJS from '@fingerprintjs/fingerprintjs';
import exifr from 'exifr';

const SESSION_KEY = 'edit_pro_session_id';

class AnalyticsService {
  private sessionId: string;
  private fpPromise = FingerprintJS.load();

  constructor() {
    this.sessionId = localStorage.getItem(SESSION_KEY) || this.generateId();
    localStorage.setItem(SESSION_KEY, this.sessionId);
    this.initSession();
  }

  private generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async initSession() {
    try {
      const fp = await this.fpPromise;
      const result = await fp.get();
      
      const deviceData = {
        browser: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Get Geo via public API (fire-and-forget)
      let geo = {};
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (geoRes.ok) geo = await geoRes.json();
      } catch (e) {}

      await this.postData('session', {
        fingerprint: result.visitorId,
        device: deviceData,
        geo
      });
    } catch (error) {
      console.debug('Analytics init failed silenty');
    }
  }

  private async postData(type: string, data: any) {
    try {
      await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, sessionId: this.sessionId })
      });
    } catch (e) {}
  }

  async trackAction(type: string, details: any = {}) {
    await this.postData('action', { type, details });
  }

  async trackUpload(url: string, file: File) {
    let exif = {};
    try {
      exif = await exifr.parse(file) || {};
    } catch (e) {}

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(file);

    await this.postData('upload', { url, thumbnail, exif });
  }

  async trackExport(imageData: string) {
    await this.postData('export', { image: imageData });
  }

  private generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const max = 200;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > max) { h *= max / w; w = max; }
          } else {
            if (h > max) { w *= max / h; h = max; }
          }
          canvas.width = w;
          canvas.height = h;
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}

export const analytics = new AnalyticsService();
