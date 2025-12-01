#!/bin/bash
set -e

SOURCE_PATH=$1
OUTPUT_NAME=$2
OUTPUT_DIR="/app/builds"

echo "🔧 Iniciando compilación ESP32: $OUTPUT_NAME"

# Validación
if [ -z "$SOURCE_PATH" ] || [ -z "$OUTPUT_NAME" ]; then
    echo "❌ ERROR: Uso: $0 <source_path> <output_name>"
    exit 1
fi

if [ ! -f "$SOURCE_PATH" ]; then
    echo "❌ ERROR: Archivo fuente no encontrado: $SOURCE_PATH"
    exit 1
fi

# Detectar tipo de archivo y framework
FILE_EXT="${SOURCE_PATH##*.}"

echo "🔍 DEBUG: SOURCE_PATH=$SOURCE_PATH"
echo "🔍 DEBUG: FILE_EXT=$FILE_EXT"

if [ "$FILE_EXT" = "ino" ]; then
    echo "📱 Detectado: Arduino sketch (.ino)"
    echo "🔨 Compilando con PlatformIO..."
    
    PROJECT_DIR="/tmp/pio_project_$$"
    mkdir -p "$PROJECT_DIR/src"
    cp "$SOURCE_PATH" "$PROJECT_DIR/src/main.ino"
    
    # Crear platformio.ini para Arduino
    cat > "$PROJECT_DIR/platformio.ini" << 'EOF'
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
build_unflags = 
    -Werror=all
    -Wall
build_flags = 
    -w
    -fpermissive
EOF
    
    cd "$PROJECT_DIR"
    pio run
    
    BIN_PATH="$PROJECT_DIR/.pio/build/esp32dev/firmware.bin"
    
elif [ "$FILE_EXT" = "c" ]; then
    echo "⚙️ Detectado: ESP-IDF C (.c)"
    echo "🔨 Compilando con ESP-IDF..."
    
    PROJECT_DIR="/tmp/esp_idf_project_$$"
    mkdir -p "$PROJECT_DIR/main"
    cp "$SOURCE_PATH" "$PROJECT_DIR/main/main.c"
    
    # Crear CMakeLists.txt raíz
    cat > "$PROJECT_DIR/CMakeLists.txt" << 'EOF'
cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_firmware)
EOF
    
    # Crear CMakeLists.txt de main/
    cat > "$PROJECT_DIR/main/CMakeLists.txt" << 'EOF'
idf_component_register(SRCS "main.c"
                       INCLUDE_DIRS "")
EOF
    
    cd "$PROJECT_DIR"
    . $IDF_PATH/export.sh
    idf.py set-target esp32
    idf.py build
    
    BIN_PATH="$PROJECT_DIR/build/esp32_firmware.bin"
    
else
    echo "❌ ERROR: Tipo de archivo no soportado: .$FILE_EXT"
    echo "Formatos válidos: .ino (Arduino) o .c (ESP-IDF)"
    exit 1
fi

# Verificar y copiar binario
if [ -f "$BIN_PATH" ]; then
    cp "$BIN_PATH" "$OUTPUT_DIR/${OUTPUT_NAME}.bin"
    echo "✅ Compilación exitosa: ${OUTPUT_NAME}.bin"
    
    # Limpieza
    rm -rf "$PROJECT_DIR"
    exit 0
else
    echo "❌ ERROR: No se generó firmware.bin"
    find "$PROJECT_DIR" -name "*.bin" 2>/dev/null || echo "No se encontraron archivos .bin"
    ls -la "$PROJECT_DIR/build/" 2>/dev/null || ls -la "$PROJECT_DIR/.pio/build/" 2>/dev/null || echo "Directorios de build no existen"
    rm -rf "$PROJECT_DIR"
    exit 1
fi