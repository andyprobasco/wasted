GLOBAL = {
	mapName: 'Live',
	xStart: 0,
	minimapWidth: 5,
	yStart: 0,
	minimapHeight: 5,
	mapZ: 1,
	selectedX: 0,
	selectedY: 0,
	activeTileX: 0,
	activeTileY: 0,
	mapHeight: 1,
	mapWidth: 1,
	contents: null,
}
var socket = io.connect(null);
socket.on('logged in', function (data) {
	buildMap(data)
	GLOBAL.contents = data;
	buildAddItems();
})
socket.on('message', function (msg) {
	alert(msg);
})
socket.on('sendMap', function (data) {
	buildMap(data.contents);
	GLOBAL.contents = data.contents;
	GLOBAL.mapHeight = data.mapData.height;
	GLOBAL.mapWidth = data.mapData.width;
	$('#widthBox').attr('value', GLOBAL.mapWidth)
	$('#heightBox').attr('value', GLOBAL.mapHeight)
})
socket.on('sendTile', function (data) {
	markup = 'Active Tile:<br>x: '+GLOBAL.activeTileX+', y: '+GLOBAL.activeTileY +', z: ' + GLOBAL.mapZ + '<p>';
	//console.log(data)
	for (var i = 0; i < data.itemList.length; i += 1) {
		markup += '<button class="removeItemButton" itemID="' + i + '">' + data.itemList[i].name + ' (' + data.itemList[i].type + ')' + '</button><br>'
	}
	$('#tileDesc').html(markup);
})
socket.on('sendMapNames', function (data) {
	console.log('map names')
	var alertObj = [];
	if (data && data.length > 0) {
		for (var i = 0; i < data.length; i += 1) {
			alertObj.push(data[i].name);
		}
	}
	alert(alertObj);
})
socket.on('protomap', function (data) {
	console.log('protomap');
	console.log(data);
})

var newButton = function (bText, bID, callback) {
	var markup = '<button'
	if (bID) {
		markup += ' id="' + bID + '"'
	}
	markup += '>' + bText + '</button>'
	//+ bType ? 'class="' + bType +
	if (callback) {
		$(document).on('click', '#' + bID, callback)
	}
	return markup
}
var getMap = function () {
	socket.emit('getMap', {z:GLOBAL.mapZ, xStart: GLOBAL.xStart, xEnd: GLOBAL.xStart + GLOBAL.minimapWidth, yStart: GLOBAL.yStart, yEnd: GLOBAL.yStart + GLOBAL.minimapHeight})
}
var getTile = function () {
	socket.emit('getTile', {x:GLOBAL.activeTileX, y:GLOBAL.activeTileY, z:GLOBAL.mapZ});
}
var buildMap = function buildMap(mapData) {
	var markup, x, y, tile,
		width = GLOBAL.minimapWidth,
		height = GLOBAL.minimapHeight,
		depth = 1,
		minimapWidth = GLOBAL.minimapWidth,
		minimapHeight = GLOBAL.minimapHeight;
	
	markup = "<style type='text/css'>"
	markup += '.mapSquare{width:'+100/minimapWidth+'%;height:'+100/minimapHeight+'%;}'
	markup += '.mapSquare2{width:'+100/minimapWidth+'%;height:'+100/minimapHeight+'%;}'
	markup += '.mapSquare3{width:'+100/minimapWidth+'%;height:'+100/minimapHeight+'%;}'
	for (x = 0; x < minimapWidth; x += 1) {
		markup += '.x' + x + '{left:' + 100 * x / minimapWidth + '%;}'
	}
	for (y = 0; y < minimapHeight; y += 1) {
		markup += '.y' + y + '{top:' + 100 * y / minimapHeight + '%;}'
	}
	markup += "</style>"
	$(markup).appendTo('head')
	markup = ""
	for (x = 0; x < minimapWidth; x += 1) {
		for (y = 0; y < minimapHeight; y += 1) {
			markup+= '<div class="mapSquare x' + x + ' y' + y + ' ';
			//console.log('x: ' + x + ', height: ' + height + ', depth: ' + depth + ', y: ' + y +', cellNo: ' + (x * height * depth + y * depth + 0));
			for (var i = 0, css; css = mapData[x * height * depth + y * depth + 0].drawData[i]; i++) {
				markup += " " + css;
			}
			if (GLOBAL.activeTileX === x + GLOBAL.xStart && GLOBAL.activeTileY === y + GLOBAL.yStart) {
				markup += " activeSquare"
			}
			
			markup += '" localX="' + x + '" localY="' + y + '">'
			if (mapData[x * height * depth + y * depth + 0].playerList.length && mapData[x * height * depth + y * depth + 0].npcList.length) {
				if ( mapData[x * height * depth + y * depth + 0].playerList.length > 1) {
					markup += '<div class="multiPlayerIcon multi";"></div>'
				} else {
					markup += '<div class="playerIcon multi";"></div>'
				}
				//console.log(mapData[x * height * depth + y * depth + 0].npcList[0])
				markup += '<div class="npcIcon multi";"></div>'
			} else {
				if (mapData[x * height * depth + y * depth + 0].playerList.length){
					if ( mapData[x * height * depth + y * depth + 0].playerList.length > 1) {
						markup += '<div class="multiPlayerIcon";"></div>'
					} else {
						markup += '<div class="playerIcon";"></div>'
					}
				}
				if (mapData[x * height * depth + y * depth + 0].npcList.length){
					//console.log(mapData[x * height * depth + y * depth + 0].npcList[0])
					markup += '<div class="npcIcon";"></div>'
				}
			}
			markup += '<div class="tileFilter";"></div>'
			markup += '<div class="inner nw"></div><div class="inner n"></div><div class="inner ne"></div>'
			markup += '<div class="inner w"></div><div class="inner center"></div><div class="inner e"></div>'
			markup += '<div class="inner sw"></div><div class="inner s"></div><div class="inner se"></div>'
			markup += '</div>';
		}
	}
	$('#map').html(markup)
}
var addItemToTile = function (itemType, itemName) {
	console.log('adding item: ' + itemType + ', ' + itemName)
	socket.emit('addItem', {
		coords:{x:GLOBAL.activeTileX, y:GLOBAL.activeTileY, z:GLOBAL.mapZ},
		item: itemType, 
		itemName: itemName,
		mapData:{z:GLOBAL.mapZ, xStart: GLOBAL.xStart, xEnd: GLOBAL.xStart + GLOBAL.minimapWidth, yStart: GLOBAL.yStart, yEnd: GLOBAL.yStart + GLOBAL.minimapHeight}
	})

}
var removeItemFromTile = function (index) {
	socket.emit('removeItem', {
		coords:{x:GLOBAL.activeTileX, y:GLOBAL.activeTileY, z:GLOBAL.mapZ},
		index: index,		
		mapData:{z:GLOBAL.mapZ, xStart: GLOBAL.xStart, xEnd: GLOBAL.xStart + GLOBAL.minimapWidth, yStart: GLOBAL.yStart, yEnd: GLOBAL.yStart + GLOBAL.minimapHeight}
	})
}
$(document).on('click', '.removeItemButton', function () {
	removeItemFromTile($(this).attr('itemID'))
}).on('click', '.addItemButton', function () {
	addItemToTile($('#'+ $(this).attr('target') +' option:selected').text(), $('#'+ $(this).attr('textTarget')).val())
	//addItemToTile($('#itemToAdd option:selected').text())
}).on('click', '#saveMapButton', function () {
	socket.emit('saveMap', {name:$('#mapNameBox').val()});
})/*.on('click', '#saveMapAsButton', function () {
	socket.emit('saveMapAs');
})*/.on('click', '#loadMapButton', function () {
	socket.emit('loadMap', {name: $('#mapNameBox').val(), z:GLOBAL.mapZ, xStart: 0, xEnd: GLOBAL.minimapWidth, yStart: 0, yEnd: GLOBAL.minimapHeight});
}).on('click', '#newMapButton', function () {
	socket.emit('newMap', {name:$('#mapNameBox').val(), mapData:{width:$('#widthBox').val(),height:$('#heightBox').val()}})
}).on('click', '#getMapNamesButton', function () {
	socket.emit('getMapNames');
})
/*.on('click', '.mapSqaure', function () {
	console.log('hey')
	GLOBAL.activeTileX = parseInt($(this).attr('localx'))+GLOBAL.xStart;
	GLOBAL.activeTileY = parseInt($(this).attr('localy'))+GLOBAL.yStart;
	getTile();
	buildMap(GLOBAL.contents)
	console.log('hey')
	//getMap();
})*/

$(document).on('click', '.mapSquare', function (){
	GLOBAL.activeTileX = parseInt($(this).attr('localx'))+GLOBAL.xStart;
	GLOBAL.activeTileY = parseInt($(this).attr('localy'))+GLOBAL.yStart;
	getTile();
	buildMap(GLOBAL.contents)
	
})

$('#tileEdit').html(newButton('5x5', 'get5x5', function () {
						GLOBAL.minimapWidth = 5;
						GLOBAL.minimapHeight = 5;
						getMap()
					}) + newButton('8x8', 'get8x8', function () {
						GLOBAL.minimapWidth = 8;
						GLOBAL.minimapHeight = 8;
						getMap()
					}) + newButton('16x16', 'get16x16', function () {
						GLOBAL.minimapWidth = 16;
						GLOBAL.minimapHeight = 16;
						getMap()
					}))
$('#fileInfo').html('Map: <input id="mapNameBox" type="textbox" value="' + GLOBAL.mapName +'"></input>, width: <input id="widthBox" type="textbox" size="1" value="' + GLOBAL.mapWidth+ '"></input>, height: <input id="heightBox" type="textbox" size="1" value="' + GLOBAL.mapHeight+ '"></input> - - - <button id="loadMapButton">Load Map</button>' + '<button id="saveMapButton">Save Map</button>' + /*'<button id="saveMapAsButton">Save Map As</button>' +*/ '<button id="newMapButton">New Map</button>' + '<button id="getMapNamesButton">Get Map Names</button>')				
$('#navLeft').html('<div>' + newButton('left 1', 'left1', function () {
						GLOBAL.xStart -= 1;
						if (GLOBAL.xStart < -1) {
							GLOBAL.xStart = -1
						}
						getMap()
					}) + newButton('left 5', 'left5', function () {
						GLOBAL.xStart -= 5;
						if (GLOBAL.xStart < -1) {
							GLOBAL.xStart = -1
						}
						getMap()
					}) + '</div>')
$('#navRight').html('<div>' + newButton('right 1', 'right1', function () {
						GLOBAL.xStart += 1;
						getMap()
					}) + newButton('right 5', 'right5', function () {
						GLOBAL.xStart += 5;
						getMap()
					}) + '</div>')
$('#navUp').html(newButton('up 1', 'up1', function () {
						GLOBAL.yStart -= 1;
						if (GLOBAL.yStart < -1) {
							GLOBAL.yStart = -1
						}
						getMap()
					}) + newButton('up 5', 'up5', function () {
						GLOBAL.yStart -= 5;
						if (GLOBAL.yStart < -1) {
							GLOBAL.yStart = -1
						}
						getMap()
					}) + newButton('z up 1', 'zup1', function () {
						GLOBAL.mapZ += 1;
						getMap()
					}))
$('#navDown').html(newButton('down 1', 'down1', function () {
						GLOBAL.yStart += 1;
						getMap()
					}) + newButton('down 5', 'down5', function () {
						GLOBAL.yStart += 5;
						getMap()
					}) + newButton('z down 1', 'zdown1', function () {
						GLOBAL.mapZ -= 1;
						getMap()
					}))
var buildAddItems = function () {
	markup = ''
// // // // // // // // //	
	markup += '<button class="addItemButton" target="addTerrain" textTarget="addTerrainText">Add Terrain:</button><select id="addTerrain">';
	markup += '<option selected >Dirt</option>';
	markup += '<option>Field</option>';
	markup += '<option>Road</option>';
	markup += '<option>Tree</option>';
	markup += '<option>Lake</option>';
	markup += '<option>OutOfBounds</option>';
	markup += '<option>BarrierNorth</option>';
	markup += '<option>BarrierSouth</option>';
	markup += '<option>BarrierEast</option>';
	markup += '<option>BarrierWest</option>';
	markup += '<option>BarrierNE</option>';
	markup += '<option>BarrierNW</option>';
	markup += '<option>BarrierSE</option>';
	markup += '<option>BarrierSW</option>';
	markup += '</select><input type="text" id="addTerrainText" value="noName"></input><p>';
// // // // // // // // //
	markup += '<button class="addItemButton" target="addBuilding" textTarget="addBuildingText">Add Building:</button><select id="addBuilding">';
	markup += '<option>Building</option>';
	markup += '<option>BuildingInt</option>';
	markup += '<option>BuildingSmall</option>';
	markup += '<option>BuildingIntSmall</option>';
	markup += '<option>Italian Resteraunt</option>';
	markup += '<option>Bowling Alley</option>';
	markup += '<option>Office Building</option>';
	markup += '<option>Movie Theatre</option>';	
	markup += '</select><input type="text" id="addBuildingText" value="noName"></input><p>';
// // // // // // // // //	
	markup += '<button class="addItemButton" target="addBigItem" textTarget="addBigItemText">Add Big Item:</button><select id="addBigItem">';
	markup += '<option>StairsUp</option>';
	markup += '<option>StairsDown</option>';
	markup += '<option>StairsUpDown</option>';
	markup += '<option>DoorIn</option>';
	markup += '<option>DoorOut</option>';
	markup += '<option>Film Projector</option>';
	markup += '</select><input type="text" id="addBigItemText" value="noName"></input><p>';
// // // // // // // // //
	markup += '<button class="addItemButton" target="addLittleItem" textTarget="addLittleItemText">Add Little Item:</button><select id="addLittleItem">';
	markup += '<option>Looter</option>';
	markup += '<option>Looter Corpse</option>';
	markup += '<option>Looter King</option>';
	markup += '<option>Shovel</option>';
	markup += '<option>Axe</option>';
	markup += '<option>Twinkie</option>';
	markup += '</select><input type="text" id="addLittleItemText" value="noName"></input><p>';
 // // // // // // // // //
	$('#tileAddItems').html(markup);
}
/*
	split objects into groups
	swap z-levels
	(floor 0 = basement, 1=outside, 2=inside, 3=upstairs)

	save map to DB by name (text boxes?)
	load map from DB
	
	process.argv[2] === first parameter (nodejs serverstart --newMap)
	process.argv[3] === second parameter
*/