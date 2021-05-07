/*
Listens to button hold and triggers a reboot of a balena device.
Used to restart balena sound.
*/
var buttonManager = require("buttons");
var http = require("http");

// List some buttons
var greenButtonBdaddr = "";
var whiteButtonBdaddr = "";

// Balena variables, to access the right device
var balenaAPIKey = "";
var balenaDeviceUUID = "";

// Trigger on the green button (bedroom)
var activeButtonBdaddr = greenButtonBdaddr;
var url = 'https://api.balena-cloud.com/supervisor/v1/reboot';

buttonManager.on("buttonClickOrHold", function(obj) {
	if (obj.bdaddr == activeButtonBdaddr && obj.isHold) {
		console.log("Button held, triggering reboot")
		http.makeRequest({
			url: url,
			method: "POST",
			headers: {"Content-Type": "application/json",
								"Authorization": "Bearer " + balenaAPIKey},
			content: JSON.stringify({"uuid": balenaDeviceUUID}),		
		}, function(err, res) {
			console.log("Request status: " + res.statusCode);
		});
	}

});

console.log("Started restart-balena-sound");
