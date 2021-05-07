# flic-hubsdk-modules
My own modules for the Flic SDK

## restart-balena-sound
Restarts a balena device (my use case is balena-sound) when a button is held.
To use, copy the files into the HUB SDK and fill in the following variables in main.js
* `activeButtonBdaddr` (button bdaddr)
* `balenaAPIKey` (Balena API key)
* `balenaDeviceUUID` (Balena device UUID)
