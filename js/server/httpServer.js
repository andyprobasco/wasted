var http 		= require("http"),
	url			= require("url"),
	api			= require("./api");

function start(route, handle) {
	var app	= http.createServer(onRequest),
		io 	= require("socket.io").listen(app);

	function onRequest(request, response) {
		var pathname = url.parse(request.url).pathname
		console.log('pathname: ' + pathname);
		route(handle, pathname, response);
	}
	
	io.set('log level', 1);
	io.sockets.on('connection', function(socket) {
		api.start(socket);
	})
	
	app.listen(3030);
	console.log("Server has started.");
}
exports.start = start;