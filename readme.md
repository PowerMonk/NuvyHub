# NuvyHub

NuvyHub is a cloud-based ESP32 firmware compiler. Upload your C source code and get a compiled .bin file ready to flash to your ESP32 board.

## Features

- 🚀 Web-based C code compilation for ESP32 using ESP-IDF
- 🐳 Fully containerized with Docker
- 🔒 Secure Docker socket proxy configuration
- ⚡ Fast builds using ESP-IDF toolchain
- 🌐 Simple drag-and-drop web interface

## Architecture

The project consists of three main services:

- **web**: Deno-based HTTP server that handles file uploads and serves the web UI
- **builder**: ESP-IDF container with full ESP32 toolchain for C compilation
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

4. Upload your `.ino` file and download the compiled `.bin` file

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

The server follows these steps:

1. Receives C code file (main.c)
2. Creates ESP-IDF project structure in `/tmp`
3. Generates CMakeLists.txt files
4. Compiles with ESP-IDF toolchain (`idf.py build`)
5. Returns the compiled firmware.bin

## Development Notes

- The web server runs on port 8080 (bound to localhost only)
- Builds are stored in the `nuvy_builds` Docker volume
- Compiled binaries are automatically deleted 10 seconds after download
- Source files (.c) are cleaned up after successful compilation
- Uses ESP-IDF v5.1 for compilation

## Why is the gitignore ignoring the Deno files?

Because the purpose of this repository is to serve as the proper Docker container prep for the server side. Since the usage of Deno is specified in the Dockerfile, those files become unnecessary in the repository.
