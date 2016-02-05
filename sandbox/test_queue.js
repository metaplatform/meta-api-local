var MemoryQueue = require(__dirname + "/../lib/memoryQueue.js");
var logger = require("meta-logger");
 
//Setup targets 
logger.toConsole({
	level: "debug",
	timestamp: true,
	colorize: true
});

var state = 0;

var handler = function(channel, recipient, msg){

	return new Promise(function(resolve, reject){

		console.log("GOT MSG", channel, recipient, msg, state);

		var localState = state;
		state = (state + 1)//; % 3;

		if(localState === 1){
			return reject(new Error("Test error"));
		} else if(localState === 2){
			setTimeout(resolve, 5000);
		} else if(localState >= 3){
			return;
		} else {
			resolve();
		}

	});

};

var queue = new MemoryQueue(handler, {
	defaultTTL: 3,
	timeout: 500,
	interval: 1000
});

var reportErr = function(err){
	console.log("ERR", err);
};

queue.enqueue("chann", ["john", "jack", "laura"], { lorem: "ipsum" }).then(function(){
	console.log("ENQUEUED");
}, reportErr);