var api = require("./api"),
	tiles = require("./map"),
	items = require("./items"),
	tasks = require("./tasks"),
	events = require('events'),
	ee = new events.EventEmitter(),
	connections = {
		socket: {},
		addSocket: function (socket, key) {
			if (this.socket[key]) {
				console.log('ERROR: overwriting duplicate socket')
				//TO DO: kill old connection
			}
			this.socket[key] = socket;
		}
	},
	playerIDLookup = {},
//REQUESTS
	getPlayerMap = function getPlayerMap(playerId){
		var i, x, y, tileData, playerData, playerMap = [],
			mapWidth = tiles('global').width,
			mapHeight = tiles('global').height,
			player = items(playerId).data,//items(id)
			z = player.coords.z,
			xStart = player.coords.x - 2,
			xEnd = player.coords.x + 3,
			yStart = player.coords.y - 2,
			yEnd = player.coords.y + 3;
		for (x = xStart; x < xEnd; x += 1) {
			for (y = yStart; y < yEnd; y += 1) {
				tileData = tiles({x:x, y:y, z:z}).data
				playerData = {
					drawData: tileData.drawData,
					bigItemList: [],
					itemList: [],
					playerList: [],
					npcList: []
				}
				for (var i = 0, item; item = tileData.itemList[i]; i += 1) {
					if (items(item).tag('player')){
						playerData.playerList.push(item);
					} else if (items(item).tag('npc')) {
						playerData.npcList.push(item);
					} else if (items(item).tag('bigItem')) {
						playerData.bigItemList.push(item);
					} else if (items(item).tag('smallItem')) {
						playerData.itemList.push(item);
					}	
				}
				playerMap[(x - xStart) * 5 + (y - yStart)] = playerData	//TO DO: reference tile object not data
			}
		}
		return playerMap;
	},
	getCurrentTile = function getCurrentTile(playerData) {
		var item,
			tileObject = {bigItemList:[], itemList:[], playerList:[]},
			currentTile = tiles(playerData.coords).data,
			listLength = currentTile.itemList.length
		for (var i = 0; i < listLength; i += 1) {
			item = items(currentTile.itemList[i]);
			if (!item.tag('hidden')) {
				item.data.actions = item.getActions(playerData.id)
				if (item.tag('player') || item.tag('npc')) {
					tileObject.playerList.push(item.data)
				} else if (item.tag('bigItem')) {
					tileObject.bigItemList.push(item.data)
				} else if (item.tag('smallItem')) {
					tileObject.itemList.push(item.data)
				}
			}
		}
		return(tileObject)
	},
	buySkill = function getSkills(playerId, skillName) {
		var plr = items(playerId);
		if (plr.data.skills[skillName]) {
			console.log('error, skill already purchased');
			return 'skill already purchased'
		} else {
			requirementsMet = true;
			if (tasks.skills[skillName].req) {
				for (var i = 0; i < tasks.skills[skillName].req.length; i += 1) {
					if (!plr.data.skills[tasks.skills[skillName].req[i]]) {
						console.log('requirement not met: ' + tasks.skills[skillName].req[i])
						requirementsMet = false;
					}
				}
			}
			if (requirementsMet) {
				var xpType = tasks.skills[skillName]['xpType'];
				if (plr.data.xp[xpType] >= 100) {
					plr.data.xp[xpType] -= 100;
					plr.data.skills[skillName] = true;
					return 'skill purchased'
				} else {
					console.log('error, not enough xp to purchase skill')
					return 'not enough xp to purchase skill'
				}
			} else {
				console.log('error, requirements for skill not met')
				return 'skill requirements not met'
			}
		}
	},	
	requestActions = function (aData) {
		var actions = false;
		if (!items(aData.player)) {
			console.log("player not found");
			return;
		};
		if (items(aData.id).getActions) {
			actions = items(aData.id).getActions(aData.player);
		} else {
			console.log("ERROR: Item ID: " + aData.id + "not available for use");
		};
		return actions;
	},
	act = function (a) {
		var a, pData, thisTile, target, cost, aData,
			plr = items(a.playerId);
		if(!plr || !plr.tag) {
			console.log('no actor found');
			console.log(plr);
		}		
		if (a.actionType && a.playerId && a.coords && a.itemID) {
			pData = items(a.playerId).data;
			thisTile = tiles(a.coords);
			target = items(a.itemID);
			if (!target || !target.getActionCost) {
				return {message:{text:['Invalid target specified']}}
			}
			cost = target.getActionCost(a.actionType, pData);
			if (pData.ap < cost) {
				return {message:{text:['Not enough AP']}}
			} else {
				pData.ap -= cost;
			}
			aData = {
				actionType: a.actionType,
				itemID: a.itemID,
				playerID: a.playerId,
				playerData: pData,
				coords: a.coords
			}
			console.log('action requested: ' + a.actionType);
			tasks.actions(aData)[a.actionType].trigger();
			if (plr.updateQueue) {
				plr.noButReallyUpdate()
			}
		} else {
			console.log('ERROR: invalid action requested')
			return false;
		}
	},
	login = function login(name){
		var id;
		if (playerIDLookup[name]) {
			id = playerIDLookup[name];
		} else {
			id = playerIDLookup[name] = newPlayer(name);
		}
		return items(id).data;
	},
// UTILS
	newPlayer = function newPlayer(name){
		var id = items('Player');
		items(id).addData({name: name}).on('gameTick', gameTick.trigger)
		tiles(items(id).data.coords).add(id);
		return id;
	},
	killPlayer = function (playerID) {
		var player = items(playerID);
		player.off('all')
		tiles(player.data.coords).remove(playerID)
			.broadcast({message:{text:[playerID, ' is dead.']}, tile: true})
			.broadcast({map:true, radius:2});
		console.log('LOG: ' + player.data.name + ' is dead')
		delete playerIDLookup[player.data.name]
		items('kill', playerID)
		connections.socket[playerID].emit('killPlayer')
		delete connections.socket[playerID]
	},
	killNPC = function (npcID) {
		var npc = items(npcID);
		npc.off('all')
		tiles(npc.data.coords).remove(npcID)
			.broadcast({message:{text:[npcID, ' is dead.']}, tile: true})
			.broadcast({map:true, radius:2});
		if (npc.onDeath) {
			npc.onDeath(tiles(npc.data.coords));
		}
		console.log('LOG: ' + npc.data.name + ' is dead')
		items('kill', npcID)
	},
	movePlayer = function (playerID, direction) {
		var plr = items(playerID);
		if(!plr) {
			console.log('no move actor found');
			return;
		}
		if (playerID && direction && items(playerID)) {
			var pObject = items(playerID),
				player = pObject.data,
				oldCoords = {x: player.coords.x, y: player.coords.y, z: player.coords.z},
				oldTile = tiles(oldCoords),
				newCoords = {x: player.coords.x, y: player.coords.y, z: player.coords.z},
				movedX = false;
				movedY = false;
				movedZ = false;
			if (!player.apMax || player.ap > 1) {
				if (direction.x) {
					if (direction.x > 0 && oldTile.tag('barrierEast')) {
					} else if (direction.x < 0 && oldTile.tag('barrierWest')) {
					} else if (direction.x > 0 && direction.y < 0 && oldTile.tag('barrierNE')) {
						direction.x = 0; direction.y = 0;
					} else if (direction.x < 0 && direction.y < 0 && oldTile.tag('barrierNW')) {
						direction.x = 0; direction.y = 0;
					} else if (direction.x > 0 && direction.y > 0 && oldTile.tag('barrierSE')) {
						direction.x = 0; direction.y = 0;
					} else if (direction.x < 0 && direction.y > 0 && oldTile.tag('barrierSW')) {
						direction.x = 0; direction.y = 0;
					} else {
						newCoords.x += direction.x;
						movedX = true;
						if (newCoords.x < 0) {
							newCoords.x = 0
							movedX = false;
						} else if (newCoords.x >= tiles('global').width) {
							newCoords.x = tiles('global').width - 1;
							movedX = false
						}
					}
				}
				if (direction.y) {
					if (direction.y > 0 && oldTile.tag('barrierSouth')) {
					} else if (direction.y < 0 && oldTile.tag('barrierNorth')) {
					} else {
						newCoords.y += direction.y;
						movedY = true;
						if (newCoords.y < 0) {
							newCoords.y = 0;
							movedY = false;
						} else if (newCoords.y >= tiles('global').height) {
							newCoords.y = tiles('global').height - 1;
							movedY = false;
						}
					}
				}
				if (direction.z) {
					newCoords.z += direction.z;
					movedZ = true;
					if (newCoords.z < 0) {
						newCoords.z = 0;
						movedZ = false;
					} else if (newCoords.z >= tiles('global').depth) {
						newCoords.z = tiles('global').depth - 1;
						movedZ = false;
					}
				}				
			}
			if (movedX || movedY || movedZ) {
				var wayBlocked = false;
				if (tiles(newCoords).tag('outOfBounds')) {
					wayBlocked = true;
				}
				if (tiles(oldCoords).tag('buildingIntSmall') ||  tiles(newCoords).tag('buildingIntSmall')) {
					if(!movedZ) {
						wayBlocked = true;
					}
				}
				if (wayBlocked){
					if (pObject.updateQueue) {
						pObject.addToUpdateQueue({message:{text:['The way is blocked']}});
						pObject.update()
					}
				} else {
					if (player.apMax) {
						player.ap -= 1
					}
					player.coords = {x: newCoords.x, y: newCoords.y, z: newCoords.z}
					tiles(oldCoords).remove(player.id)
						.broadcast({message:{text:[player.id, ' has left the area.']}, tile: true})
						.broadcast({map:true, radius:2})
					tiles(player.coords).add(player.id)
						.broadcast({message:{text:[player.id, ' has entered the area.']}, tile: true, exclude: player.id})
						.broadcast({map:true, radius:2})
					if (pObject.updateQueue) {
						console.log
						pObject.addToUpdateQueue({player: true, tile: true});
						pObject.update()
						pObject.noButReallyUpdate();

					}

				}
			}
		}
	},
// GAMETICK	
	gameTick = (function () {		
		var PeriodicEvent = function (interval, callback, name) {
				pEvent = {};
				pEvent.interval = interval;
				pEvent.callback = callback;
				pEvent.name = name;
				pEvent.count = 0;
				pEvent.increment = function () {
					this.count += 1;
					if (this.count >= this.interval) {
						this.count = 0;
					}
				}
				pEvent.trigger = function (p) {
					if (this.count === 0) {
						this.callback(p);
					}
				}
				return pEvent;
			},
			restoreAP = PeriodicEvent(1, function(p){
				p.ap += 1;
				if (p.ap > p.apMax) {
					p.ap = p.apMax
				}
			}),
			restoreHP = PeriodicEvent(4, function(p){
				if (p.wp > 0) {
					p.hp += 1;
					if (p.hp > p.hpMax) {
						p.hp = p.hpMax
					}
				}
			}, 'hp'),
			reduceFP = PeriodicEvent(8, function(p){
				p.fp -= 1;
				if (p.fp < 0) {
					p.fp = 0
				}
			}),
			reduceWP = PeriodicEvent(4, function(p){
				p.wp -= 1;
				if (p.wp < 0) {
					p.wp = 0
				}
				if (p.wp === 0) {
					p.hp -= 1
					if (p.hp < 0) {
						p.hp = 0
					}
				}
			});
			grueBehavior = PeriodicEvent(4, function(p){
				var xMove = Math.floor(Math.random() * 3) - 1, 
					yMove= Math.floor(Math.random() * 3) - 1;
				if (tiles(p.coords).tag('player')) {
					
					tasks.actions({
						actionType: 'attack',
						itemID: tiles(p.coords).tag('player').data.id,
						playerID: p.id,
						playerData: p,
						coords: p.coords
					})['attack'].trigger();
				} else {
					movePlayer(p.id, {x:xMove, y:yMove, z:0}); 
				}
			});			
		return {
			increment: function () {
				restoreAP.increment();
				restoreHP.increment();
				reduceFP.increment();
				reduceWP.increment();
				grueBehavior.increment();
				ee.emit('gameTick');
				//console.log("ticking: " + new Date().toLocaleTimeString());
			}, 
			trigger: function (playerID) {
				var p = items(playerID).data;
				//console.log('playerID: ' + playerID);
				if (items(playerID).tag) {
					if (items(playerID).tag('player')) {
						if (p.hp > 0) {
							restoreAP.trigger(p);
							restoreHP.trigger(p);
							reduceFP.trigger(p);
							reduceWP.trigger(p);
							if (items(playerID).updateQueue) {
								items(playerID).addToUpdateQueue({player:true});
								items(playerID).update()
							}
							items(playerID).noButReallyUpdate();
						} else {
							killPlayer(playerID)
						}
					} else if (items(playerID).tag('looter')) {
						if (p.hp > 0) {
							grueBehavior.trigger(p);
						} else {
							killNPC(playerID);
						}
					}
				}
			}
		}
	}()),
	gameClock = {
		time: 0,
		stage: 0, // 0: dawn, 1: morning, 2: afternoon, 3: dusk, 4:evening, 5: night
		tick: function () {
			this.time += 1;
			if (this.time >= 20) {
				this.stage += 1;
				if (this.stage >= 6) {
					this.stage = 0;
				}
				this.time = 0;
				gameEvent.emit('time change');
			}
		}
	}
	gameEvent = (function () {
		var eventList = [];
		var Event = function Event(name) {
			this.name = name;
			this.subscriberList = [];
			this.subscribe = function (itemId, callback, arg) {
				var subscriber = {
					id: itemId,
					callback: callback
				}
				this.subscriberList.push(subscriber);
			};
			this.unsubscribe = function (itemId) {
				for (var i = this.subscriberList.length - 1; i >= 0; i -= 1) {
					if (this.subscriberList[i].id === itemId) {
						this.subscriberList.splice(i, 1);
					}
				}
			},
			this.emit = function () {
				for (var i = 0; i < this.subscriberList.length; i +=1) {
					this.subscriberList[i].callback.apply(items(this.subscriberList[i].id));
				}
			}
		}
		return {
			emit: function (eventName) {
				if (eventList[eventName]) {
					eventList[eventName].emit();
				}
			}, 
			subscribe: function (eventName, id, callback, arg) {
				if (!eventList[eventName]) {
					eventList[eventName] = new Event(eventName)
				}
				eventList[eventName].subscribe(id, callback, arg);
			}, 
			unsubscribe: function (eventName, id) {
				if (eventName = 'all') {
					for (var e in eventList) {
						if (eventList.hasOwnProperty(e)) {
							eventList[e].unsubscribe(id);
						}
					}
				} else if (eventList[eventName]){
					return eventList[eventName].unsubscribe(id);
				}
			}	
		}
	}())
	gameTicker = (function () {
		var events = [],
			EventInterval = function (eventName, interval) {
				this.eventName = eventName,
				this.interval = interval,
				this.count = 0,
				this.increment = function () {
					this.count += 1;
					if (this.count >= this.interval) {
						this.count = 0;
						gameEvent.emit(this.eventName);
					}
				}
			};
		return {
			addEvent: function (eventName, interval) {
				events.push(new EventInterval(eventName, interval))
			},
			tick: function () {
				gameClock.tick();
				for (var i = 0; i < events.length; i += 1) {
					events[i].increment()
				}
			},
			init: function () {
				this.addEvent('restore AP', 1);
				this.addEvent('restore HP', 4);
				this.addEvent('reduce FP', 8);
				this.addEvent('reduce WP', 4);
				this.addEvent('grue behavior', 4);
				this.addEvent('update game clock');
				this.addEvent('update player info', 1);
			}
		}
	}())
//START
	start = function () {
		ee.setMaxListeners(0)
		items('init');
		tiles('buildMap', {w:15, h:15, d:4})//.buildMap(15, 15, 4);
		//setInterval(gameTick.increment, 1000);
		//setInterval(gameTick.emit('starvation'));
		
		gameTicker.init();
		setInterval(gameTicker.tick, 1000);
		console.log("LOG: game server started");
	};

exports.ee = ee
exports.connections = connections;
exports.start = start;
exports.getPlayerMap = getPlayerMap;
exports.login = login;
exports.movePlayer = movePlayer;
exports.connections = connections;
exports.getCurrentTile = getCurrentTile;
exports.act = act;
exports.requestActions = requestActions;
exports.movePlayer = movePlayer;
exports.gameTick = gameTick;
exports.getSkillArray = tasks.getSkillArray;
exports.buySkill = buySkill;
exports.gameEvent = gameEvent;
exports.killPlayer = killPlayer;
exports.killNPC = killNPC;
exports.gameClock = gameClock;