// Ejemplo correcto de Blink para ESP32 usando Arduino
// Este código SÍ compilará correctamente

const int LED_PIN = 2;  // LED integrado en la mayoría de ESP32

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("ESP32 Blink iniciado!");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(1000);
  
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
