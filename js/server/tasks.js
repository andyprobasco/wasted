var items = require("./items");
var tiles = require("./map");
var gameServer = require("./gameServer");

//UTILS
var dieRoll = function dieRoll(quantity, dieType) {
		var value = 0
		for (var i = 0; i < quantity; i += 1) {
			value += Math.floor(Math.random() * dieType) + 1;
		}
		return value;
	},
	skillCheck = function skillCheck(modifier, target, successCallback, failCallback, args) {
		var roll = dieRoll(3, 6) - 11; // (3, 4) - 8
		if (modifier + roll >= target) {
			return successCallback(args);
		} else {
			if (failCallback) {
				return failCallback(args);
			}
		}
	};
//STRUCTS
var Selector = function (childTasks) {
	this.childTasks = childTasks;
	this.trigger = function () {
		for (var i = 0, task; task = this.childTasks[i]; i += 1) {
			if (task.trigger()) {
				return true;
			}
		}
		return false;
	};
};
var Sequencer = function (childTasks) {
	this.childTasks = childTasks;
	this.trigger = function () {
		for (var i = 0, task; task = this.childTasks[i]; i += 1) {
			if (!task.trigger()) {
				return false;
			}
		}
		return true;
	};
};
var Verifier = function (condition) {
	this.condition = condition;
	this.trigger = function () {
		if (this.condition) {
			return true;
		}
		return false;
	}
};
//ACTIONS
var actions = function (data) {
	var data = data,//data.playerData	// the player initiating the action
		thisTile = tiles(data.coords),	// the tile the action is taking place on
		target = items(data.itemID),	// the item the action is originating from
		cost = target.getActionCost(data.actionType, data.playerData);
	return {
		'pick up': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				plr = items(data.playerData.id);
				if (plr.pickupItem(data.itemID)) {
					tiles(data.coords).remove(data.itemID).broadcast({message:{text:[data.playerData.id, ' picked up a ' + items(data.itemID).data.name + '.']}, player:true, inventory: true, tile: true});
				} else {
					tiles(data.coords).broadcast({message:{text:[data.playerData.id, " can't pick up " + items(data.itemID).data.name + ", they're carrying too much already."]}, player:true, inventory: true, tile: true});
				}				
				/*if (!data.playerData.currentWeight || data.playerData.currentWeight < data.playerData.maxWeight) {
					data.playerData.inventory.push({name: items(data.itemID).data.name, id: data.itemID})
					if (data.playerData.currentWeight || data.playerData.currentWeight === 0) {
						data.playerData.currentWeight += items(data.itemID).data.weight;
					}
					tiles(data.coords).remove(data.itemID).broadcast({message:{text:[data.playerData.id, ' picked up a ' + items(data.itemID).data.name + '.']}, player:true, inventory: true, tile: true});
				} else {
					tiles(data.coords).broadcast({message:{text:[data.playerData.id, " can't pick up " + items(data.itemID).data.name + ", they're carrying too much already."]}, player:true, inventory: true, tile: true});
				}*/
			}}]),//}
		'drop': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				plr = items(data.playerID);
				plr.unbindItem(data.itemID);
				tiles(data.coords).add(data.itemID).broadcast({message: {text:[data.playerData.id, ' dropped a ' + items(data.itemID).data.name]}, player:true, inventory: true, tile: true});;
				/*for (var i = 0, item; item = data.playerData.inventory[i]; i++) {
					if (item.id === data.itemID) {
						if (item.id === data.playerData.weapon.id) {
							items(data.playerID).unreadyWeapon()
						}
						if (item.id === data.playerData.tool.id) {
							items(data.playerID).unequipTool()
						}
						if (data.playerData.currentWeight || data.playerData.currentWeight === 0) {
							data.playerData.currentWeight -= items(item.id).data.weight;
						}
						data.playerData.inventory.splice(i, 1);
						tiles(data.coords).add(data.itemID).broadcast({message: {text:[data.playerData.id, ' dropped a ' + items(data.itemID).data.name]}, player:true, inventory: true, tile: true});
						return false
					}		
				}*/			
			}}]),//}
		'equip tool': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				items(data.playerID).equipTool(data.itemID);
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: "You equipped the " + items(data.itemID).data.name}, player:true, inventory:true});
					items(data.playerID).update()
				}
			}}]),//}
		'ready weapon': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				items(data.playerID).readyWeapon(data.itemID);
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: "You readied the " + items(data.itemID).data.name}, player:true, inventory:true});
					items(data.playerID).update()
				}

				//return  {player: data.playerData, inventory:true};
			}}]),//}
		'attack': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				var toHit = data.playerData.modifier.toHit,
					dodge = target.data.modifier.dodge,
					damage = data.playerData.weapon && data.playerData.weapon.id? items(data.playerData.weapon.id).data.attackDamage : data.playerData.damage;
				if (data.playerData.weapon && data.playerData.weapon.id) {
					var weapon = items(data.playerData.weapon.id);
					toHit += weapon.data.toHitBonus;
				}
				if (data.playerData.skills) {
					if (data.playerData.skills['toHit1']) {
						toHit += 1;
					}
					if (data.playerData.skills['toHit2']) {
						toHit += 1;
					}
					if (data.playerData.skills['toHit3']) {
						toHit += 1;
					}
					if (data.playerData.skills['damage1']) {
						damage += 1;
					}
					if (data.playerData.skills['damage2']) {
						damage += 1;
					}
					if (data.playerData.skills['damage3']) {
						damage += 1;
					}	
				}
				if (target.data.skills) {
					if (target.data.skills['dodge1']) {
						dodge += 1;
					}
					if (target.data.skills['dodge2']) {
						dodge += 1;
					}
					if (target.data.skills['dodge3']) {
						dodge += 1;
					}					
				}
				if (data.playerData.xp) {
					data.playerData.xp['fight'] += 5
				}				
				skillCheck(toHit, dodge, function(){
					target.data.hp -= damage;
					console.log('LOG: ' + data.playerData.name + ' hit ' + target.data.name + ' for ' + damage + ' damage!')
					thisTile.broadcast({message: {text:[data.playerData.id, ' hit ', data.itemID, ' for ' + damage + ' damage!']}, player: true})
				}, function(){
					console.log('LOG: ' + data.playerData.name + ' missed ' + target.data.name)
					thisTile.broadcast({message: {text:[data.playerData.id, ' attacked ', data.itemID, ' but missed.']}, player: true})
				})
				//return false;
			}}]),//}			
		'enter building': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				gameServer.movePlayer(data.playerID, {z:+1});					
				//return false;
			}}]),//}
		'exit building': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				gameServer.movePlayer(data.playerID, {z:-1});					
			}}]),//}
		'drink from': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				data.playerData.wp = data.playerData.wpMax;
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: ["You drink the water, delicious!"]}, player:true, inventory:true});
					items(data.playerID).update()
				}
			}}]),//}
		'eat': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				data.playerData.fp = data.playerData.fpMax;
				items(data.playerID).unbindItem(data.itemID)
				items(data.playerID).addToUpdateQueue({message: {text: ["You ate the glorious golden perfect delicious " + items(item).data.name + "."]}, player:true, inventory:true});
				items(data.playerID).addToUpdateQueue({message: {text: ["You ate the glorious golden perfect delicious " + items(item).data.name + "."]}, player:true, inventory:true});
				items('kill', data.itemID);
			}}]),//}
		'drink': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				data.playerData.wp = data.playerData.wpMax;
				items(data.playerID).unbindItem(data.itemID)
				items(data.playerID).addToUpdateQueue({message: {text: ["You drink the cool, delicious " + items(item).data.name + "."]}, player:true, inventory:true});
				items('kill', data.itemID);
			}}]),//}			
		'go up': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				if (data.playerData.coords.z === tiles('global').groundFloor -1) {
					gameServer.movePlayer(data.playerID, {z:+2});					
				} else {
					gameServer.movePlayer(data.playerID, {z:+1});										
				}
				return false;
			}}]),//}
		'go down': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				if (data.playerData.coords.z === tiles('global').groundFloor + 1) {
					gameServer.movePlayer(data.playerID, {z:-2});					
				} else {
					gameServer.movePlayer(data.playerID, {z:-1});										
				}
				return false;
			}}]),//}
		'search': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				var newItem = false;
				skillCheck(0, target.data.searchDifficulty, function () {
					newItem = items('Twinkie');
					if (target.data.searchData) {
						var index = dieRoll(1, target.data.searchData.length) - 1
						newItem = items(target.data.searchData[index])
					}
					
					if ( items(data.playerData.id).pickupItem(newItem) ) {
						items(data.playerID).addToUpdateQueue({message: {text: ["You found a "+items(newItem).data.name+"!"]}, player:true, inventory:true});
					} else {
						items(data.playerID).addToUpdateQueue({message: {text: ["You fail to find anything."]}, player:true, inventory:true});
					}
					
					/*
					
					if (!data.playerData.currentWeight || data.playerData.currentWeight < data.playerData.maxWeight) {
						if (data.playerData.currentWeight || data.playerData.currentWeight === 0) {
							data.playerData.currentWeight += items(newItem).data.weight;
						}
						data.playerData.inventory.push({name:items(newItem).data.name, id: newItem})
						if (items(data.playerID).updateQueue) {
							items(data.playerID).addToUpdateQueue({message: {text: ["You found a "+items(newItem).data.name+"!"]}, player:true, inventory:true});
							items(data.playerID).update()
						}
					} else {
						tiles(data.coords).add(newItem).broadcast({message:{text:[data.playerData.id, " found a " + items(newItem).data.name + ", but had to leave it on the ground."]}, player:true, inventory: true, tile: true});
					}*/
				}, function () {
					if (items(data.playerID).updateQueue) {
						items(data.playerID).addToUpdateQueue({message: {text: ["You fail to find anything."]}, player:true, inventory:true});
						items(data.playerID).update()
					}
				}, null)
			}}]),//}
		// Crafting

		'clear field': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				thisTile.remove(data.itemID).add('Dirt') // BROADCAST
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: ["You cleared the field."]}, player:true, inventory:true});
					items(data.playerID).update()
				}
				return false;
			}}]),//}
		'plow field': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				thisTile.remove(data.itemID).add('Field') // BROADCAST
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: ["You plowed a road."]}, player:true, inventory:true});
					items(data.playerID).update()
				}
				return false;
			}}]),//}			
//	//	//	//	//	//	//	//	//	//	//	//	//	
		'break road': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				thisTile.remove(data.itemID).add('Rubble') // BROADCAST
				items(data.playerID).add('Stones');
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: ["You destroyed the road."]}, player:true, inventory:true});
					items(data.playerID).update()
				}
				return false;
			}}]),//}
		'clear rubble': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				thisTile.remove(data.itemID).add('Dirt') // BROADCAST
				items(data.playerID).add('Stones');
				if (items(data.playerID).updateQueue) {
					items(data.playerID).addToUpdateQueue({message: {text: ["You cleared the rubble."]}, player:true, inventory:true});
					items(data.playerID).update()
				}
				return false;
			}}]),//}
		'build road': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				if (target.tag('dirt')) {
					thisTile.remove(data.itemID).add('Road underConstruction').broadcast({message: {text:[data.playerData.id, ' started building a Road']}, player:true, inventory: true, tile: true});
					items(data.playerData.id).unbindItem(data.playerData.tool.id)
					items('kill', data.playerData.tool.id);
				} else if (target.tag('roadUnderConstruction')) {
					thisTile.remove(data.itemID).add('Road').updateSurroundingCss(thisTile.data.coords).broadcast({message: {text:[data.playerData.id, ' built a Road']}, player:true, inventory: true, tile: true, map: true});;
					items(data.playerData.id).unbindItem(data.playerData.tool.id)
					items('kill', data.playerData.tool.id);
				}
				return false;
			}}]),//}
//	//	//	//	//	//	//	//	//	//	//	//	//	
		'chop wood': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				thisTile.remove(data.itemID).updateSurroundingCss(thisTile.data.coords).broadcast({message: {text:[data.playerData.id, ' cut down a tree']}, player:true, inventory: true, tile: true, map: true});
				items(data.playerID).pickupItem('Wood')
				items(data.playerID).pickupItem('Sapling')
				return false;
			}}]),//}
		'plant sapling': new Sequencer(//{
			[new Verifier(true),
			{trigger: function () {
				thisTile.add(data.playerData.tool.id).broadcast({message: {text:[data.playerData.id, ' planted a sapling.']}, player:true, inventory: true, tile: true, map: true});
				items(data.playerData.tool.id).on('time change', function () {
						var thisTile = tiles(this.data.coords)
						thisTile.remove(this.data.id).add('Tree').updateSurroundingCss(thisTile.data.coords).broadcast({message: {text:['A tree has grown here']}, inventory: true, tile: true, map: true});
						items('kill', this.data.id);
					})
				items(data.playerData.id).unbindItem(data.playerData.tool.id)

				return false;
			}}]),//}

		};
};
var skills = {
	'toHit1':	{'desc': '+1 chance to hit',			'xpType': 'fight'}, 
	'toHit2':	{'desc': '+1 additional chance to hit',	'xpType': 'fight', 'req':['toHit1']},
	'toHit3':	{'desc': '+1 additional chance to hit',	'xpType': 'fight', 'req':['toHit2']},
	'damage1':	{'desc': '+1 to damage',				'xpType': 'fight'}, 
	'damage2':	{'desc': '+1 additional to damage',		'xpType': 'fight', 'req':['damage1']},
	'damage3':	{'desc': '+1 additional to damage',		'xpType': 'fight', 'req':['damage2']},
	'dodge1':	{'desc': '+1 to dodge',					'xpType': 'explore'}, 
	'dodge2':	{'desc': '+1 additional to dodge',		'xpType': 'explore', 'req':['dodge1']},
	'dodge3':	{'desc': '+1 additional to dodge',		'xpType': 'explore', 'req':['dodge2']}
	
}
var getSkillArray = function () {
	var skillArray = [],
		addSkill = function (skillName) {
			var skillObj = skills[skillName];
			skillObj['name'] = skillName
			skillArray.push(skillObj);
		}
	addSkill('toHit1')
	addSkill('toHit2')
	addSkill('toHit3')
	addSkill('damage1')
	addSkill('damage2')
	addSkill('damage3')
	addSkill('dodge1')
	addSkill('dodge2')
	addSkill('dodge3')
	return skillArray;
}
exports.Selector = Selector;
exports.Sequencer = Sequencer;
exports.Verifier = Verifier;
exports.actions = actions;
exports.skills = skills;
exports.getSkillArray = getSkillArray;