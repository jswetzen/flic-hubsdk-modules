/*
Listens to buttons and triggers a request to Home Assistant
*/
var buttonManager = require("buttons");
var http = require("http");

// My buttons
var buttonNames = {
	"": "kaffekokare",
	"": "gron",
}

var hassBaseUrl = 'http://192.168.1.4:8123/api/webhook/';

buttonManager.on("buttonSingleOrDoubleClickOrHold", function(obj) {
	console.log("Button clicked: " + obj.bdaddr);
	action = 1;
	if (obj.isDoubleClick) {
		action = 2;
	} else if (obj.isHold) {
		action = 3;
	}
	
	if (obj.bdaddr in buttonNames) {
		buttonName = buttonNames[obj.bdaddr];
		console.log("Name: " + buttonName);
		var url = hassBaseUrl + "flic_" + buttonName + "_" + action;
		console.log("POSTing to url " + url);
		http.makeRequest({
			url: url,
			method: "POST",
			headers: {"Content-Type": "application/json"},
			content: JSON.stringify({}),	
		}, function(err, res) {
			if (err) {
				console.log("Error: " + err);
			} else {
				console.log("Request status: " + res.statusCode);
			}
		});
	}
});

console.log("Started Home Assistant Trigger");