# Mongoose.OS Integration Quick Start Guide

This guide will help you quickly set up and connect IoT devices running Mongoose.OS to your Vector-API system.

## Prerequisites

- ESP32 or ESP8266 development board
- USB cable for programming
- WiFi network credentials
- [Mongoose.OS mos tool](https://mongoose-os.com/docs/mongoose-os/quickstart/setup.md) installed

## Step 1: Install Mongoose.OS Tool

### Linux/macOS
```bash
curl -fsSL https://mongoose.ws/downloads/mos/install.sh | sh
```

### Windows
Download the installer from: https://mongoose-os.com/downloads.html

Verify installation:
```bash
mos version
```

## Step 2: Flash Firmware to Your Device

Navigate to the mongoose-os directory and connect your device:

```bash
cd Vector-API/mongoose-os
```

Build and flash for ESP32:
```bash
mos build --platform esp32
mos flash
```

Or for ESP8266:
```bash
mos build --platform esp8266
mos flash
```

## Step 3: Configure WiFi

Set your WiFi credentials:

```bash
mos wifi YOUR_WIFI_SSID YOUR_WIFI_PASSWORD
```

## Step 4: Configure Vector-API Settings

Set the Vector-API server URL and device ID:

```bash
# Set your Vector-API server (use your actual server URL)
mos config-set vector_api.server=https://your-vector-api-server.com

# Set a unique device ID
mos config-set vector_api.device_id=my-device-001

# Optional: Adjust sync interval (seconds)
mos config-set vector_api.sync_interval=10
```

## Step 5: Monitor Device

Watch the device logs to see it connecting:

```bash
mos console
```

You should see output like:
```
Vector-API Mongoose.OS Integration Starting...
Vector-API integration initialized
Server: https://your-vector-api-server.com
Device ID: my-device-001
WiFi connected, Vector API ready
```

## Step 6: Register Device in Web UI

1. Open the Vector-API web application
2. Log in with your credentials
3. Navigate to **Portal → IoT Devices**
4. Click **"+ Add Device"**
5. Enter device details:
   - Device ID: `my-device-001`
   - Name: `My First Device`
   - Type: `ESP32` or `ESP8266`
   - Firmware: `mongoose-os-1.0`
6. Click **"Register Device"**

## Step 7: Test Vector Communication

### Method 1: Using RPC

Send a test vector via RPC command:

```bash
mos call Vector.Create '{"x": 3.5, "y": 2.1, "z": 4.7}'
```

Expected response:
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

### Method 2: Using HTTP

Get the device IP address:
```bash
mos wifi
```

Then use curl:
```bash
curl -X POST http://DEVICE_IP/vector \
  -H "Content-Type: application/json" \
  -d '{"x": 1.0, "y": 2.0, "z": 3.0}'
```

### Method 3: Automatic Telemetry

The device automatically sends telemetry every 10 seconds (configurable) with:
- Free memory as X dimension
- Uptime as Y dimension
- WiFi status as Z dimension (100 if connected, 0 if not)

## Troubleshooting

### Device won't connect to WiFi

```bash
# Check WiFi settings
mos config-get wifi.sta

# Scan for networks
mos wifi scan

# Re-configure WiFi
mos wifi YOUR_SSID YOUR_PASSWORD
```

### Can't see device in web UI

1. Ensure device is online (check console output)
2. Verify device ID matches in both device config and web UI
3. Check that telemetry is enabled:
   ```bash
   mos config-get vector_api.send_telemetry
   ```
4. Enable if needed:
   ```bash
   mos config-set vector_api.send_telemetry=true
   ```

### Device keeps disconnecting

```bash
# Increase WiFi power save timeout
mos config-set wifi.sta.ps_timeout=30000

# Check memory usage
mos call Device.Status
```

### No telemetry data

Check that MQTT is working (if using MQTT):
```bash
# Check MQTT configuration
mos config-get mqtt

# Monitor MQTT messages in console
mos console
```

## Advanced Configuration

### Custom Sync Interval

Change how often device sends data (in seconds):
```bash
mos config-set vector_api.sync_interval=30  # 30 seconds
```

### Disable Telemetry

If you only want manual vector sending:
```bash
mos config-set vector_api.send_telemetry=false
```

### Custom Firmware Modifications

Edit `mongoose-os/src/main.c` to add custom sensor reading or vector calculations. After editing:

```bash
mos build --platform esp32
mos flash
```

## Example Sensor Integration

### Reading from an Accelerometer (I2C)

Add to `src/main.c`:

```c
#include "mgos_i2c.h"

// In telemetry_timer_cb function, replace the demo vector:
struct mgos_i2c *i2c = mgos_i2c_get_global();
uint8_t data[6];
// Read accelerometer data (example for MPU6050)
mgos_i2c_read_reg_n(i2c, 0x68, 0x3B, 6, data);

struct vector_data v = {
    (double)((int16_t)((data[0] << 8) | data[1])) / 16384.0,  // X
    (double)((int16_t)((data[2] << 8) | data[3])) / 16384.0,  // Y
    (double)((int16_t)((data[4] << 8) | data[5])) / 16384.0,  // Z
    0
};

send_vector_data(&v);
```

### Reading from GPIO

Add to `fs/init.js`:

```javascript
load('api_gpio.js');

GPIO.set_mode(4, GPIO.MODE_INPUT);

Timer.set(5000, Timer.REPEAT, function() {
  let button_state = GPIO.read(4) ? 1.0 : 0.0;
  let analog_value = ADC.read(0) / 1024.0;
  
  VectorAPI.sendVector(button_state, analog_value, Math.random());
}, null);
```

## Next Steps

- Explore the full [Mongoose.OS README](./mongoose-os/README.md)
- Add custom sensors and actuators
- Integrate with your backend MQTT broker
- Scale to multiple devices
- Implement custom vector processing algorithms

## Support

- **Vector-API Issues**: https://github.com/pewpi-infinity/Vector-API/issues
- **Mongoose.OS Forum**: https://forum.mongoose-os.com/
- **Mongoose.OS Documentation**: https://mongoose-os.com/docs/

## License

This integration is part of the Vector-API Infinity OS ecosystem.
