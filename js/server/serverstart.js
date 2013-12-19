var httpServer		= require("./httpServer"),
	router 			= require("./router"),
	requestHandlers = require("./requestHandlers"),
	gameServer 		= require("./gameServer"),
	handle = {};

handle["/wasted"] 	= requestHandlers.game;
httpServer.start(router.route, handle);
gameServer.start();