# Arduino Hand Gesture Screen Control — Plan

**Goal:** Use an Arduino + APDS-9960 gesture sensor to control the computer screen with left/right/up/down hand swipes.

---

## How It Works

```
Hand gesture
    ↓
APDS-9960 sensor (I2C → Arduino)
    ↓
Arduino reads gesture, sends string over USB Serial ("LEFT\n")
    ↓
Python script on PC reads serial port
    ↓
pyautogui / keyboard library translates to keypress or OS action
    ↓
Screen responds (browser back/forward, media control, etc.)
```

---

## Hardware Required

| Item | Notes | Approx. Cost |
|---|---|---|
| Arduino Uno or Nano | Any will work | $5–25 |
| APDS-9960 breakout board | SparkFun or generic clone | $5–10 |
| 4 jumper wires | Standard male-to-female | <$1 |
| **Total** | | **~$15–30** |

---

## Wiring (I2C — 4 wires)

| APDS-9960 Pin | Arduino Pin | Purpose |
|---|---|---|
| SDA | A4 (Uno) | Serial Data — carries gesture data |
| SCL | A5 (Uno) | Serial Clock — keeps both devices in sync |
| VCC | 3.3V | Power — **must be 3.3V, NOT 5V** |
| GND | GND | Ground — shared electrical reference |

> ⚠️ The APDS-9960 is a 3.3V device. Connecting VCC to the 5V pin will destroy it.

The sensor works reliably within **10–20cm** — best used as a close-range gesture pad.

---

## Arduino Sketch

Install the `SparkFun APDS9960` library via Arduino Library Manager first.

```cpp
#include <SparkFun_APDS9960.h>

SparkFun_APDS9960 apds;

void setup() {
    Serial.begin(9600);
    apds.init();
    apds.enableGestureSensor(true);
}

void loop() {
    if (apds.isGestureAvailable()) {
        switch (apds.readGesture()) {
            case DIR_LEFT:  Serial.println("LEFT");  break;
            case DIR_RIGHT: Serial.println("RIGHT"); break;
            case DIR_UP:    Serial.println("UP");    break;
            case DIR_DOWN:  Serial.println("DOWN");  break;
        }
    }
}
```

---

## Python Script (PC side)

Install dependencies first:
```bash
pip install pyserial pyautogui
```

```python
import serial
import pyautogui

# Change 'COM3' to your Arduino's port
# Mac/Linux: '/dev/tty.usbmodem...' or '/dev/ttyUSB0'
ser = serial.Serial('COM3', 9600)

while True:
    line = ser.readline().decode('utf-8').strip()
    if line == 'LEFT':
        pyautogui.hotkey('alt', 'left')    # browser back
    elif line == 'RIGHT':
        pyautogui.hotkey('alt', 'right')   # browser forward
    elif line == 'UP':
        pyautogui.press('volumeup')
    elif line == 'DOWN':
        pyautogui.press('volumedown')
```

Customize the `pyautogui` actions to whatever screen actions you want — next slide, media playback, tab switching, etc.

---

## Steps to Build

- [ ] Purchase Arduino Uno/Nano + APDS-9960 breakout board
- [ ] Install Arduino IDE
- [ ] Install SparkFun APDS9960 library (Library Manager → search "APDS9960")
- [ ] Wire sensor to Arduino (SDA→A4, SCL→A5, VCC→3.3V, GND→GND)
- [ ] Upload the sketch to the Arduino
- [ ] Open Serial Monitor and verify gesture strings print (LEFT/RIGHT/UP/DOWN)
- [ ] Install Python dependencies: `pip install pyserial pyautogui`
- [ ] Find your Arduino's COM port (Device Manager on Windows, `ls /dev/tty.*` on Mac)
- [ ] Update `COM3` in the Python script to your actual port
- [ ] Run the Python script and test gestures

---

## Notes

- The Python script must be running in the background whenever you want gesture control active. Consider wrapping it as a system startup script.
- `pyautogui` can trigger virtually any keyboard shortcut — adapt the actions to your workflow.
- If you want more range (gestures from further away), consider a radar module like the RCWL-0516, but it only detects presence — not direction. The APDS-9960 is the right choice for directional swipes.
