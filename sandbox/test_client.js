var Api = require(__dirname + "/../index.js");
var logger = require("meta-logger");
 
//Setup targets 
logger.toConsole({
	level: "debug",
	timestamp: true,
	colorize: true
});

var broker = new Api.Broker();

var client1 = new Api.Client("serviceA");
var client2 = new Api.Client();
var client3 = new Api.Client("serviceA");

client1.connect(broker).then(function(){
	
	console.log("CLIENT 1 connected.");

}).then(function(){

	return client2.connect(broker).then(function(){

		console.log("CLIENT 2 connected.");

	});

}).then(function(){

	return client3.connect(broker).then(function(){

		console.log("CLIENT 3 connected.");

	});

}).then(function(){

	return client1.subscribeQueue("queue1", function(msg){
		
		console.log("CLIENT 1 QUEUE MSG", msg);

	}).then(function(){

		console.log("CLIENT 1 subscribed to queue1.");

	});

}).then(function(){

	return client3.subscribeQueue("queue1", function(msg){
		
		console.log("CLIENT 3 QUEUE MSG", msg);

	}).then(function(){

		console.log("CLIENT 3 subscribed to queue1.");

	});

}).then(function(){

	return client2.enqueue("queue1", { hello: "world" }).then(function(){

		console.log("CLIENT 2 published to queue1.");

	});

}).then(function(){

	return client1.close().then(function(){

		console.log("CLIENT 1 disconnected.");

	});

}).then(function(){

	return client2.enqueue("queue1", { hello: "world" }).then(function(){

		console.log("CLIENT 2 published to queue1.");

	});

}).catch(function(err){
	console.log("ERR", err);
});