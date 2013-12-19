function game(response) {
	var fs = require('fs');
	fs.readFile(__dirname + "/../../html/wasted.html", function (err, data){
		if (err) { throw err; };
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write(data, 'utf8');
		response.end();
	});
};
function edit(response) {
	var fs = require('fs');
	fs.readFile(__dirname + "/../../html/wastedit.html", function (err, data){
		if (err) { throw err; };
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write(data, 'utf8');
		response.end();
	});
};
exports.game = game;
exports.edit = edit;