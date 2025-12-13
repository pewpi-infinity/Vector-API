#include "mgos.h"
#include "mgos_http_server.h"
#include "mgos_rpc.h"
#include "mgos_wifi.h"
#include "mgos_mqtt.h"
#include "mgos_system.h"

static struct mg_connection *s_vector_api_conn = NULL;
static int s_reconnect_interval = 5;

// Vector data structure for neuromorphic processing
struct vector_data {
    double x;
    double y;
    double z;
    double magnitude;
};

// Calculate vector magnitude
static double calculate_magnitude(struct vector_data *v) {
    return sqrt(v->x * v->x + v->y * v->y + v->z * v->z);
}

// Send vector data to Vector-API server
static void send_vector_data(struct vector_data *v) {
    if (!mgos_sys_config_get_vector_api_enable()) {
        return;
    }

    const char *server = mgos_sys_config_get_vector_api_server();
    const char *device_id = mgos_sys_config_get_vector_api_device_id();
    
    if (!server || strlen(server) == 0) {
        LOG(LL_WARN, ("Vector API server not configured"));
        return;
    }

    v->magnitude = calculate_magnitude(v);

    struct mbuf fb;
    mbuf_init(&fb, 100);
    struct json_out out = JSON_OUT_MBUF(&fb);
    
    json_printf(&out, "{device_id: %Q, vector: {x: %.2f, y: %.2f, z: %.2f, magnitude: %.2f}, timestamp: %lu}",
                device_id ? device_id : "unknown",
                v->x, v->y, v->z, v->magnitude,
                (unsigned long) mg_time());

    LOG(LL_INFO, ("Sending vector data: %.*s", (int) fb.len, fb.buf));
    
    // In production, this would make an HTTP POST to the server
    // For now, we'll use MQTT if available
    if (mgos_mqtt_global_is_connected()) {
        char topic[100];
        snprintf(topic, sizeof(topic), "vector-api/%s/data", 
                device_id ? device_id : "unknown");
        mgos_mqtt_pub(topic, fb.buf, fb.len, 1, false);
    }
    
    mbuf_free(&fb);
}

// RPC handler for creating vectors from device
static void vector_create_handler(struct mg_rpc_request_info *ri, void *cb_arg,
                                   struct mg_rpc_frame_info *fi,
                                   struct mg_str args) {
    double x = 0, y = 0, z = 0;
    
    json_scanf(args.p, args.len, ri->args_fmt, &x, &y, &z);
    
    struct vector_data v = {x, y, z, 0};
    send_vector_data(&v);
    
    mg_rpc_send_responsef(ri, "{result: {x: %.2f, y: %.2f, z: %.2f, magnitude: %.2f}}", 
                         x, y, z, calculate_magnitude(&v));
    
    (void) cb_arg;
    (void) fi;
}

// RPC handler for getting device status
static void status_handler(struct mg_rpc_request_info *ri, void *cb_arg,
                           struct mg_rpc_frame_info *fi,
                           struct mg_str args) {
    int uptime = mgos_uptime();
    int free_ram = mgos_get_free_heap_size();
    bool wifi_connected = mgos_wifi_get_status() == MGOS_WIFI_IP_ACQUIRED;
    
    mg_rpc_send_responsef(ri, "{uptime: %d, free_ram: %d, wifi_connected: %B, "
                         "vector_api_enabled: %B, device_id: %Q}",
                         uptime, free_ram, wifi_connected,
                         mgos_sys_config_get_vector_api_enable(),
                         mgos_sys_config_get_vector_api_device_id());
    
    (void) cb_arg;
    (void) fi;
    (void) args;
}

// Periodic telemetry sender
static void telemetry_timer_cb(void *arg) {
    if (!mgos_sys_config_get_vector_api_send_telemetry()) {
        return;
    }
    
    // Send device telemetry as a vector
    // Using free heap size and uptime as vector dimensions for demonstration
    struct vector_data v = {
        (double) mgos_get_free_heap_size() / 1000.0,
        (double) mgos_uptime() / 100.0,
        (double) (mgos_wifi_get_status() == MGOS_WIFI_IP_ACQUIRED ? 100.0 : 0.0),
        0
    };
    
    send_vector_data(&v);
    
    (void) arg;
}

// HTTP endpoint handler for vector operations
static void vector_http_handler(struct mg_connection *nc, int ev, void *ev_data,
                                void *user_data) {
    if (ev == MG_EV_HTTP_REQUEST) {
        struct http_message *hm = (struct http_message *) ev_data;
        
        if (mg_vcmp(&hm->method, "POST") == 0) {
            double x = 0, y = 0, z = 0;
            json_scanf(hm->body.p, hm->body.len, "{x: %lf, y: %lf, z: %lf}", &x, &y, &z);
            
            struct vector_data v = {x, y, z, 0};
            send_vector_data(&v);
            
            mg_printf(nc, "HTTP/1.1 200 OK\r\n"
                         "Content-Type: application/json\r\n"
                         "Connection: close\r\n\r\n"
                         "{\"status\":\"ok\",\"magnitude\":%.2f}\n",
                         calculate_magnitude(&v));
        } else {
            mg_printf(nc, "HTTP/1.1 200 OK\r\n"
                         "Content-Type: application/json\r\n"
                         "Connection: close\r\n\r\n"
                         "{\"status\":\"Vector API Device\",\"device_id\":\"%s\"}\n",
                         mgos_sys_config_get_vector_api_device_id());
        }
        
        nc->flags |= MG_F_SEND_AND_CLOSE;
    }
    
    (void) user_data;
}

// Main application entry point
enum mgos_app_init_result mgos_app_init(void) {
    LOG(LL_INFO, ("Vector-API Mongoose.OS Integration Starting..."));
    
    // Register RPC handlers
    mg_rpc_add_handler(mgos_rpc_get_global(),
                       "Vector.Create", "{x: %lf, y: %lf, z: %lf}",
                       vector_create_handler, NULL);
    
    mg_rpc_add_handler(mgos_rpc_get_global(),
                       "Device.Status", "",
                       status_handler, NULL);
    
    // Register HTTP endpoint
    mgos_register_http_endpoint("/vector", vector_http_handler, NULL);
    
    // Set up periodic telemetry
    int sync_interval = mgos_sys_config_get_vector_api_sync_interval();
    if (sync_interval > 0) {
        mgos_set_timer(sync_interval * 1000, MGOS_TIMER_REPEAT, 
                      telemetry_timer_cb, NULL);
    }
    
    LOG(LL_INFO, ("Vector-API integration initialized"));
    LOG(LL_INFO, ("Server: %s", mgos_sys_config_get_vector_api_server()));
    LOG(LL_INFO, ("Device ID: %s", mgos_sys_config_get_vector_api_device_id()));
    
    return MGOS_APP_INIT_SUCCESS;
}
