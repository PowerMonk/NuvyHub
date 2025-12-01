# NuvyHub

NuvyHub is a cloud-based ESP32 firmware compiler supporting **both Arduino and ESP-IDF frameworks**. Upload your Arduino sketch (.ino) or ESP-IDF C code (.c) and get a compiled .bin file ready to flash to your ESP32 board.

## Features

- 🚀 **Dual Framework Support**: Arduino (.ino) OR ESP-IDF (.c)
- 🔄 Automatic framework detection based on file extension
- 🐳 Fully containerized with Docker
- 🔒 Secure Docker socket proxy configuration
- ⚡ Fast builds using PlatformIO (Arduino) and ESP-IDF v5.1
- 🌐 Simple drag-and-drop web interface
- 📶 Full WiFi, WebServer, and all Arduino ESP32 libraries support
- ⚙️ Low-level GPIO, FreeRTOS, and ESP-IDF native APIs support

## Architecture

The project consists of three main services:

- **web**: Deno-based HTTP server that handles file uploads and serves the web UI
- **builder**: Hybrid container with both PlatformIO (Arduino) and ESP-IDF (native C) toolchains
- **docker-proxy**: Security layer that filters allowed Docker API commands

## How to Run

### Prerequisites

- Docker and Docker Compose installed
- Cloudflare tunnel (optional, for remote access)

### Quick Start

1. Clone the repository:

```bash
git clone <repository-url>
cd NuvyHub
```

2. Build and start the services:

```bash
docker-compose up --build
```

3. Access the web interface:

   - Local: http://localhost:8080
   - Remote: Through Cloudflare tunnel (see below)

4. Upload your `.ino` (Arduino) or `.c` (ESP-IDF) file and download the compiled `.bin` file

### Cloudflare Tunnel (Optional)

To expose the server remotely, use Cloudflare Tunnel:

```bash
cloudflared tunnel run nuvyhub-tunnel
```

## Project Structure

```
NuvyHub/
├── docker-compose.yml       # Service orchestration
├── web/                     # Deno web server
│   ├── Dockerfile
│   └── server.ts           # Main server code
├── builder/                 # ESP32 build container
│   ├── Dockerfile
│   └── compile-esp32.sh    # Compilation script
└── readme.md
```

## Compilation Process

The server automatically detects the file type and chooses the appropriate toolchain:

### Arduino (.ino files)

1. Receives Arduino sketch file
2. Creates PlatformIO project structure in `/tmp`
3. Generates platformio.ini configuration
4. Compiles with PlatformIO (`pio run`)
5. Returns the compiled firmware.bin

### ESP-IDF (.c files)

1. Receives C source file
2. Creates ESP-IDF project structure with CMakeLists.txt
3. Configures for ESP32 target (`idf.py set-target esp32`)
4. Compiles with ESP-IDF (`idf.py build`)
5. Returns the compiled firmware.bin

## Development Notes

- The web server runs on port 8080 (bound to localhost only)
- Builds are stored in the `nuvy_builds` Docker volume
- Compiled binaries are automatically deleted 10 seconds after download
- Source files (.ino/.c) are cleaned up after successful compilation
- Framework is auto-detected based on file extension (.ino = Arduino, .c = ESP-IDF)
- Uses PlatformIO (Arduino) and ESP-IDF v5.1 (native C)
- Supports all Arduino ESP32 libraries (WiFi, WebServer, Update, etc.)
- Supports all ESP-IDF native APIs (FreeRTOS, GPIO driver, etc.)

## Code Examples

### Arduino Framework (.ino files)

```cpp
#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "YourSSID";
const char* password = "YourPassword";

WebServer server(80);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  server.on("/", []() {
    server.send(200, "text/plain", "Hello from ESP32!");
  });

  server.begin();
}

void loop() {
  server.handleClient();
}
```

### For GPIO operations, use Arduino functions:

```cpp
// ✅ CORRECT - Arduino style
const int LED_PIN = 2;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}
```

````cpp
// ❌ WRONG - ESP-IDF style (will fail in Arduino framework)
#define BLINK_GPIO 2

void setup() {
  gpio_reset_pin((gpio_num_t)BLINK_GPIO);  // Don't use this
  gpio_set_direction((gpio_num_t)BLINK_GPIO, GPIO_MODE_OUTPUT);
}
```## Why is the gitignore ignoring the Deno files?

Because the purpose of this repository is to serve as the proper Docker container prep for the server side. Since the usage of Deno is specified in the Dockerfile, those files become unnecessary in the repository.
````
