// Ejemplo de WiFi + WebServer + OTA Update
// Este es el tipo de código que funciona perfectamente

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>

const char* ssid = "ESP32_SETUP";
const char* password = "12345678";

WebServer server(80);

void handleUpdateUpload() {
  HTTPUpload& upload = server.upload();

  if (upload.status == UPLOAD_FILE_START) {
    Serial.printf("Subiendo: %s\n", upload.filename.c_str());
    if (!Update.begin()) { 
      Update.printError(Serial);
    }
  } 
  else if (upload.status == UPLOAD_FILE_WRITE) {
    if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
      Update.printError(Serial);
    }
  } 
  else if (upload.status == UPLOAD_FILE_END) {
    if (Update.end(true)) {
      Serial.printf("Actualización completa! Reiniciando...\n");
    } else {
      Update.printError(Serial);
    }
  }
}

void handleUpdatePage() {
  server.sendHeader("Connection", "close");
  server.send(200, "text/html",
    "<form method='POST' action='/update' enctype='multipart/form-data'>"
    "<input type='file' name='firmware'><input type='submit' value='Update'>"
    "</form>"
  );
}

void setup() {
  Serial.begin(115200);

  WiFi.softAP(ssid, password);  
  Serial.println("AP listo. Conéctate a:");
  Serial.println(ssid);

  server.on("/", HTTP_GET, handleUpdatePage);

  server.on("/update", HTTP_POST, []() {
    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", Update.hasError() ? "FAIL" : "OK");
  }, handleUpdateUpload);

  server.begin();
}

void loop() {
  server.handleClient();
}
