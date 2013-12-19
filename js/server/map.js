var items = require("./items"),
	gameServer = require("./gameServer"),
	tiles = (function () {
		var width, height, depth,
			groundFloor = 1,
			map = [],
			getTile = function (coords) {
				if (coords.x < 0 || coords.x >= width || coords.y < 0 || coords.y >= height || coords.z < 0 || coords.z >= depth) {
					return new Tile();
				} else {
					return map[coords.x * height * depth + coords.y * depth + coords.z]
				}
			},
			setTile = function (coords, tile) {
				map[coords.x * height * depth + coords.y * depth + coords.z] = tile;
			}
			tileGetCSS = function () {
				console.log('getCSS');
			},
			updateSurroundingCss = function (coords) {
				getCSS({x:coords.x - 1, y:coords.y - 1, z:coords.z});
				getCSS({x:coords.x,		y:coords.y - 1, z:coords.z});
				getCSS({x:coords.x + 1, y:coords.y - 1, z:coords.z});
				getCSS({x:coords.x - 1, y:coords.y,		z:coords.z});
				getCSS({x:coords.x,		y:coords.y,		z:coords.z});
				getCSS({x:coords.x + 1, y:coords.y,		z:coords.z});
				getCSS({x:coords.x - 1, y:coords.y + 1, z:coords.z});
				getCSS({x:coords.x,		y:coords.y + 1, z:coords.z});
				getCSS({x:coords.x + 1, y:coords.y + 1, z:coords.z});
				return this;
			},
			tileAddDrawData = function (dData) {
				this.data.drawData.push(dData);
				return this;
			},
			tileClearDrawData = function () {
				this.data.drawData = [];
				return this;
			},
			tileAdd = function (id, itemName) {
				var itemPresent = false,
					tileCoords = this.data.coords;
				if (typeof id === 'string') {
					id = items(id)
					if (itemName && itemName !== 'noName') {
						items(id).addData({name: itemName})
					}
				}
				for (var i = 0, oldItem; oldItem = this.data.itemList[i]; i += 1) {
					if (oldItem === id) {
						itemPresent = true;
						console.log('ERROR: tried to add item ' + id + ' to item list twice');
					}
				}
				if (!itemPresent) {
					items(id).addData({coords:tileCoords})
					this.data.itemList.push(id);
				}
				return this;
			},
			tileHasTag = function (tagName) {
				for (var i = 0, item; item = items(this.data.itemList[i]); i++) {
					if (item.tag(tagName)) {
						return item;
					}
				}
				return false;
			},
			tileRemove = function (id) {
				var item = items(id);
				for (var i = 0, oldItem; oldItem = this.data.itemList[i]; i++) {
					if (oldItem === id) {
						this.data.itemList.splice(i, 1);
						return this;						
					}
				}
				console.log('ERROR: tried to remove item '+ id +', but item not found');
				return this;
			},
			tileBroadcast = function (data) {
				var msg, player, update = {};
				for (var i = 0, playerID; playerID = this.data.itemList[i]; i++) {
					player = items(playerID);
					if (player.tag('player')) {
						if (data.exclude && data.exclude === playerID) {
							return this;
						}						
						if (data.message) {
							msg = '';
							for (var j = 0, segment; segment = data.message.text[j]; j++) {
								if (typeof segment === 'number') {
									if (segment === playerID) {
										if (msg === '') {
											msg = "You"
										} else {
											msg += "you"
										}
									} else {
										msg += items(segment).data.name
									}
								} else {
									msg += segment
								}
							}
							update.message = {text: msg}
						}
						if (data.player) {
							update.player = player.data;
						}
						if (data.inventory) {
							update.inventory = true;
						}
						if (data.map) {
							update.map = gameServer.getPlayerMap(playerID);
						}
						if (data.tile) {
							update.tile = gameServer.getCurrentTile(player.data);
						}

						if (player.updateQueue) {
							player.addToUpdateQueue(update);
							player.update()
						}
					}
				}
				if (data.radius) {
					var rad = data.radius,
						xMax = this.data.coords.x + rad,
						yMax = this.data.coords.y + rad;
						data.radius = 0;
					for (var x = this.data.coords.x - rad; x <= xMax; x += 1) {
						for (var y = this.data.coords.y - rad; y <= yMax; y += 1) {
							tiles({x:x, y:y, z:this.data.coords.z}).broadcast(data);
						}
					} 
				}
				return this;
			},
			Tile = function (coords, data) {
				if (data) {
					this.data = data;
				} else {
					this.data = {
						drawData: [],
						itemList: [],
						coords: coords
					};
				}
				this.getCSS = tileGetCSS;
				this.updateSurroundingCss = updateSurroundingCss;
				this.addDrawData = tileAddDrawData;
				this.clearDrawData = tileClearDrawData;
				this.add = tileAdd;
				this.tag = tileHasTag;
				this.remove = tileRemove;
				this.broadcast = tileBroadcast;
			};
		return function (arg1, arg2) {
			var requestType, coords, callback, x, y, z;
			if (typeof arg1 === 'string') {
				requestType = arg1;
				if (requestType === 'global') {
					return {width: width, height: height, depth: depth, groundFloor: groundFloor}
				}
				if (requestType === 'eachTile') {
					callback = arg2;
					for (x = 0; x < width; x += 1) {
						for (y = 0; y < height; y += 1) {
							for (z = 0; z < depth; z += 1) {
								callback({x:x, y:y, z:z});
							}
						}
					}			
				}
				if (requestType === 'buildMap') {
					var mongo = require('mongodb'),
						Server = mongo.Server,
						Db = mongo.Db,
						server = new Server('localhost', 27017, {auto_reconnect: true}),
						db = new Db('testDb', server),
						openDb,
						mapName = 'beaconHill';
					/*db.open(function(err, db){
						db.collection('mapProto', function (err, collection) {
							collection.findOne({'name': mapName}, function(err, item){
								if (err) {console.log(err)} else if (item) {
									tiles('buildMapFromProto', item)
									console.log('map built successfully')
								} else {
									console.log('Invalid Map Name Specified')
								}
							})
						})					
					})*/
					var superbuild = function () {
						var mapCount = 0,
							mapNW = 'generalHospital', mapNE = 'theGarden', 
							mapSW = 'beaconHill', mapSE = 'govtCenterWest',
							makeMap = function () {
								var chunkWidth = 16,
									chunkHeight = 16;
								width = 32;
								height = 32;
								depth = 4;
								groundFloor = 1;
								tiles('eachTile', function (coords) {
									var protoItemList;
									if (coords.x < chunkWidth) {
										if (coords.y < chunkHeight) {
											protoItemList = mapNW.contents[coords.x * chunkHeight * depth + coords.y * depth + coords.z]
										} else {
											protoItemList = mapSW.contents[coords.x * chunkHeight * depth + (coords.y - chunkHeight) * depth + coords.z]
										}
									} else {
										if (coords.y < chunkHeight) {
											protoItemList = mapNE.contents[(coords.x - chunkWidth) * chunkHeight * depth + coords.y * depth + coords.z]
										} else {
											protoItemList = mapSE.contents[(coords.x - chunkWidth) * chunkHeight * depth + (coords.y - chunkHeight) * depth + coords.z]
										}
									}
									setTile(coords, new Tile(coords));
									for (var i = 0; i < protoItemList.length; i += 1) {
										tiles(coords).add(protoItemList[i].type)
										if (protoItemList[i].name !== protoItemList[i].type) {
											items(tiles(coords).data.itemList[i]).addData({name: protoItemList[i].name})
										}
									}
									
								})
								tiles('eachTile', function (coords) {
									tiles(coords).updateSurroundingCss(coords);
								})
							};
						db.open(function(err, db){
							var getMap = function (mapName) {
									db.collection('mapProto', function (err, collection) {
										collection.findOne({'name': mapName}, function(err, item){
											if (err) {console.log(err)} else if (item) {
												if (mapName === 'generalHospital') {
													mapNW = item;
												} else if (mapName === 'beaconHill') {
													mapSW = item;
												} else if (mapName === 'theGarden') {
													mapNE = item;
												} else if (mapName === 'govtCenterWest') {
													mapSE = item;
												}
												mapCount += 1;
												if (mapCount === 4) {
													makeMap();
												}
												console.log('map built successfully')
											} else {
												console.log(err);
												console.log(item);
												console.log('Invalid Map Name Specified: ' + mapName)
											}
										})
									})					
								};
							getMap('generalHospital');
							getMap('beaconHill');
							getMap('theGarden');
							getMap('govtCenterWest');
						})
					
					}
					/*width = 32;
					height = 32;
					depth = 4;
					groundFloor = 1;*/
					superbuild()
					/*var x, y, z;
					width = arg2.w;
					height = arg2.h;
					depth = arg2.d;
					tiles('eachTile', function (coords) {
						setTile(coords, new Tile(coords));
						applyMap(tiles(coords));
					})
					tiles('eachTile', function (coords) {
						getCSS(coords)
					})*/
				}
				if (requestType === 'buildBlankMap') {
					var x, y, z;
					width = arg2.w;
					height = arg2.h;
					depth = arg2.d;
					tiles('eachTile', function (coords) {
						setTile(coords, new Tile(coords));
						if (coords.z === 1) {
							tiles(coords).add('Field');
						} else {
							tiles(coords).add('OutOfBounds');
						}
					})
					tiles('eachTile', function (coords) {
						getCSS(coords)
					})

				}
				if (requestType === 'getProtoTile') {
					var targetList = tiles(arg2).data.itemList;
					var protoTile = {itemList: []}
					for (var i = 0; i < targetList.length; i+=1) {
						protoTile.itemList.push({type: items(targetList[i]).data.itemType, name: items(targetList[i]).data.name})
					}
					return protoTile
				}
				if (requestType === 'getProtoMap') {
					var protoMap = {
						mapData: tiles('global'),
						contents: []
					}
					tiles('eachTile', function (coords) {
						var itemBucket;
						var oldTile = tiles(coords);
						var itemList = oldTile.data.itemList
						protoMap.contents[coords.x * height * depth + coords.y * depth + coords.z] = []
						for (var i = 0; i < itemList.length; i += 1) {
							protoMap.contents[coords.x * height * depth + coords.y * depth + coords.z].push({type: items(itemList[i]).data.itemType, name: items(itemList[i]).data.name})
						}
					})
					return protoMap
				}
				if (requestType === 'buildMapFromProto') {
					//var x, y, z;
					width = arg2.mapData.width;
					height = arg2.mapData.height;
					depth = arg2.mapData.depth;
					groundFloor = 1;
					map = [];
					tiles('eachTile', function (coords) {
						var protoItemList = arg2.contents[coords.x * height * depth + coords.y * depth + coords.z]
						setTile(coords, new Tile(coords));
						for (var i = 0; i < protoItemList.length; i += 1) {
							tiles(coords).add(protoItemList[i].type)
							if (protoItemList[i].name !== protoItemList[i].type) {
								items(tiles(coords).data.itemList[i]).addData({name: protoItemList[i].name})
							}
						}
					})
					tiles('eachTile', function (coords) {
						var protoItemList = arg2.contents[coords.x * height * depth + coords.y * depth + coords.z]
						tiles(coords).updateSurroundingCss(coords);
					})					
				}
				if (requestType === 'exportMap') {
					var i, x, y, tileData, exportData, exportMap = [],
						mapWidth = tiles('global').width,
						mapHeight = tiles('global').height,
						z = arg2.z,
						xStart = arg2.xStart,
						xEnd = arg2.xEnd,
						yStart = arg2.yStart,
						yEnd = arg2.yEnd;
					for (x = xStart; x < xEnd; x += 1) {
						for (y = yStart; y < yEnd; y += 1) {
							tileData = tiles({x:x, y:y, z:z}).data
							exportData = {
								drawData: tileData.drawData,
								bigItemList: [],
								itemList: [],
								playerList: [],
								npcList: []
							}
							for (var i = 0, item; item = tileData.itemList[i]; i += 1) {
								if (items(item).tag('player')){
									exportData.playerList.push(item);
								} else if (items(item).tag('npc')) {
									exportData.npcList.push(item);
								} else if (items(item).tag('bigItem')) {
									exportData.bigItemList.push(item);
								} else if (items(item).tag('smallItem')) {
									exportData.itemList.push(item);
								}	
							}
							exportMap[(x - xStart) * (xEnd - xStart) + (y - yStart)] = exportData	//TO DO: reference tile object not data
						}
					}
					return exportMap;
				}
			} else {
				coords = arg1;
				return getTile(coords);
			}
		}
	}()),
	getCSS = function (coords) {
		t = tiles(coords).clearDrawData().addDrawData('ground');
		var checkAdjacent = function (tag, curves) {
			if (tiles({x: coords.x - 1, y: coords.y, z: coords.z}).tag(tag)) {
				t.addDrawData('w')
				if (tiles({x: coords.x - 1, y: coords.y - 1, z: coords.z}).tag(tag) && tiles({x: coords.x, y: coords.y - 1, z: coords.z}).tag(tag)) {
					t.addDrawData('nw')
				} 
				if (tiles({x: coords.x - 1, y: coords.y + 1, z: coords.z}).tag(tag) && tiles({x: coords.x, y: coords.y + 1, z: coords.z}).tag(tag)) {
					t.addDrawData('sw')
				}
			} else if (curves) {
				if (!tiles({x: coords.x, y: coords.y + 1, z: coords.z}).tag(tag)) { // south
					t.addDrawData('curve_sw');
				}
				if (!tiles({x: coords.x, y: coords.y - 1, z: coords.z}).tag(tag)) { // north
					t.addDrawData('curve_nw');
				}
			}
			if (tiles({x: coords.x, y: coords.y - 1, z: coords.z}).tag(tag)) {
				t.addDrawData('n')
			}
			if (tiles({x: coords.x, y: coords.y + 1, z: coords.z}).tag(tag)) {
				t.addDrawData('s')
			}
			if (tiles({x: coords.x + 1, y: coords.y, z: coords.z}).tag(tag)) {
				t.addDrawData('e')
				if (tiles({x: coords.x + 1, y: coords.y - 1, z: coords.z}).tag(tag) && tiles({x: coords.x, y: coords.y - 1, z: coords.z}).tag(tag)) {
					t.addDrawData('ne')
				}
				if (tiles({x: coords.x + 1, y: coords.y + 1, z: coords.z}).tag(tag) && tiles({x: coords.x, y: coords.y + 1, z: coords.z}).tag(tag)) {
					t.addDrawData('se')
				}
			} else if (curves) {
				if (!tiles({x: coords.x, y: coords.y + 1, z: coords.z}).tag(tag)) { // south
					t.addDrawData('curve_se');
				}
				if (!tiles({x: coords.x, y: coords.y - 1, z: coords.z}).tag(tag)) { // north
					t.addDrawData('curve_ne');
				}
			}
		}
		if (t.tag('outOfBounds')) {
			if (coords.z < tiles('global').groundFloor) {
				t.addDrawData('outOfBounds_underground');
			} else if (coords.z === tiles('global').groundFloor + 1) {
				t.data.drawData = tiles({x: coords.x, y: coords.y, z: tiles('global').groundFloor}).data.drawData.slice(0);
				t.addDrawData('outOfBounds_aboveground_1');
			} else if (coords.z === tiles('global').groundFloor + 2) {
				t.data.drawData = tiles({x: coords.x, y: coords.y, z: tiles('global').groundFloor}).data.drawData.slice(0);
				t.addDrawData('outOfBounds_aboveground_2');
			}
		}
		if (t.tag('road')) {
			t.addDrawData('road');
			checkAdjacent('road', true);
		}
		if (t.tag('building')) {
			t.addDrawData('building');
			checkAdjacent('building', false);
		}
		if (t.tag('buildingSmall')) {
			t.addDrawData('building');
		}
		if (t.tag('tree')) {
			t.addDrawData('tree')
		}
		if (t.tag('lake')) {
			t.addDrawData('lake');
			checkAdjacent('lake', true);
		}
		if (t.tag('grass')) {
			t.addDrawData('grass');
			checkAdjacent('grass', true);
		}
	},
	applyMap = function (tile) {
		var x = tile.data.coords.x,
			y = tile.data.coords.y,
			z = tile.data.coords.z;
		for (var i = 0, mappedItem; mappedItem = testBlock.map[z][y][x][i]; i += 1) {
			tile.add(items(mappedItem));
			if (mappedItem === 'Field') {
				var r = Math.floor(Math.random() * 3) 
				if (r === 0) {
					tile.add(items('Shovel'));
				} else if (r === 1) {
					tile.add(items('Axe'));
				} else if (r === 2) {
					tile.add(items('Twinkie'));					
				}
			}
			if (z === 1 && mappedItem) {
				var r = Math.floor(Math.random() * 5) 
				if (r === 0) {
					tile.add(items(items('Looter')).on('gameTick', gameServer.gameTick.trigger).addData({coords:{x:x, y:y, z:z}}).data.id);
				}
			}
		}
	},
	randomTile = function (tile) {
		var i = Math.floor(Math.random() * 10)
		if (i <= 1) {
			tile.add(items('Road'));
		} else if (i <= 3) {
			tile.add(items('Building'));
			if (tile.data.coords.z === 0) {
				tile.add(items('DoorIn'));
			} else {
				tile.add(items('DoorOut'));
			}
		} else if (i <= 5) {
			tile.add(items('Tree'));
		} else if (i === 6) {
			tile.add(items('Field'));
			tile.add(items('Axe'));
		} else if (i === 7) {
			tile.add(items('Field'));
			tile.add(items('Shovel'));
		} else if (i === 8) {
			tile.add(items('Field'));
			tile.add(items('Twinkie'));		
		} else if (i === 9) {
			tile.add(items('Lake'));
		}
	},
	testBlock = {map: [
			[	//			1					2						3						4					5						6						7					8						9					10						11						12						13					14						15
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//1
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']], //2
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds']],	//3
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds']],	//4
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds']],	//5
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//6
				[['OutOfBounds'],	['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//7
				[['OutOfBounds'],	['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//8
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//9
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//10
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds']],	//11
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//12
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['BuildingInt', 'StairsUp'], ['OutOfBounds'], ['OutOfBounds']],	//13
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//14
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//15
			],
			[	//		1			2				3					4					5						6			7		8		9		10			11		12			13			14			15
				[['Field'],	['Field'],	['Field'],		['Tree'], 			['Field'], 	['Field'], 	['Field'], ['Road'], ['Field'], ['Field'], ['Field'], ['Tree'], ['Field'], ['Tree'], ['Field']],	//1
				[['Field'],	['Tree'],	['Field'],		['Field'], 			['Tree'],	['Road'], 	['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Field']], //2
				[['Field'],	['Field'],	['Field'],		['Field'], 			['Road'],	['Road'], 	['Building', 'DoorIn'], ['Field'], ['Field'], ['Road'], ['Building', 'DoorIn'], ['Building', 'DoorIn'], ['Building', 'DoorIn'], ['Road'], ['Field']],	//3
				[['Field'],	['Tree'],	['Tree'],		['Road'], 			['Road'],	['Tree'], 	['Lake'], ['Field'], ['Field'], ['Road'], ['Building', 'DoorIn'], ['Building', 'DoorIn'], ['Building', 'DoorIn'], ['Road'], ['Tree']],	//4
				[['Field'],	['Field'],	['Road'],		['Road'],			['Field'], 	['Field'], 	['Field'], ['Road'], ['Road'], ['Road'], ['Tree'], ['Building', 'DoorIn'], ['Building', 'DoorIn'], ['Road'], ['Field']],	//5
				[['Field'],	['Road'],	['Road'],		['Field'], 			['Field'], 	['Field'],	['Field'], ['Field'], ['Tree'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Field']],	//6
				[['Field'],	['Road'],	['Building', 'DoorIn'],	['Building', 'DoorIn'], 		['Field'], 	['Road'],	['Road'], ['Road'], ['Road'], ['Road'], ['Field'], ['Field'], ['Field'], ['Road'], ['Field']],	//7
				[['Road'],	['Road'],	['Building', 'DoorIn'],	['Building', 'DoorIn'],		['Field'], 	['Road'], 	['Tree'], ['Road'], ['Building', 'DoorIn'], ['Road'], ['Field'], ['Field'], ['Tree'], ['Road'], ['Road']],	//8
				[['Field'],	['Road'],	['Road'],		['Road'],			['Field'], 	['Road'], 	['Field'], ['Road'], ['Road'], ['Road'], ['Field'], ['Road'], ['Tree'], ['Road'], ['Field']],	//9
				[['Field'],	['Field'],	['Field'],		['Road'],			['Road'], 	['Road'],	['Field'], ['Field'], ['Field'], ['Field'], ['Field'], ['Road'], ['Tree'], ['Road'], ['Field']],	//10
				[['Tree'],	['Field'],	['Tree'],		['Field'], 			['Field'], 	['Road'], 	['Field'], ['Field'], ['Building', 'DoorIn'], ['Field'], ['Building', 'DoorIn'], ['Road'], ['Building', 'DoorIn'], ['Road'], ['Field']],	//11
				[['Field'],	['Field'],	['Tree'],		['Tree'], 			['Field'], 	['Road'], 	['Tree'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Road'], ['Field']],	//12
				[['Field'],	['Tree'],	['Lake'],		['Lake'],			['Field'], 	['Road'], 	['Field'], ['Road'], ['Field'], ['Field'], ['Building', 'DoorIn'], ['Road'], ['Building', 'DoorIn'], ['Road'], ['Field']],	//13
				[['Field'],	['Field'],	['Lake'],		['Lake'],			['Field'], 	['Road'], 	['Road'], ['Road'], ['Field'], ['Field'], ['Tree'], ['Field'], ['Field'], ['Field'], ['Field']],	//14
				[['Field'],	['Tree'],	['Field'],		['Field'], 			['Field'],	['Tree'], 	['Field'], ['Road'], ['Field'], ['Field'], ['Tree'], ['Field'], ['Tree'], ['Field'], ['Field']],	//15
			],
			[	//			1					2						3						4					5						6						7					8						9					10						11						12						13					14						15
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//1
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']], //2
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['OutOfBounds'], ['OutOfBounds']],	//3
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['OutOfBounds'], ['OutOfBounds']],	//4
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['OutOfBounds'], ['OutOfBounds']],	//5
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//6
				[['OutOfBounds'],	['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//7
				[['OutOfBounds'],	['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['BuildingInt', 'DoorOut', 'StairsUpDown'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//8
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//9
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//10
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds']],	//11
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//12
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['BuildingInt', 'DoorOut', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds']],	//13
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//14
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//15
			],
			[	//			1					2						3						4					5						6						7					8						9					10						11						12						13					14						15
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//1
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']], //2
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds']],	//3
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds']],	//4
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds']],	//5
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//6
				[['OutOfBounds'],	['OutOfBounds'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//7
				[['OutOfBounds'],	['OutOfBounds'], ['BuildingInt', 'StairsDown'], ['BuildingInt', 'StairsDown'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//8
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//9
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//10
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//11
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//12
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//13
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//14
				[['OutOfBounds'],	['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds'], ['OutOfBounds']],	//15
			],
	]};

module.exports = tiles;