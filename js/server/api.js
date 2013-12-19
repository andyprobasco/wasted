var gameServer 		= require("./gameServer");
// this needs tons of data format verification
start = function (socket) {
	var playerData = false;
	console.log("LOG: socket api loaded");
	socket.on("login", function(name){
		playerData = gameServer.login(name);
		gameServer.connections.addSocket(socket, playerData.id);
		socket.emit("update", {player:playerData, inventory:true, map:gameServer.getPlayerMap(playerData.id), tile: gameServer.getCurrentTile(playerData)})
		console.log("LOG: " + name + " logged in");
	})
	socket.on("move", function(direction){
		if (playerData) {
			playerData.xp.explore += 1;
			gameServer.movePlayer(playerData.id, direction);
		}
	})
	socket.on("act", function(actionData){
		var update = {};
		if (actionData && actionData.actionType) {
			actionData.playerId = playerData.id;
			actionData.coords = playerData.coords;
			update = gameServer.act(actionData);
			if (update) {
				console.log('UPDATE BEING USED')
				console.log(update);
				socket.emit("update", update)
			}
		}
	})
	socket.on("requestActions", function(data){
		//console.log('request actions:');
		//console.log(data);
		data.player = playerData.id;
		data.coords = playerData.coords;
		socket.emit("actionsRecieved", gameServer.requestActions(data))
	})
	socket.on("requestSkills", function(data){
		socket.emit("skillsReceived", gameServer.getSkillArray());
	})
	socket.on("buySkill", function(skillName){
		socket.emit("update", {player:playerData, message:{text:gameServer.buySkill(playerData.id, skillName)}});
	})
}

exports.start = start;
