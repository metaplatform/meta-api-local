# meta-api-local

META API local (eg. not remote) connector and broker for local development or monolitic architecture.

## Warning
Unstable development version. Uses `meta-api-endpoints` from local path instead of package.

## TO-DO
Tests, tests and tests.

## Usage
```javascript
var Api = require("meta-api-local");

var broker = new Api.Broker();
var serviceConnection = new Api.Client("myService");
var localClient = new Api.Client();

serviceConnection.connect(broker).then(function(){
	
	//...

});

localClient.connect(broker).then(function(){
	
	//...

});
```

## Client interface
```javascript
/*
 * Creates virtual connection to broker
 *
 * @param Broker broker
 * @return Promise
 * @resolve true
 */
Client.prototype.connect = function(broker);

/*
 * Closes virtual connection - removes all subscriptions
 *
 * @return Promise
 * @resolve true
 */
Client.prototype.close();

/*
 * Add property to root endpoint
 *
 * @param String name
 * @param Function handler
 * @return Endpoint
 */
Client.prototype.endpoint = function(name, handler);

/*
 * RPC call
 *
 * @param String service
 * @param String endpoint
 * @param String method
 * @param Object params
 * @return Promise
 * @resolve Object
 */
Client.prototype.call = function(service, endpoint, method, params);

/*
 * Subscribe to channel
 *
 * @param String channel
 * @param Function cb
 * @return Promise
 * @resolve Object Subscription handler with remove() method
 */
Client.prototype.subscribe = function(channel, cb);

/*
 * Unsubscribes from channel
 *
 * @param String channel
 * @param Function cb
 * @return Promise
 * @resolve Bool true if was subscribed
 */
Client.prototype.unsubscribe = function(channel, cb);

/*
 * Publish message
 *
 * @param String channel
 * @param Object message
 * @return Promise
 * @resolve true
 */
Client.prototype.publish = function(channel, message);

/*
 * Subscribes to queue messages
 *
 * @param String queue
 * @param Function cb
 * @return Promise
 * @resolve Object Subscription handler with remove() method
 */
Client.prototype.subscribeQueue = function(queue, cb);

/*
 * Unsubscribes from queue messages
 *
 * @param String queue
 * @param Function cb
 * @return Promise
 * @resolve Bool true if was subscribed
 */
Client.prototype.unsubscribeQueue = function(queue);

/*
 * Enqueue message
 *
 * @param String queue
 * @param Object message
 * @return Promise
 * @resolve true
 */
Client.prototype.enqueue = function(queue, message);
```

## Testing
```
npm install --dev
npm test
```

## License
Not yet defined - assume Free for non-commercial use