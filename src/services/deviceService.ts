/**
 * 设备信息管理服务
 * 负责获取内网IP地址和生成设备唯一标识
 */

export interface DeviceInfo {
  localIP: string;
  deviceId: string;
  userAgent: string;
  hostname?: string;
  timestamp: number;
}

class DeviceService {
  private deviceInfo: DeviceInfo | null = null;
  private readonly STORAGE_KEY = 'nano_banana_device_info';

  /**
   * 获取设备信息，优先从缓存读取
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    // 尝试从本地存储读取
    const cached = this.loadFromStorage();
    if (cached && this.isValidDeviceInfo(cached)) {
      this.deviceInfo = cached;
      return cached;
    }

    // 生成新的设备信息
    const localIP = await this.getLocalIP();
    const deviceId = this.generateDeviceId(localIP);
    
    this.deviceInfo = {
      localIP,
      deviceId,
      userAgent: navigator.userAgent,
      hostname: this.getHostname(),
      timestamp: Date.now()
    };

    this.saveToStorage(this.deviceInfo);
    return this.deviceInfo;
  }

  /**
   * 通过WebRTC获取本地IP地址
   */
  private async getLocalIP(): Promise<string> {
    try {
      return await this.getIPFromWebRTC();
    } catch (error) {
      console.warn('无法通过WebRTC获取IP地址，使用备用方案:', error);
      return this.getIPFromFallback();
    }
  }

  /**
   * 使用WebRTC API获取内网IP
   */
  private getIPFromWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const rtc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const timeout = setTimeout(() => {
        rtc.close();
        reject(new Error('WebRTC IP detection timeout'));
      }, 3000);

      rtc.createDataChannel('');
      
      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          
          if (ipMatch) {
            const ip = ipMatch[1];
            // 过滤掉公网IP，只要内网IP
            if (this.isPrivateIP(ip)) {
              clearTimeout(timeout);
              rtc.close();
              resolve(ip);
            }
          }
        }
      };

      rtc.createOffer()
        .then(offer => rtc.setLocalDescription(offer))
        .catch(reject);
    });
  }

  /**
   * 判断是否为内网IP地址
   */
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;
    
    return false;
  }

  /**
   * 备用IP获取方案
   */
  private getIPFromFallback(): string {
    // 生成基于时间戳和随机数的伪IP
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 255);
    return `192.168.1.${timestamp % 255}`;
  }

  /**
   * 生成设备唯一标识
   */
  private generateDeviceId(ip: string): string {
    const userAgent = navigator.userAgent;
    const screenSize = `${screen.width}x${screen.height}`;
    const platform = navigator.platform;
    const language = navigator.language;
    
    const fingerprint = `${ip}_${userAgent}_${screenSize}_${platform}_${language}`;
    
    // 生成简单hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `device_${Math.abs(hash).toString(16)}`;
  }

  /**
   * 尝试获取主机名
   */
  private getHostname(): string | undefined {
    try {
      // 在浏览器环境中，通常无法直接获取主机名
      // 可以从location.hostname获取域名，但这通常是服务域名
      return location.hostname !== 'localhost' ? location.hostname : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 从本地存储读取设备信息
   */
  private loadFromStorage(): DeviceInfo | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('读取设备信息失败:', error);
      return null;
    }
  }

  /**
   * 保存设备信息到本地存储
   */
  private saveToStorage(deviceInfo: DeviceInfo): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deviceInfo));
    } catch (error) {
      console.warn('保存设备信息失败:', error);
    }
  }

  /**
   * 验证设备信息是否有效
   */
  private isValidDeviceInfo(info: DeviceInfo): boolean {
    return !!(
      info.localIP && 
      info.deviceId && 
      info.userAgent && 
      info.timestamp &&
      (Date.now() - info.timestamp < 30 * 24 * 60 * 60 * 1000) // 30天内有效
    );
  }

  /**
   * 清除缓存的设备信息
   */
  clearCache(): void {
    this.deviceInfo = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 格式化设备信息为显示字符串
   */
  formatDeviceInfo(info: DeviceInfo): string {
    const browserInfo = this.getBrowserInfo(info.userAgent);
    return `${info.localIP} (${browserInfo})`;
  }

  /**
   * 从User-Agent提取浏览器信息
   */
  private getBrowserInfo(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
}

export const deviceService = new DeviceService();
export default deviceService;