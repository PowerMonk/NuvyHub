#!/bin/bash
set -e

SOURCE_PATH=$1
OUTPUT_NAME=$2
BUILD_DIR="/tmp/build_$$"
OUTPUT_DIR="/app/builds"  # ✅ Cambiar de /out a /app/builds

echo "🔧 Iniciando compilación: $OUTPUT_NAME"
echo "📄 Archivo fuente: $SOURCE_PATH"

# Validación
if [ -z "$SOURCE_PATH" ] || [ -z "$OUTPUT_NAME" ]; then
    echo "❌ ERROR: Uso: $0 <source_path> <output_name>"
    exit 1
fi

if [ ! -f "$SOURCE_PATH" ]; then
    echo "❌ ERROR: Archivo fuente no encontrado: $SOURCE_PATH"
    exit 1
fi

# Setup
mkdir -p "$BUILD_DIR"
cp "$SOURCE_PATH" "$BUILD_DIR/main.c"

# CMakeLists.txt
cat > "$BUILD_DIR/CMakeLists.txt" << 'EOF'
cmake_minimum_required(VERSION 3.13)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(rp2040_project C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
pico_sdk_init()

add_executable(firmware main.c)
target_link_libraries(firmware pico_stdlib)
pico_enable_stdio_usb(firmware 1)
pico_enable_stdio_uart(firmware 0)
pico_add_extra_outputs(firmware)
EOF

# Compilación
cd "$BUILD_DIR"
echo "🔨 Ejecutando CMake..."
cmake -DCMAKE_BUILD_TYPE=Release . 2>&1

echo "🔨 Compilando con Make..."
make -j$(nproc) 2>&1

# Verificación
if [ -f "firmware.uf2" ]; then
    cp "firmware.uf2" "$OUTPUT_DIR/${OUTPUT_NAME}.uf2"
    echo "✅ Compilación exitosa: ${OUTPUT_NAME}.uf2"
    
    # Limpieza
    cd /
    rm -rf "$BUILD_DIR"
    exit 0
else
    echo "❌ ERROR: No se generó el binario UF2"
    echo "Contenido del directorio:"
    ls -la "$BUILD_DIR"
    exit 1
fi