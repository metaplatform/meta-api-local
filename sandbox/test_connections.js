var Broker = require(__dirname + "/../lib/broker.js");
var Connection = require(__dirname + "/../lib/connection.js");
var logger = require("meta-logger");
 
//Setup targets 
logger.toConsole({
	level: "debug",
	timestamp: true,
	colorize: true
});

var handleCall = function(endpoint, method, params){

	return new Promise(function(resolve, reject){

		console.log("CALL", endpoint, method, params);

		resolve(true);

	});

};

var handleMessage = function(channel, message){

	console.log("MESSAGE", channel, message);

};

var handleQueueMessage = function(queue, message){

	return new Promise(function(resolve, reject){

		console.log("QUEUE MSG", queue, message);

		resolve();

	});

};

var broker = new Broker();
var conn1 = broker.connect("serviceAbc", handleCall, handleMessage, handleQueueMessage);
var conn2 = broker.connect(null, handleCall, handleMessage, handleQueueMessage);

conn2.subscribe("chann1").then(function(){
	
	console.log("CLIENT", conn1.clientId, "subscribed to chann1");
	
	conn1.publish("chann1", { lorem: "ipsum" }).then(function(){
		
		console.log("CLIENT", conn1.clientId, "published to chann1");

		try {
			conn1.close();
			conn2.close();
		} catch(e){
			console.log("ERRR", e);
		}

		console.log(broker);

	}, function(err){
		console.log("ERR", err);
	});

}, function(err){
	console.log("ERR", err);
});