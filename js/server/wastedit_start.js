var http			= require("http"),
	url				= require("url"),
	router			= require("./router"),
	requestHandlers = require("./requestHandlers"),
	wastedit		= require("./wastedit"),
	handle = {
		"/wastedit": requestHandlers.edit
	};

function start(route, handle) {
	var app	= http.createServer(onRequest),
		io	= require("socket.io").listen(app);

	function onRequest(request, response) {
		var pathname = url.parse(request.url).pathname;
		console.log('pathname: ' + pathname);
		route(handle, pathname, response);
	}
	
	io.set('log level', 1);
	io.sockets.on('connection', function(socket) {
		console.log(wastedit);
		console.log(router);
		wastedit.start(socket);
	});
	
	app.listen(3333);
	console.log("hey");
	console.log("Server has started.");
}
start(router.route, handle);
