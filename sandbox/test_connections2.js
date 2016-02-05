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

var reportErr = function(err){
	console.log("ERR", err);
};

conn1.subscribeQueue("q1").then(function(){

	console.log("CONN1 subscribed to queue Q1");

	return conn2.enqueue("q1", { hello: "world" }).then(function(){

		console.log("CONN1 published msg");

	}, reportErr);

}).catch(reportErr);