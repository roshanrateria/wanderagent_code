import { useState, useEffect } from 'react';
// Polyfill for Device detection without @capacitor/device dependency
const Device = {
  async getInfo() {
    // Simple browser-based device detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    return {
      platform: isAndroid ? 'android' : isIOS ? 'ios' : 'web',
      operatingSystem: isAndroid ? 'android' : isIOS ? 'ios' : 'unknown',
      model: 'unknown',
      manufacturer: 'unknown'
    };
  }
};

export interface DeviceInfo {
  isMobile: boolean;
  isWeb: boolean;
  platform: string;
  model?: string;
  operatingSystem?: string;
}

export const useDeviceType = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isWeb: true,
    platform: 'web'
  });

  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        const info = await Device.getInfo();
        setDeviceInfo({
          isMobile: info.platform !== 'web',
          isWeb: info.platform === 'web',
          platform: info.platform,
          model: info.model,
          operatingSystem: info.operatingSystem
        });
      } catch (error) {
        // Fallback for web or error cases
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        setDeviceInfo({
          isMobile: isMobile,
          isWeb: !isMobile,
          platform: isMobile ? 'mobile-web' : 'web'
        });
      }
    };

    getDeviceInfo();
  }, []);

  return deviceInfo;
};
