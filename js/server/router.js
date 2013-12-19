function route(handle, pathname, response, app) {
	var path	= require('path'),
		fs 		= require('fs'),
		projectPath	= path.resolve(process.cwd(), "../../.."), //project path relative to location of this file
		filename 	= path.join(projectPath, pathname),
		extname = path.extname(filename),
		contentType = 'text/html';
	if (extname === ".js") {
		contentType = 'text/javascript';
	} else if (extname === ".css") {
		contentType = 'text/css';
	} else if (extname === ".png") {
		contentType = 'image/png';
	} else if (extname === ".svg") {
		contentType = 'image/svg+xml'
	}
	if (typeof handle[pathname] === 'function'){
		handle[pathname](response, app);
	} else {
		path.exists(filename, function(exists) {
			if(!exists) {
				console.log("does not exist!");
				console.log(filename);
				response.writeHead(404, {"Content-Type": "text/plain"});  
				response.write("404 Not Found\n");  
				response.end();  
				return;  
			}  	  
			fs.readFile(filename, "binary", function(err, file) {  
				if(err) { 
					console.log(err)
					response.writeHead(500, {"Content-Type": "text/plain"});
					response.write(err + "\n");  
					response.end();  
					return;  
				}  
				response.writeHead(200, {"Content-Type": contentType});  
				response.write(file, "utf-8");  
				response.end();  
			});
		});
	}
}
exports.route = route;
