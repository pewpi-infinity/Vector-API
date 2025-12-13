# Vector-API Mongoose.OS Integration

This directory contains the Mongoose.OS firmware integration for the Vector-API Infinity OS. It enables IoT devices running Mongoose.OS to communicate with the Vector-API server, sending vector data and telemetry from edge devices.

## Features

- **Real-time Vector Data Transmission**: Send 3D vector data from IoT devices to the Vector-API server
- **Device Telemetry**: Automatic transmission of device health metrics (uptime, memory, WiFi status)
- **RPC Interface**: Remote procedure calls for device management and vector operations
- **HTTP Endpoints**: RESTful API for vector data submission
- **MQTT Support**: Pub/Sub messaging for efficient data transfer
- **Configurable Sync**: Adjustable intervals for periodic data transmission

## Requirements

- [Mongoose.OS](https://mongoose-os.com/) installed
- ESP32, ESP8266, or compatible microcontroller
- WiFi connection for cloud connectivity
- Vector-API server endpoint

## Installation

1. **Install Mongoose.OS**:
   ```bash
   curl -fsSL https://mongoose.ws/downloads/mos/install.sh | sh
   ```

2. **Navigate to the mongoose-os directory**:
   ```bash
   cd mongoose-os
   ```

3. **Configure device settings**:
   ```bash
   mos config-set wifi.sta.ssid=YourWiFiSSID wifi.sta.pass=YourWiFiPassword
   mos config-set vector_api.server=https://your-vector-api.com
   mos config-set vector_api.device_id=device-001
   ```

4. **Build and flash the firmware**:
   ```bash
   mos build --platform esp32
   mos flash
   ```

5. **Monitor the device**:
   ```bash
   mos console
   ```

## Configuration

The firmware can be configured using the `mos config-set` command or by editing the `mos.yml` file:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `vector_api.enable` | boolean | `true` | Enable/disable Vector API integration |
| `vector_api.server` | string | `""` | Vector API server URL |
| `vector_api.device_id` | string | `""` | Unique device identifier |
| `vector_api.sync_interval` | integer | `10` | Sync interval in seconds |
| `vector_api.send_telemetry` | boolean | `true` | Send device telemetry |

### Example Configuration

```bash
# Basic setup
mos config-set vector_api.enable=true
mos config-set vector_api.server=https://vector-api.infinity-os.com
mos config-set vector_api.device_id=esp32-sensor-01

# Adjust sync interval (30 seconds)
mos config-set vector_api.sync_interval=30

# Disable telemetry
mos config-set vector_api.send_telemetry=false
```

## API Usage

### RPC Methods

#### Vector.Create
Create and send a vector to the server:
```bash
mos call Vector.Create '{"x": 3.5, "y": 2.1, "z": 4.7}'
```

Response:
```json
{
  "result": {
    "x": 3.5,
    "y": 2.1,
    "z": 4.7,
    "magnitude": 6.23
  }
}
```

#### Device.Status
Get device status:
```bash
mos call Device.Status
```

Response:
```json
{
  "uptime": 3600,
  "free_ram": 123456,
  "wifi_connected": true,
  "vector_api_enabled": true,
  "device_id": "esp32-sensor-01"
}
```

### HTTP Endpoints

#### POST /vector
Submit vector data via HTTP:
```bash
curl -X POST http://device-ip/vector \
  -H "Content-Type: application/json" \
  -d '{"x": 1.0, "y": 2.0, "z": 3.0}'
```

Response:
```json
{
  "status": "ok",
  "magnitude": 3.74
}
```

#### GET /vector
Get device information:
```bash
curl http://device-ip/vector
```

Response:
```json
{
  "status": "Vector API Device",
  "device_id": "esp32-sensor-01"
}
```

### MQTT Topics

The device publishes to:
- `vector-api/{device_id}/data` - Vector data and telemetry

Message format:
```json
{
  "device_id": "esp32-sensor-01",
  "vector": {
    "x": 3.5,
    "y": 2.1,
    "z": 4.7,
    "magnitude": 6.23
  },
  "timestamp": 1639484800
}
```

## JavaScript API (mJS)

The firmware includes a JavaScript API accessible via the mJS scripting engine:

```javascript
// Send a vector
VectorAPI.sendVector(3.5, 2.1, 4.7);

// Get device status
let status = VectorAPI.getStatus();
print('Device uptime:', status.uptime);
```

## Integration with Vector-API Server

To receive data from Mongoose.OS devices on your Vector-API server:

1. Set up an MQTT broker (e.g., Mosquitto, AWS IoT, HiveMQ)
2. Configure the device to connect to your broker
3. Subscribe to the `vector-api/+/data` topic
4. Process incoming vector data in your Vector-API application

### Example Server Integration (Node.js)

```javascript
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://your-broker.com');

client.on('connect', () => {
  client.subscribe('vector-api/+/data');
});

client.on('message', (topic, message) => {
  const data = JSON.parse(message.toString());
  console.log('Received vector from', data.device_id);
  // Process vector data in your Vector-API system
});
```

## Hardware Examples

### ESP32 with Accelerometer
```c
// In src/main.c, add sensor reading code
#include "mgos_i2c.h"

void read_accelerometer() {
    struct vector_data v;
    // Read from I2C accelerometer
    v.x = read_accel_x();
    v.y = read_accel_y();
    v.z = read_accel_z();
    send_vector_data(&v);
}
```

### ESP8266 with GPIO Sensors
```javascript
// In fs/init.js
load('api_adc.js');

Timer.set(5000, Timer.REPEAT, function() {
  let sensor_x = ADC.read(0) / 1024.0 * 10.0;
  let sensor_y = GPIO.read(4) ? 5.0 : 0.0;
  let sensor_z = Math.random() * 3.0;
  VectorAPI.sendVector(sensor_x, sensor_y, sensor_z);
}, null);
```

## Troubleshooting

### Device not connecting to WiFi
```bash
# Check WiFi credentials
mos config-get wifi.sta

# Scan available networks
mos wifi scan
```

### MQTT not connecting
```bash
# Enable debug logging
mos config-set debug.level=3

# Check MQTT settings
mos config-get mqtt
```

### Vector API not sending data
```bash
# Verify configuration
mos config-get vector_api

# Check device logs
mos console
```

## Development

### Building from source
```bash
cd mongoose-os
mos build --platform esp32 --verbose
```

### Adding custom sensors
Edit `src/main.c` and add your sensor reading code in the `telemetry_timer_cb` function.

### Modifying sync interval
```bash
mos config-set vector_api.sync_interval=60  # 60 seconds
```

## Security Considerations

- Use TLS/SSL for MQTT connections in production
- Implement device authentication tokens
- Rotate device credentials regularly
- Use secure WiFi (WPA2/WPA3)
- Keep firmware updated

## License

Part of the Vector-API Infinity OS ecosystem.

## Support

For issues and questions:
- GitHub Issues: https://github.com/pewpi-infinity/Vector-API/issues
- Documentation: https://github.com/pewpi-infinity/Vector-API

## Contributing

Contributions welcome! Please submit pull requests or open issues for improvements.
