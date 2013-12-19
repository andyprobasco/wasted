var socket;
var mongo = require('mongodb'),
	Server = mongo.Server,
	Db = mongo.Db,
	server = new Server('localhost', 27017, {auto_reconnect: true}),
	db = new Db('testDb', server),
	openDb;
db.open(function(err, db){
	openDb = db;
});
var openCollection = function (collection, callback) {
	openDb.collection(collection, callback);
};

var tiles = require("./map");
tiles('buildMap', {w:15, h:15, d:4});

function start (s) {
	socket = s;
	socket.emit('logged in', tiles('exportMap', {z:1, xStart: 0, xEnd: 5, yStart: 0, yEnd: 5}));
	socket.on('getMap', function (data) {
		socket.emit('sendMap', {mapData: tiles('global'), contents: tiles('exportMap', data)});
	});
	socket.on('getTile', function (data) {
		socket.emit('sendTile', {itemList:tiles('getProtoTile', data).itemList});
	});
	socket.on('addItem', function (data) {
		tiles(data.coords).add(data.item, data.itemName).updateSurroundingCss(data.coords);
		socket.emit('sendMap', {mapData: tiles('global'), contents: tiles('exportMap', data.mapData)});
		socket.emit('sendTile', {itemList:tiles('getProtoTile', data.coords).itemList});
	});
	socket.on('removeItem', function (data) {
		tiles(data.coords).remove(tiles(data.coords).data.itemList[data.index]).updateSurroundingCss(data.coords);
		socket.emit('sendMap', {mapData: tiles('global'), contents: tiles('exportMap', data.mapData)});
		socket.emit('sendTile', {itemList:tiles('getProtoTile', data.coords).itemList});
	});

	socket.on('loadMap', function (data) {
		openCollection('mapProto', function (err, collection) {
			collection.findOne({'name':data.name}, function(err, item){
				if (err) {
					console.log(err);
				} else if (item) {
					tiles('buildMapFromProto', item);
					socket.emit('sendMap', {mapData: tiles('global'), contents: tiles('exportMap', data)});
				} else {
					console.log("AAAAAH");
					socket.emit('message', 'Invalid Map Name Specified');
				}
			});
		});
	});
	socket.on('saveMap', function (data) {
		console.log('saving');
		console.log(data);
		openCollection('mapProto', function (err, collection) {
			var protomap = tiles('getProtoMap');
			protomap.name = data.name;
			console.log(protomap.name);
			collection.findOne({'name':protomap.name}, function(err, item){
				if (item) {
					collection.update({'name': protomap.name},{$set:{'mapData': protomap.mapData, 'contents': protomap.contents}}, {safe:true}, function(err, result){});
				} else {
					collection.insert({'name': protomap.name, 'mapData': protomap.mapData, 'contents': protomap.contents}, {safe:true}, function(err, result){});
				}
			});
		});
	});
	socket.on('getMapNames', function (data) {
		openCollection('mapProto', function (err, collection) {
			collection.find({},{'name':true}).toArray(function (err, items){
				socket.emit('sendMapNames', items);
			});
		});
	});
	socket.on('newMap', function (data) {
		console.log(data);
		tiles('buildBlankMap', {w:data.mapData.width, h:data.mapData.height, d:4});
		socket.emit('sendMap', {mapData: tiles('global'), contents: tiles('exportMap', {z:1, xStart: 0, xEnd: 5, yStart: 0, yEnd: 5})});
	});
}
	//collection.update({name: 'name'}, {$set: {mapData: 'mapData', contents: 'mapContents'}}, {safe:true}, 'callback (err, result)')
	/*collection.fine({name: 'name'}).toArray(function (err, items) {
		if (items.length > 0) {	//(item found)
			userData = items[0]
			
			
		} else {
		
		}
	})*/
exports.start = start;