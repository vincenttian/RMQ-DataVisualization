var express = require('express'),
    http = require('http'),
    path = require('path'),
    url = require('url'),
    amqp = require('amqp'),
	winston = require('winston'),
	nconf = require('nconf');

var app = express();

// Start Vincent trying to get logging to work
// Logging
if(!process.env.NODE_ENV) { process.env.NODE_ENV = 'local'; }
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({colorize:true}) ] });
var env = process.env.NODE_ENV
// merge nconf overrides with the configuration file.
nconf.argv().env().file({ file: env+'.json' });
nconf.set('approot', __dirname ); // set approot root
// load express settings
require('./node_modules/express')(app, nconf, express, logger);
// End Vincent trying to get logging to work

// suspect
app.use(express.static(__dirname + "/public"));
var modelsPath = path.normalize(path.join(__dirname, '/app/models'));
// end suspect

app.configure(function(){
  app.set('port', process.env.VCAP_APP_PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.static(path.join(__dirname, 'public')));
  app.engine('.html', require('jade').__express);
  app.set('view engine', 'html');
});

// Global variables
app.connectionStatus = 'No server connection';
app.exchangeStatus = 'No exchange established';
app.queueStatus = 'No queue established';

app.get('/', function(req, res){
  res.render('index.jade', { title: 'DataYes Data Visualization Landing Page',
    connectionStatus: app.connectionStatus,
    exchangeStatus: app.exchangeStatus,
    queueStatus: app.queueStatus
  });
});

function connectionUrl(){
  if (process.env.VCAP_SERVICES){
    conf = JSON.parse(process.env.VCAP_SERVICES);
    return conf['rabbitmq-2.4'][0].credentials.url;
  } else {
    return 'amqp://localhost';
  }
}

app.post('/start-server', function(req, res){
  app.rabbitMqConnection = amqp.createConnection({ url: connectionUrl() });
	
  app.rabbitMqConnection.on('ready', function(){
    app.connectionStatus = 'Connected!';
		
	var connection = app.rabbitMqConnection;
	// Use the default 'amq.topic' exchange
	connection.queue('my-queue');
	
    res.redirect('/');
  });
});

app.post('/new-exchange', function(req, res){
  
  app.e = app.rabbitMqConnection.exchange('test-exchange');
  app.exchangeStatus = 'An exchange has been established!';
  res.redirect('/');
});

app.post('/new-queue', function(req, res){
  app.q = app.rabbitMqConnection.queue('test-queue') 
  app.queueStatus = 'The queue is ready for use!';
  res.redirect('/');
  });

app.get('/message-service', function(req, res){
  app.q.bind(app.e, '#');
  res.render('message-service.jade',
    {
      title: 'DataYes Charts and Graphs',
      sentMessage: ''
    });
});

app.post('/newMessage', function(req, res){
  var newMessage = req.body.newMessage;
  app.e.publish('routingKey', { message: newMessage });

  app.q.subscribe(function(msg){
    var ticker = msg.message;
    res.render('message-service.jade',
      {
        title: 'Here are the charts from d3!',
        sentMessage: 'You selected ' + ticker + '. We are currently working on building these charts'
		// need to send data here to message-service.jade? hardcode for now and create charts from it
      });
	  
	  // send ticker to rabbitMQ to retrieve data for that ticker

	  
	  // SAMPLE JSON FROM RABBITMQ
	//{ "Market Data" : {
	//	[
	//		{"symbol":"IBM", "price": "130.54", "shares": "3000"}
	//		{"symbol":"MSFT", "price" :"32.34", "shares":"4000"}
	//	]
	//	}
	//}
	

	  // generating random data
		var open = (Math.random()*100)+1;
		var close = (Math.random()*100)+1;
		while ( (open-close) > 5 ) {
			close = (Math.random()*100)+1;
		}
		var high = open + (Math.random() * 10);
		var low = open - (Math.random() * 10);
		var average = (open+close) / 2;
		
		
		// need to use data and format it with d3
		
		
		
	// writehead has already been called
	// do i need to end it?
    // app.rabbitMqConnection.end();
  });
});

app.set('view options', { pretty: true });

app.get('/data-visualization', function(req, res){
  res.render('data.jade');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
