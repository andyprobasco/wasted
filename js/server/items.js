var gameServer = require("./gameServer");
	//tiles = require("./map"),
	//tasks = require("./tasks");

var items = (function () {
	var itemList = ['placeholder'],
		tiles = null,//require("./map"),
		tasks = null,//require("./tasks"),
		recycleQueue = [],
		addItem = function (obj) {
			var id, itemObj;
			if (recycleQueue.length > 100) {
				id = recycleQueue[0];
				itemList[recycleQueue.splice(0, 1)] = obj;
			} else {
				id = itemList.length;
				itemList.push(obj);
			}
			obj.data.id = id;
			obj.onBuild();
			obj.onInit();
			return id;
		},
		killItem = function (id) {
			if (items(id).off) {
				items(id).off('all');
			}
			itemList[id] = {};
			recycleQueue.push(id);
		},
		get = function (id) {
			return itemList[id];
		},
		increment = function (number, numberToAdd, params) {
			var value = number += numberToAdd;
			if (params.max) {
				if (value > params.max) {
					value = params.max;
				}
			}
			if (params.min) {
				if (value < params.min) {
					value = params.min
				}
			}
			return value;
		}
		itemGetActions = function (userID, typeOverride) {
			var inventory,
				actionType = 'tile',
				actions = [];
			 
			inventory = items(userID).data.inventory;
			if (inventory) {
				for (var i = 0, item; item = inventory[i]; i++) {
					if (item.id === this.data.id) {
						actionType = 'inventory';
						break;
					}
				}
			}
			if (typeOverride) {
				actionType = typeOverride;
			}
			for (var i = 0, t; t = tags[this.tags[i]]; i++) {
				t.getActions(this.data.id, actions, items(userID).data, actionType)
			}
			return actions;
		},
		itemGetActionCost = function (actionName, playerData) {
			var actionList = this.getActions(playerData.id, 'inventory');
			for (var i = 0, act; act = actionList[i]; i += 1) {
				if (act.name === actionName) {
					return act.cost;
				}
			}
			actionList = this.getActions(playerData.id, 'tile');
			for (var j = 0, tAct; tAct = actionList[j]; j += 1) {
				if (tAct.name === actionName) {
					if (tAct.name === 'attack') {
						var weapon = playerData.weapon
						if (weapon && weapon.id) {
							return items(weapon.id).data.attackCost;
						}
					}
					return tAct.cost;
				}
			}
			return false;
		},
		itemAddData = function (newData) {
			var key;
			for (key in newData) {
				if (newData.hasOwnProperty) {
					this.data[key] = newData[key]
				}
			}
			return this;
		},
		itemAddMethod = function (newMethods) {
			var key;
			for (key in newMethods) {
				if (newMethods.hasOwnProperty) {
					this[key] = newMethods[key]
				}
			}
			return this;
		},
		itemTag = function(tagName) {
			for (var i = 0, tag; tag = this.tags[i]; i++) {
				if (tag === tagName) {
					return true;
				}
			}
			return false;
		},
		itemAddTag = function (tagName) {
			if (tags[tagName]) {
				this.tags.push(tagName);
			} else {
				console.log('ERROR: invalid tag name "' + tagName + '" specified');
			}
			return this;
		},
		itemOnEvent = function (eventName, callback) {
			gameServer.gameEvent.subscribe(eventName, this.data.id, callback);
			return this;
		}
		itemOffEvent = function (eventName) {
			gameServer.gameEvent.unsubscribe(eventName, this.data.id);
			return this;
		}
		itemAddToBuildQueue = function (callback) {
			this.onBuildQueue.push(callback);
			return this;
		}
		itemAddToInitQueue = function (callback) {
			this.onInitQueue.push(callback)
			return this;
		}
		itemOnBuild = function () {
			for (var i = 0; i < this.onBuildQueue.length; i += 1) {
				this.onBuildQueue[i].call(this);
			}
			return this;
		}
		itemOnInit = function () {
			for (var i = 0; i < this.onInitQueue.length; i += 1) {
				this.onInitQueue[i].call(this);
			}
			return this;
		}		
		Item = function Item(itemType, data) {
			if (data) {
				this.data = data;
			} else {
				this.data = {
					name: itemType,
					itemType: itemType,
					weight: 1
				};
			}
			this.getActions = itemGetActions;
			this.getActionCost = itemGetActionCost;
			this.addData = itemAddData;
			this.addMethod = itemAddMethod;
			this.tag = itemTag;
			this.tags = [];
			this.addTag = itemAddTag;
			this.on = itemOnEvent;
			this.off = itemOffEvent;
			this.onBuildQueue = [];
			this.onInitQueue = [];
			this.addToBuildQueue = itemAddToBuildQueue;
			this.addToInitQueue = itemAddToInitQueue;
			this.onBuild = itemOnBuild;
			this.onInit = itemOnInit;
		},
		build = {
			'Player': function (name) { return new Item('Player', name)
				.addTag('player')
				.addData({
					coords: {x:1, y:1, z:1}, 
					ap: 40, apMax: 40,
					hp: 40, hpMax: 40,
					fp: 40, fpMax: 40,
					wp: 40, wpMax: 40,
					currentWeight: 0, maxWeight: 60,
					xp: {'fight': 0, 'explore': 0, 'build': 0},
					modifier: {
						toHit: 0,
						dodge: 0,
					},
					damage: 1, inventory: [],
					weapon: {name: null, id: null},
					tool: {name: null, id: null},
					skills: {}
				})
				.addMethod({
					// utils
					hasItem: function(itemID) {
						var hasIt = false;
						for(var i = 0, item; item = this.data.inventory[i]; i++) {
							hasIt = true;
						}
						return hasIt;
					},
					// item utils
					equipTool: function (itemID) {
						this.data.tool = {name: items(itemID).data.name, id: itemID}
						return this;
					},
					readyWeapon: function (itemID) {
						this.data.weapon = {name: items(itemID).data.name, id: itemID}
						return this;
					},
					unequipTool: function () {
						this.data.tool = {name: null, id: null}
						return this;
					},
					unreadyWeapon: function () {
						this.data.weapon = {name: null, id: null}
						return this;
					},
					pickupItem: function (itemID) {
						if (typeof itemID === 'string'){
							itemID = items(itemID);
						}
						if (this.data.currentWeight < this.data.maxWeight) {
							this.data.inventory.push({name: items(itemID).data.name, id: itemID});
							this.data.currentWeight += items(itemID).data.weight;
							tiles(this.data.coords).broadcast({player:true, inventory: true, tile: true})
							return true;
						} else {
							tiles(this.data.coords).add(itemID).broadcast({player:true, inventory: true, tile: true})
							return false;
						}				
					},
					unbindItem: function (itemID) {
						var inv = this.data.inventory,
							pData = this.data;
						for (var i = 0, item; item = inv[i]; i += 1) {
							if (item.id === itemID) {
								if (pData.weapon.id === itemID) {
									this.unreadyWeapon();
								}
								if (pData.tool.id === itemID) {
									this.unequipTool();
								}
								pData.currentWeight -= items(itemID).data.weight;
								inv.splice(i, 1);
								this.addToUpdateQueue({inventory:true})
								return true;
							}
						}
						return false;
					},
					// messaging
					updateQueue: {
						map: false,
						player: false,
						inventory: false,
						tile: false,
						messages: []						
					},
					clearUpdateQueue: function () {
						this.updateQueue = {
							map: false,
							player: false,
							inventory: false,
							tile: false,
							messages: []						
						}
					},
					addToUpdateQueue: function (data) {
						if (data.map) {
							this.updateQueue.map = true;
						}
						if (data.player) {
							this.updateQueue.player = true;
						}
						if (data.inventory) {
							this.updateQueue.inventory = true;
						}
						if (data.tile) {
							this.updateQueue.tile = true;
						}
						if (data.message) {
							this.updateQueue.messages.push(data.message)
						}
						if (data.time) {
							this.updateQueue.time = true;
						}
					},
					update: function () {
						/*var updateData = {},
							pID = this.data.id;
						if (this.updateQueue.map) {
							updateData.map = gameServer.getPlayerMap(pID);
						}
						if (this.updateQueue.player) {
							updateData.player = this.data;
						}
						if (this.updateQueue.inventory) {
							updateData.inventory = true;
						}
						if (this.updateQueue.tile) {
							updateData.tile = gameServer.getCurrentTile(this.data);
						}
						updateData.messages = this.updateQueue.messages;
						this.clearUpdateQueue();
						gameServer.connections.socket[this.data.id].emit('update', updateData);*/
					},
					noButReallyUpdate: function () {
						var updateData = {},
							pID = this.data.id;
						if (this.updateQueue.map) {
							updateData.map = gameServer.getPlayerMap(pID);
						}
						if (this.updateQueue.player) {
							updateData.player = this.data;
						}
						if (this.updateQueue.inventory) {
							updateData.inventory = true;
						}
						if (this.updateQueue.tile) {
							updateData.tile = gameServer.getCurrentTile(this.data);
						}
						if (this.updateQueue.time) {
							updateData.time = {stage: gameServer.gameClock.stage, time: gameServer.gameClock.time}
						}
						updateData.messages = this.updateQueue.messages;
						this.clearUpdateQueue();
						gameServer.connections.socket[this.data.id].emit('update', updateData);
					}		
				})
				.addToBuildQueue( function () {
					this.on('restore AP', function () {
						this.data.ap = increment(this.data.ap, 1, {max: this.data.apMax})
					})
					this.on('restore HP', function () {
						if (this.data.hp > 0 && this.data.fp > 0 && this.data.wp > 0) {
							this.data.hp = increment(this.data.hp, 1, {max: this.data.hpMax})
						} else if (this.data.hp > 0) {
							this.data.hp = increment(this.data.hp, -1, {min: 0})
						}
					})
					this.on('reduce WP', function () {
						this.data.wp = increment(this.data.wp, -1, {min: 0});
					})
					this.on('reduce FP', function () {
						this.data.fp = increment(this.data.fp, -1, {min: 0});
					})
					this.on('update player info', function () {
						if (this.data.hp <= 0) {
							gameServer.killPlayer(this.data.id);
						} else {
							this.addToUpdateQueue({player:true, time: true})
							this.noButReallyUpdate();
						}
					})			
				})	
			;},
			//{NPCS
			'Looter': function () {return new Item('Looter')
				.addTag('looter').addTag('npc')
				.addData({
					hp: 20, hpMax: 20,
					damage: 4,
					modifier: {
						toHit: 0,
						dodge: 0,
					}
				})
				.addMethod({
					onDeath: function(tile) {
						tile.data.itemList.push(items('Looter Corpse'))
						tile.broadcast({tile: true})
					}
				})
				.addToBuildQueue( function () {
					this.on('grue behavior', function () {
						var xMove = Math.floor(Math.random() * 3) - 1, 
							yMove= Math.floor(Math.random() * 3) - 1;
						if (this.data.hp > 0) {
							if (tiles(this.data.coords).tag('player')) {
								tasks.actions({
									actionType: 'attack',
									itemID: tiles(this.data.coords).tag('player').data.id,
									playerID: this.data.id,
									playerData: this.data,
									coords: this.data.coords
								})['attack'].trigger();
							} else {
								gameServer.movePlayer(this.data.id, {x:xMove, y:yMove, z:0}); 
							}
						} else {
							gameServer.killNPC(this.data.id);
						}
					})
				})
			},
			'Looter King': function () {return build['Looter']()
				.addData({
					name: 'Looter King',
					itemType: 'Looter King',
					hp: 40, hpMax: 40,
					damage: 8,
					modifier: {
						toHit: 2,
						dodge: 2,
					},
				})
			},
			//}
			//{TERRAIN
			'OutOfBounds': function () {return new Item('OutOfBounds')
				.addTag('bigItem').addTag('hidden').addTag('outOfBounds')},
			'BarrierNorth': function () {return new Item('BarrierNorth')
				.addTag('bigItem').addTag('hidden').addTag('barrierNorth')},
			'BarrierSouth': function () {return new Item('BarrierSouth')
				.addTag('bigItem').addTag('hidden').addTag('barrierSouth')},
			'BarrierEast': function () {return new Item('BarrierEast')
				.addTag('bigItem').addTag('hidden').addTag('barrierEast')},
			'BarrierWest': function () {return new Item('BarrierWest')
				.addTag('bigItem').addTag('hidden').addTag('barrierWest')},				
			'BarrierNE': function () {return new Item('BarrierNE')
				.addTag('bigItem').addTag('hidden').addTag('barrierNE')},				
			'BarrierNW': function () {return new Item('BarrierNW')
				.addTag('bigItem').addTag('hidden').addTag('barrierNW')},				
			'BarrierSE': function () {return new Item('BarrierSE')
				.addTag('bigItem').addTag('hidden').addTag('barrierSE')},				
			'BarrierSW': function () {return new Item('BarrierSW')
				.addTag('bigItem').addTag('hidden').addTag('barrierSW')},				
			'Field': function () {return new Item('Field')
				.addTag('bigItem').addTag('field').addTag('searchable')
				.addData({
					searchDifficulty: 0,
					searchData: [
						'Twinkie',
						'Axe',
						'Water Bottle',
						'Water Bottle',
					]
				})
			},
			'Grass': function () {return new Item('Grass')
				.addTag('bigItem').addTag('grass').addTag('searchable')
				.addData({
					searchDifficulty: 0,
					searchData: [
						'Water Bottle'
					]
				})
			},
			'Dirt': function () {return new Item('Dirt')
				.addTag('bigItem').addTag('dirt');
			},	
			'Rubble': function () {return new Item('Rubble')
				.addTag('bigItem').addTag('rubble');
			},
			'Road': function () {return new Item('Road')
				.addTag('bigItem').addTag('road');},
			'Road underConstruction': function () {return new Item('Road underConstruction')
				.addTag('bigItem').addTag('roadUnderConstruction');},				
			//}
			//{BUILDINGS
			'Building': function () {return new Item('Building')
				.addTag('bigItem').addTag('building')
				.addData({name: 'a building', prefix: 'You are outside '});},
			'BuildingInt': function () {return new Item('BuildingInt')
				.addTag('bigItem').addTag('building').addTag('searchable')
				.addData({name: 'a building', prefix: 'You are inside '});},
			'BuildingSmall': function () { return new Item('BuildingSmall')
				.addTag('bigItem').addTag('buildingSmall')
				.addData({name:'a building', prefix: 'You are outside '});},
			'BuildingIntSmall': function () { return new Item('BuildingIntSmall')
				.addTag('bigItem').addTag('buildingSmall').addTag('buildingIntSmall')
				.addData({name:'Building', prefix: 'You are inside '});},
			'Italian Resteraunt': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Italian Resteraunt', itemType: 'Italian Resteraunt',
					searchDifficulty: 0,
					searchData: [
						'Bottle of Wine',
						'Can of Tomatoes',
						'Kitchen Knife',
						'Olive Oil'			
					]
				});
			},
			'Bowling Alley': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Bowling Alley', itemType: 'Bowling Alley',
					searchDifficulty: 0,
					searchData: [
						'Bowling Ball',
						'Beer',
						'Snack Food'
					]
				});
			},
			'Office Building': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Office Building', itemType: 'Office Building',
					searchDifficulty: 1,
					searchData: [
						'Snack Food'
					]
				});
			},
			'Movie Theatre': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Movie Theatre', itemType: 'Movie Theatre',
					searchDifficulty: -1,
					searchData: [
						'Snack Food'
					]
				});					
			},
			'Bar': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Bar', itemType: 'Bar',
					searchDifficulty: 0,
					searchData: [
						'Snack Food'
					]
				});					
			},
			'Warehouse': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Warehouse', itemType: 'Warehouse',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},
			'Pharmacy': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Pharmacy', itemType: 'Pharmacy',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},
			'Funeral Home': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Funeral Home', itemType: 'Funeral Home',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},
			'Grocery Store': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Grocery Store', itemType: 'Grocery Store',
					searchDifficulty: 0,
					searchData: [
						'Snack Food'
					]
				});					
			},
			'Police Station': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Police Station', itemType: 'Police Station',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},
			'Fire Station': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Fire Station', itemType: 'Fire Station',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},
			'Hospital': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Hospital', itemType: 'Hospital',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},
			'Hardware Store': function () {return build['BuildingIntSmall']()
				.addTag('searchable')
				.addData({
					name: 'Hardware Store', itemType: 'Hardware Store',
					searchDifficulty: 0,
					searchData: [
						'Junk'
					]
				});					
			},			
			//}
			//{BIG ITEMS
			'Tree': function () {return new Item('Tree')
				.addTag('bigItem').addTag('tree')},
			'Lake': function () {return new Item('Lake')
				.addTag('bigItem').addTag('lake')
				//
				.addTag('searchable')
				.addData({
					searchDifficulty: -18,
					searchData: [
						'Stones',
						'Shovel'
					]
				});
				//
			},
			'StairsUp': function () {return new Item('StairsUp')
				.addTag('bigItem').addTag('stairsUp')
				.addData({name: 'Stairs', prefix: 'You see '});},
			'StairsDown': function () {return new Item('StairsDown')
				.addTag('bigItem').addTag('stairsDown')
				.addData({name: 'Stairs', prefix: 'You see '});},
			'StairsUpDown': function () {return new Item('StairsUpDown')
				.addTag('bigItem').addTag('stairsUpDown')
				.addData({name: 'Stairs', prefix: 'You see '});},
			'DoorIn': function () {return new Item('DoorIn')
				.addTag('bigItem').addTag('doorIn').addData({name: 'Door'});},
			'DoorOut': function () {return new Item('DoorOut')
				.addTag('bigItem').addTag('doorOut').addData({name: 'Door'});},
			'Film Projector': function () {return new Item('Film Projector')
				.addTag('bigItem')},
			//}
			//{SMALL ITEMS
			'OmniTool': function () {return new Item('OmniTool')
				.addTag('smallItem').addTag('omniTool');},
			'Shovel': function () {return new Item('Shovel')
				.addTag('smallItem').addTag('weapon')//.addTag('shovel')
				.addData({weight: 10, attackCost: 5, attackDamage: 3, toHitBonus: 1});},
			'Axe': function () {return new Item('Axe')
				.addTag('smallItem').addTag('weapon')//.addTag('axe')
				.addData({weight: 10, attackCost: 4, attackDamage: 5, toHitBonus: 1});},
			'Kitchen Knife': function () {return new Item('Kitchen Knife')
				.addTag('smallItem').addTag('weapon')
				.addData({weight: 3, attackCost: 2, attackDamage: 3, toHitBonus: 0});},
			'Shovel': function () {return new Item('Shovel')
				.addTag('smallItem').addTag('weapon').addTag('plow').addTag('shovel')
				.addData({weight: 3, attackCost: 3, attackDamage: 3, toHitBonus: -1});},				
			'Water Bottle': function () {return new Item('Water Bottle')
				.addTag('smallItem').addTag('water')},
			'Bottle of Wine': function () {return new Item('Bottle of Wine')
				.addTag('smallItem').addTag('water')
				.addData({weight: 3});},
			'Beer': function () {return new Item('Beer')
				.addTag('smallItem').addTag('water')
				.addData({weight: 3});},				

			'Twinkie': function () {return new Item('Twinkie')
				.addTag('smallItem').addTag('food');},
			'Snack Food': function () {return new Item('Snack Food')
				.addTag('smallItem').addTag('food');},				
			'Can of Tomatoes': function () {return new Item('Can of Tomatoes')
				.addTag('smallItem').addTag('food')
				.addData({weight:2});},
			'Looter Corpse': function () {return new Item('Looter Corpse')
				.addTag('smallItem').addTag('food')
				.addData({weight:40});},
			
			'Stones': function () {return new Item('Stones')
				.addTag('smallItem').addTag('stone')
				.addData({weight:10});},
			'Wood': function () {return new Item('Wood')
				.addTag('smallItem').addTag('wood')
				.addData({weight:10});},
			'Sapling': function () {return new Item('Sapling')
				.addTag('smallItem').addTag('sapling')
				.addData({weight:5})
				/*.addToBuildQueue( function () {
					this.on('newDay', function () {
						var thisTile = tiles(this.data.coords);
						thisTile.remove(this.data.id).add('Tree');
						items('kill', this.data.id);
					})
				})*/
			;},
			'Olive Oil': function () {return new Item('Olive Oil')
				.addTag('smallItem')
				.addData({weight:5});},//.addTag('fuel')
			'Bowling Ball': function () {return new Item('Bowling Ball')
				.addTag('smallItem')
				.addData({weight:16});},
			'Junk': function () {return new Item('Junk')
				.addTag('smallItem')
				.addData({weight:1});}					

				//}
		};	
	return function (id, args) {
		if (!id) {
			return false;
		}
		if (typeof id === 'string') {
			if (id === 'init') {
				tiles = require("./map");
				tasks = require("./tasks");
			} else if (id === 'kill') {	//TO DO: integrate this into itemWrapper
				killItem(args);
			} else {
				if (build[id]) {
					var newItem = build[id](args),		//
						newItemID = addItem(newItem);
						newItem.addData({id: newItemID});
					return newItemID;
				} else {
					console.log("ERROR: '" + id + "' is invalid item type");
					return false;
				}
			}
		}
		if (typeof id === 'number') {
			return get(id);
		}
	};
}());
var Tag = function (name) {
	var newTag = {
		name: name,
		inventoryActions: [],
		tileActions: [],
		data: {},
		itemData: null,
		getActions: function(id, actions, pData, type){
			var actionList,
				cost;
			if (type && type === 'tile') {
				actionList = this.tileActions;
			} else {
				actionList = this.inventoryActions;
			}
			for (var i = 0, action; action = actionList[i]; i++){
				if (action.name === 'attack') {
					var weapon = items(pData.id).data.weapon;
					if (weapon && weapon.id) {
						cost = items(weapon.id).data.attackCost;	
					} else {
						cost = action.cost;
					}
				} else {
					cost = action.cost;
				}
				if (!action.conditionals)  {
					actions.push({id: id, name:action.name, cost:cost});
				} else {
					if (pData.tool.id) {
						var tool = items(pData.tool.id)
						if (tool.tag(action.conditionals)) {
							actions.push({id: id, name:action.name, cost:cost});
						}
					}
				}
				//TO DO: add action conditionals
			}
			return actions
		},
		addAction: function(actionName, cost, type, conditionals){
			var actionList;
			if (type && type === 'tile') {
				actionList = this.tileActions;
			} else {
				actionList = this.inventoryActions;
			}
			if (!conditionals) {
				actionList.push({name:actionName, cost:cost});
			} else {
				actionList.push({name:actionName, cost:cost, conditionals:conditionals});
			}
			return this;
		},
		addTileAction: function(actionName, cost, conditionals) {
			return this.addAction(actionName, cost, 'tile', conditionals);
		},
		addInventoryAction: function(actionName, cost, conditionals) {
			return this.addAction(actionName, cost, 'inventory', conditionals);
		},
		tagData: function(newData){
			var key;
			for (key in newData) {
				if (newData.hasOwnProperty(key)) {
					this.data[key] = newData[key]
				}
			}
			return this;
		},
		itemData: function(newData){
			var key;
			if (!this.itemData) {
				this.itemData = {};
			}
			for (key in newData) {
				if (newData.hasOwnProperty(key)) {
					this.data[key] = newData[key]
				}
			}
			return this;
		}
	}
	return newTag;
}
var tags = {
	'outOfBounds': Tag('outOfBounds'),
	'barrierNorth': Tag('barrierNorth'),
	'barrierSouth': Tag('barrierSouth'),
	'barrierEast': Tag('barrierEast'),
	'barrierWest': Tag('barrierWest'),
	'barrierNE': Tag('barrierNE'),
	'barrierNW': Tag('barrierNW'),
	'barrierSE': Tag('barrierSE'),
	'barrierSW': Tag('barrierSW'),
	'hidden': Tag('hidden'),
	'player': Tag('player').addTileAction('attack', 1),
	'npc': Tag('npc').addTileAction('attack', 1),
	'looter': Tag('looter'),
	'bigItem': Tag('bigItem'),
	'smallItem': Tag('smallItem') //{
		.addTileAction('pick up', 0)
		.addInventoryAction('drop', 0)
		.addInventoryAction('equip tool', 0), //}
	'searchable': Tag('searchable')//{
		.addTileAction('search', 10),//}
	'weapon': Tag('weapon')//{
		.addInventoryAction('ready weapon', 0),//}
	'shovel': Tag('shovel'),
	'axe': Tag('axe'),
	'tree': Tag('tree')
		.addTileAction('chop wood', 10, 'shovel')
		.addTileAction('chop wood', 10, 'axe'),
	'plow': Tag('plow'),
	'sapling': Tag('sapling'),
	'stone': Tag('stone'),
	'scrapMetal': Tag('scrapMetal'),
	'wood': Tag('wood'),
	'road': Tag('road')
		.addTileAction('break road', 10, 'shovel'),
	'roadUnderConstruction': Tag('roadUnderConstruction')
		.addTileAction('build road', 10, 'stone'),
	'rubble': Tag('rubble')
		.addTileAction('clear rubble', 5, 'shovel'),
	'dirt': Tag('dirt')
		.addTileAction('plow field', 5, 'plow')
		.addTileAction('build road', 10, 'stone'),
	'building': Tag('building'),
	'buildingSmall': Tag('buildingSmall'),
	'buildingIntSmall': Tag('buildingIntSmall'),
	'grass': Tag('grass'),
	'lake': Tag('lake')//{
		.addTileAction('drink from', 5),//}
	'field': Tag('field')
		.addTileAction('clear field', 10, 'plow')
		.addTileAction('plant sapling', 10, 'sapling'),
	'doorIn': Tag('doorIn')//{
		.addTileAction('enter building', 1),//}
	'doorOut': Tag('doorOut')//{
		.addTileAction('exit building', 1),//}
	'stairsUp': Tag('stairsUp')//{
		.addTileAction('go up', 1),//}
	'stairsUpDown': Tag('stairsUpDown')//{
		.addTileAction('go up', 1)
		.addTileAction('go down', 1),//}
	'stairsDown': Tag('stairsDown')//{
		.addTileAction('go down', 1),//}
	'food': Tag('food')//{
		.addInventoryAction('eat', 5),//}
	'water': Tag('water')//{
		.addInventoryAction('drink', 5),//}
	'omniTool': Tag('omniTool')//{
		.addInventoryAction('build a road', 0)
		.addInventoryAction('build a field', 0)
		.addInventoryAction('build a lake', 0)
		.addInventoryAction('build a building', 0)
		.addInventoryAction('build a tree', 0)
		.addInventoryAction('suicide', 0),//}
	
};
module.exports = items