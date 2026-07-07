# Arduino Hand Gesture Sensor Tutorial

> Not part of the Resumegen application — saved here per user request so it's findable in future sessions (a prior version of this tutorial, from an earlier conversation, could not be located).

**Goal:** Detect basic hand swipe gestures (up/down/left/right) with an Arduino, using a sensor with a built-in gesture engine so no accelerometer math is required.

**Component:** APDS-9960 gesture/proximity/color sensor (~$5-8). Chosen over an IMU (e.g. MPU6050) because it classifies directional swipes on-chip — an IMU would require writing your own gesture-detection/threshold logic.

## Hardware

- Arduino Uno (or any 5V/3.3V-tolerant board)
- APDS-9960 breakout board (SparkFun or generic clone)
- 4 jumper wires
- Breadboard (optional)

## Wiring (I2C)

| APDS-9960 | Arduino Uno |
|---|---|
| VCC | 3.3V |
| GND | GND |
| SDA | A4 |
| SCL | A5 |

On boards with dedicated SDA/SCL pins, use those instead of A4/A5.

## Software setup

1. Arduino IDE → **Sketch → Include Library → Manage Libraries**
2. Search "SparkFun APDS9960" → install **SparkFun APDS-9960 RGB and Gesture Sensor Library**

## Code

```cpp
#include <Wire.h>
#include <SparkFun_APDS9960.h>

SparkFun_APDS9960 apds = SparkFun_APDS9960();

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (apds.init()) {
    Serial.println("APDS-9960 initialized");
  } else {
    Serial.println("Init failed — check wiring");
  }

  if (apds.enableGestureSensor(true)) {
    Serial.println("Gesture sensor enabled");
  }
}

void loop() {
  if (apds.isGestureAvailable()) {
    switch (apds.readGesture()) {
      case DIR_UP:    Serial.println("UP");    break;
      case DIR_DOWN:  Serial.println("DOWN");  break;
      case DIR_LEFT:  Serial.println("LEFT");  break;
      case DIR_RIGHT: Serial.println("RIGHT"); break;
      case DIR_NEAR:  Serial.println("NEAR");  break;
      case DIR_FAR:   Serial.println("FAR");   break;
      default:        Serial.println("NONE");  break;
    }
  }
}
```

## Test

1. Upload, open Serial Monitor at 9600 baud.
2. Swipe your hand ~2-4 inches above the sensor in each direction.
3. Direction should print to Serial Monitor.

## Common gotchas

- **No output at all** — check SDA/SCL aren't swapped, and VCC is 3.3V (most APDS-9960 breakouts are 3.3V-only, though some have an onboard regulator — check your specific board's silkscreen).
- **Erratic/no gesture detection** — ambient light interference; test away from direct sunlight or bright LEDs.
- **Gestures must be within ~10cm** of the sensor and reasonably deliberate (not too slow).

## Follow-up (not covered here)

Custom gestures beyond the 4 directions (e.g. a wave or circle) require an IMU (MPU6050) plus your own threshold/pattern-matching logic — a separate, harder tutorial than this one.
