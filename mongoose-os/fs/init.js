// Vector-API Mongoose.OS JavaScript initialization
load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');
load('api_wifi.js');

// Initialize Vector API client
let VectorAPI = {
  // Send vector data to server
  sendVector: function(x, y, z) {
    let cfg = Cfg.get();
    if (!cfg.vector_api.enable) {
      print('Vector API disabled');
      return false;
    }

    let magnitude = Math.sqrt(x * x + y * y + z * z);
    let data = JSON.stringify({
      device_id: cfg.vector_api.device_id,
      vector: {
        x: x,
        y: y,
        z: z,
        magnitude: magnitude
      },
      timestamp: Timer.now()
    });

    if (MQTT.isConnected()) {
      let topic = 'vector-api/' + cfg.vector_api.device_id + '/data';
      MQTT.pub(topic, data, 1);
      print('Vector sent:', data);
      return true;
    } else {
      print('MQTT not connected');
      return false;
    }
  },

  // Get device status
  getStatus: function() {
    return {
      uptime: Sys.uptime(),
      free_ram: Sys.free_ram(),
      total_ram: Sys.total_ram(),
      device_id: Cfg.get('vector_api.device_id')
    };
  }
};

// Auto-connect on WiFi ready
WiFi.on('connected', function() {
  print('WiFi connected, Vector API ready');
});

// Send periodic telemetry
if (Cfg.get('vector_api.send_telemetry')) {
  Timer.set(Cfg.get('vector_api.sync_interval') * 1000, Timer.REPEAT, function() {
    let status = VectorAPI.getStatus();
    VectorAPI.sendVector(
      status.free_ram / 1000,
      status.uptime / 100,
      WiFi.status() === 'got ip' ? 100 : 0
    );
  }, null);
}

print('Vector-API client initialized');
