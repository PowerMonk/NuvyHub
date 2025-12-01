#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

// El LED integrado suele ser el GPIO 2 en la mayoría de ESP32 devkits
#define BLINK_GPIO 2

void app_main(void)
{
    // Configurar el pin como salida
    gpio_reset_pin(BLINK_GPIO);
    gpio_set_direction(BLINK_GPIO, GPIO_MODE_OUTPUT);

    int counter = 0;
    while(1) {
        printf("Hola desde NuvyHub! Contador: %d\n", counter++);
        
        // Encender LED
        gpio_set_level(BLINK_GPIO, 1);
        vTaskDelay(1000 / portTICK_PERIOD_MS); // Esperar 1 segundo
        
        // Apagar LED
        gpio_set_level(BLINK_GPIO, 0);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
}
