export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface Vector {
  id: string;
  name: string;
  dimensions: number[];
  magnitude: number;
  direction: number[];
  timestamp: Date;
}

export interface VectorOperation {
  id: string;
  type: 'add' | 'subtract' | 'multiply' | 'normalize' | 'transform';
  inputVectors: string[];
  resultVector: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: Date;
}

export interface PortalConfig {
  theme: 'dark' | 'light' | 'auto';
  vectorVisualization: boolean;
  realTimeUpdates: boolean;
  neuromorphicMode: boolean;
}

export interface IoTDevice {
  id: string;
  deviceId: string;
  name: string;
  type: 'esp32' | 'esp8266' | 'other';
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  firmware: string;
  ipAddress?: string;
  uptime?: number;
  freeMemory?: number;
  vectorsSent?: number;
}

export interface DeviceTelemetry {
  deviceId: string;
  timestamp: Date;
  vector: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  };
  uptime: number;
  freeRam: number;
  wifiConnected: boolean;
}
