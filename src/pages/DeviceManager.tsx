import React, { useState, useEffect } from 'react';
import { IoTDevice } from '../types';
import { deviceAPI } from '../utils/deviceAPI';
import '../styles/DeviceManager.css';

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState<{
    deviceId: string;
    name: string;
    type: 'esp32' | 'esp8266' | 'other';
    firmware: string;
  }>({
    deviceId: '',
    name: '',
    type: 'esp32',
    firmware: 'mongoose-os-1.0',
  });

  useEffect(() => {
    // Load devices on mount
    loadDevices();

    // Set up periodic refresh
    const interval = setInterval(loadDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = () => {
    const allDevices = deviceAPI.getAllDevices();
    setDevices(allDevices);
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDevice.deviceId || !newDevice.name) {
      alert('Please fill in all required fields');
      return;
    }

    const device = deviceAPI.registerDevice(newDevice);
    setDevices([...devices, device]);
    setShowAddForm(false);
    setNewDevice({
      deviceId: '',
      name: '',
      type: 'esp32',
      firmware: 'mongoose-os-1.0',
    });
  };

  const handleRemoveDevice = (deviceId: string) => {
    if (confirm('Are you sure you want to remove this device?')) {
      deviceAPI.removeDevice(deviceId);
      loadDevices();
      if (selectedDevice?.deviceId === deviceId) {
        setSelectedDevice(null);
      }
    }
  };

  const handleSendCommand = async (deviceId: string, method: string) => {
    try {
      const result = await deviceAPI.sendCommand(deviceId, method, {});
      alert(`Command sent successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      alert(`Failed to send command: ${error}`);
    }
  };

  const getStatusBadge = (status: IoTDevice['status']) => {
    const styles: { [key: string]: React.CSSProperties } = {
      online: { background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' },
      offline: { background: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' },
      error: { background: 'rgba(248, 113, 113, 0.2)', color: '#f87171' },
    };

    return (
      <span className="status-badge" style={styles[status]}>
        {status}
      </span>
    );
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes?: number) => {
    if (!bytes) return 'N/A';
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="device-manager-container">
      <header className="device-manager-header">
        <h1>IoT Device Manager</h1>
        <p className="device-manager-subtitle">Mongoose.OS Integration</p>
      </header>

      <div className="device-manager-content">
        <div className="device-list-section">
          <div className="section-header">
            <h2>Connected Devices ({devices.length})</h2>
            <button 
              className="button-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : '+ Add Device'}
            </button>
          </div>

          {showAddForm && (
            <form className="add-device-form" onSubmit={handleAddDevice}>
              <h3>Register New Device</h3>
              <div className="form-group">
                <label>Device ID *</label>
                <input
                  type="text"
                  value={newDevice.deviceId}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                  placeholder="esp32-sensor-01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Device Name *</label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  placeholder="Living Room Sensor"
                  required
                />
              </div>
              <div className="form-group">
                <label>Device Type</label>
                <select
                  value={newDevice.type}
                  onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value as 'esp32' | 'esp8266' | 'other' })}
                >
                  <option value="esp32">ESP32</option>
                  <option value="esp8266">ESP8266</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Firmware Version</label>
                <input
                  type="text"
                  value={newDevice.firmware}
                  onChange={(e) => setNewDevice({ ...newDevice, firmware: e.target.value })}
                  placeholder="mongoose-os-1.0"
                />
              </div>
              <button type="submit" className="button-primary">Register Device</button>
            </form>
          )}

          <div className="device-list">
            {devices.length === 0 ? (
              <div className="empty-state">
                <p>No devices registered yet</p>
                <p className="empty-state-hint">Click "Add Device" to register your first Mongoose.OS device</p>
              </div>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className={`device-card ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDevice(device)}
                >
                  <div className="device-card-header">
                    <h3>{device.name}</h3>
                    {getStatusBadge(device.status)}
                  </div>
                  <div className="device-card-info">
                    <div className="info-row">
                      <span className="info-label">ID:</span>
                      <span className="info-value">{device.deviceId}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Type:</span>
                      <span className="info-value">{device.type}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Vectors:</span>
                      <span className="info-value">{device.vectorsSent || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedDevice && (
          <div className="device-details-section">
            <div className="section-header">
              <h2>{selectedDevice.name}</h2>
              <button
                className="button-danger"
                onClick={() => handleRemoveDevice(selectedDevice.deviceId)}
              >
                Remove Device
              </button>
            </div>

            <div className="details-card">
              <h3>Device Information</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Device ID</span>
                  <span className="detail-value">{selectedDevice.deviceId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{selectedDevice.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{getStatusBadge(selectedDevice.status)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Firmware</span>
                  <span className="detail-value">{selectedDevice.firmware}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">IP Address</span>
                  <span className="detail-value">{selectedDevice.ipAddress || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Seen</span>
                  <span className="detail-value">
                    {selectedDevice.lastSeen.toLocaleString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Uptime</span>
                  <span className="detail-value">{formatUptime(selectedDevice.uptime)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Free Memory</span>
                  <span className="detail-value">{formatMemory(selectedDevice.freeMemory)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vectors Sent</span>
                  <span className="detail-value">{selectedDevice.vectorsSent || 0}</span>
                </div>
              </div>
            </div>

            <div className="details-card">
              <h3>Device Commands</h3>
              <div className="command-buttons">
                <button
                  className="button-primary"
                  onClick={() => handleSendCommand(selectedDevice.deviceId, 'Device.Status')}
                  disabled={selectedDevice.status === 'offline'}
                >
                  Get Status
                </button>
                <button
                  className="button-primary"
                  onClick={() => handleSendCommand(selectedDevice.deviceId, 'Vector.Create')}
                  disabled={selectedDevice.status === 'offline'}
                >
                  Test Vector
                </button>
                <button
                  className="button-primary"
                  onClick={() => alert('Reboot command would be sent to device')}
                  disabled={selectedDevice.status === 'offline'}
                >
                  Reboot Device
                </button>
              </div>
            </div>

            <div className="details-card">
              <h3>Telemetry History</h3>
              <div className="telemetry-list">
                {deviceAPI.getTelemetryHistory(selectedDevice.deviceId).slice(-10).reverse().map((telemetry, idx) => (
                  <div key={idx} className="telemetry-item">
                    <span className="telemetry-time">
                      {telemetry.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="telemetry-vector">
                      Vector: ({telemetry.vector.x.toFixed(2)}, {telemetry.vector.y.toFixed(2)}, {telemetry.vector.z.toFixed(2)})
                    </span>
                    <span className="telemetry-magnitude">
                      Mag: {telemetry.vector.magnitude.toFixed(2)}
                    </span>
                  </div>
                ))}
                {deviceAPI.getTelemetryHistory(selectedDevice.deviceId).length === 0 && (
                  <p className="empty-state-hint">No telemetry data received yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceManager;
