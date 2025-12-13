import { IoTDevice, DeviceTelemetry } from '../types';

export class DeviceAPI {
  private devices: Map<string, IoTDevice>;
  private telemetryHistory: Map<string, DeviceTelemetry[]>;
  private maxHistorySize: number = 100;

  constructor() {
    this.devices = new Map();
    this.telemetryHistory = new Map();
    this.loadFromStorage();
  }

  // Load devices from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('iot_devices');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach((device: IoTDevice) => {
          device.lastSeen = new Date(device.lastSeen);
          this.devices.set(device.deviceId, device);
        });
      }
    } catch (error) {
      console.error('Failed to load devices from storage:', error);
    }
  }

  // Save devices to localStorage
  private saveToStorage(): void {
    try {
      const devicesArray = Array.from(this.devices.values());
      localStorage.setItem('iot_devices', JSON.stringify(devicesArray));
    } catch (error) {
      console.error('Failed to save devices to storage:', error);
    }
  }

  // Register a new device
  registerDevice(device: Omit<IoTDevice, 'id' | 'lastSeen' | 'status'>): IoTDevice {
    const newDevice: IoTDevice = {
      ...device,
      id: `device-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      lastSeen: new Date(),
      status: 'online',
    };

    this.devices.set(device.deviceId, newDevice);
    this.saveToStorage();
    return newDevice;
  }

  // Update device status
  updateDevice(deviceId: string, updates: Partial<IoTDevice>): IoTDevice | null {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const updated = {
      ...device,
      ...updates,
      lastSeen: new Date(),
    };

    this.devices.set(deviceId, updated);
    this.saveToStorage();
    return updated;
  }

  // Process incoming telemetry from device
  processTelemetry(telemetry: DeviceTelemetry): void {
    // Update device status
    const device = this.devices.get(telemetry.deviceId);
    if (device) {
      this.updateDevice(telemetry.deviceId, {
        status: 'online',
        uptime: telemetry.uptime,
        freeMemory: telemetry.freeRam,
        vectorsSent: (device.vectorsSent || 0) + 1,
      });
    }

    // Store telemetry history
    if (!this.telemetryHistory.has(telemetry.deviceId)) {
      this.telemetryHistory.set(telemetry.deviceId, []);
    }

    const history = this.telemetryHistory.get(telemetry.deviceId)!;
    history.push(telemetry);

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  // Get all registered devices
  getAllDevices(): IoTDevice[] {
    return Array.from(this.devices.values());
  }

  // Get device by ID
  getDevice(deviceId: string): IoTDevice | null {
    return this.devices.get(deviceId) || null;
  }

  // Get telemetry history for a device
  getTelemetryHistory(deviceId: string): DeviceTelemetry[] {
    return this.telemetryHistory.get(deviceId) || [];
  }

  // Remove a device
  removeDevice(deviceId: string): boolean {
    const removed = this.devices.delete(deviceId);
    this.telemetryHistory.delete(deviceId);
    this.saveToStorage();
    return removed;
  }

  // Check for offline devices (not seen in last 60 seconds)
  updateDeviceStatuses(): void {
    const now = Date.now();
    const offlineThreshold = 60000; // 60 seconds

    this.devices.forEach((device) => {
      const timeSinceLastSeen = now - device.lastSeen.getTime();
      if (timeSinceLastSeen > offlineThreshold && device.status === 'online') {
        this.updateDevice(device.deviceId, { status: 'offline' });
      }
    });
  }

  // Simulate MQTT message processing
  handleMQTTMessage(topic: string, message: string): void {
    try {
      // Expected topic format: vector-api/{device_id}/data
      const topicParts = topic.split('/');
      if (topicParts.length !== 3 || topicParts[0] !== 'vector-api') {
        console.warn('Invalid topic format:', topic);
        return;
      }

      const deviceId = topicParts[1];
      const data = JSON.parse(message);

      const telemetry: DeviceTelemetry = {
        deviceId: data.device_id || deviceId,
        timestamp: new Date(data.timestamp * 1000 || Date.now()),
        vector: data.vector,
        uptime: data.uptime || 0,
        freeRam: data.free_ram || 0,
        wifiConnected: data.wifi_connected !== false,
      };

      this.processTelemetry(telemetry);
    } catch (error) {
      console.error('Failed to process MQTT message:', error);
    }
  }

  // Send command to device via RPC (simulated)
  async sendCommand(deviceId: string, method: string, params: object): Promise<{ success: boolean; method: string; params: object; timestamp: number }> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (device.status === 'offline') {
      throw new Error(`Device ${deviceId} is offline`);
    }

    // In a real implementation, this would make an actual RPC call
    // For now, we'll simulate the response
    console.log(`Sending command to ${deviceId}: ${method}`, params);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          method,
          params,
          timestamp: Date.now(),
        });
      }, 500);
    });
  }
}

// Singleton instance
export const deviceAPI = new DeviceAPI();

// Start periodic status checks
setInterval(() => {
  deviceAPI.updateDeviceStatuses();
}, 10000); // Check every 10 seconds
