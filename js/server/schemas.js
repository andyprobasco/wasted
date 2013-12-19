var defineSchemas = function (mongoose) {
	schemas = {}
	schemas.map = new mongoose.Schema({
		name: String,
		mapData: {},
		contents: Array
	});
	schemas.tile = new mongoose.Schema({
		name: String
	});
	schemas.item = new mongoose.Schema({
		name: String
	});
	/*schemas.item.methods.speak = function () {
		var greeting = this.name ? 'Item name is ' + this.name : "I don't have a name";
		console.log(greeting);
	}*/
	return schemas
}
exports.define = defineSchemas