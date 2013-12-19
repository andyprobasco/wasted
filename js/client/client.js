var player = {},
	messageLog = [],
	recentMapUpdate = false,
	timeStage = 0,
	stageName = 'dawn',
	mouseX, mouseY;
//API
var api = (function(){
	var socket = io.connect(null);
	socket.on("update", function(updateInfo) {
		if (updateInfo.player) {
			player = updateInfo.player;
			render.drawStats();
		}
		if (updateInfo.inventory) {
			player = updateInfo.player;
			render.drawInventory();
		}
		if (updateInfo.map) {
			render.buildMap(updateInfo.map);
		}
		if (updateInfo.tile) {
			render.drawTileInfo(updateInfo.tile);
		}
		if (updateInfo.message) {
			updateInfo.message.text = new Date().toLocaleTimeString() + ' - ' + updateInfo.message.text
			messageLog.push(updateInfo.message);
			render.drawMessageLog();
		}
		if (updateInfo.messages && updateInfo.messages.length) {
			for (var i = 0, message; message = updateInfo.messages[i]; i += 1) {
				message.text = new Date().toLocaleTimeString() + ' - ' + message.text;
				messageLog.push(message);
			}
			render.drawMessageLog();
		}
		if (updateInfo.time) {
			render.drawClock(updateInfo.time)
		}
	});
	socket.on('killPlayer', function(){
		$('body').html("You're dead! refresh to create a new character");
	});
	socket.on('actionsRecieved', function (actionList){
		render.drawActionList(actionList);
	})
	socket.on('skillsReceived', function (skillList){
		console.log(skillList)
		render.drawSkills(skillList)
	})
	socket.emit('login', prompt("Enter your name", "player"));
	return {
		move: function(direction) {
			socket.emit('move', direction);
		},
		action: function(actionData){
			socket.emit('act', actionData);
		},
		requestActions: function(data) {
			socket.emit('requestActions', data);
		},
		requestSkills: function(data) {
			socket.emit('requestSkills');
		},
		purchaseSkill: function(data) {
			console.log('buying skill: ' + data);
			socket.emit('buySkill', data)
		}
	}
}())
//RENDER
var render = (function(){
	var resizeMap = function () {
			var mapWrapper = $('#mapWrapper'),
				mapObject = $('#map'),
				mHeight = mapWrapper.height(),
				mWidth = mapWrapper.width(),
				diff;
				
			if ( mHeight > mWidth) {
				diff = mHeight - mWidth;
				mapObject.height(mWidth);
				mapObject.width(mWidth);
				mapObject.css('top', diff / 2);
				mapObject.css('left', 0);
			} else if (mWidth > mHeight) {
				diff = mWidth - mHeight
				mapObject.width(mHeight);
				mapObject.height(mHeight);
				mapObject.css('top', 0);
				mapObject.css('left', diff / 2);
			}
		},
		checkVowel = function (string) {
			var letter = string[0];
			if (letter === 'A' || letter === 'E' || letter === 'I' || letter === 'O' || letter === 'U') {
				return true;
			} else {
				return false;
			}
		};
	$(document).ready(resizeMap)
	$(window).resize(resizeMap)
	$('body').on('click', function(){
		$('#popup').hide();
	})
	$('body').on('click', '.requestActions_link', function(e){
		api.requestActions({id: parseInt($(this).attr('objectID'))})
		mouseX = e.pageX;
		mouseY = e.pageY;
	})
	$('#popup_close').on('click', function(){
		$('#popup').hide()
	})
	$('body').on('click', '.action_link', function(){
		api.action({actionType: $(this).attr('actionType'), itemID: parseInt($(this).attr('objectID'))});
		$('#popup').hide();
	})
	$('#spendXp').on('click', function (){
		console.log('in this shit');
		api.requestSkills();
		/*var markup = "",
			addLink = function (linkName) {
				return '<SPAN class="upgrade_link" style="color:blue;text-decoration:underline;">' + linkName + '</SPAN>'
				return '<SPAN class="action_link" actionType="' + action.name + '" objectID="' + action.id + '" style="color:blue;text-decoration:underline;">' + action.name + ' ' + action.cost + ' AP</SPAN><BR>';
			};
		markup += addLink('+Damage') + '<BR>';
		$('#popup_text').html(markup)
		$('#popup').css('display', 'block')//show();//.css({'top':50,'left':50}).draggable().resizable().show()*/
	})
	$('#skills').on('click', '.availableSkill', function () {
		api.purchaseSkill($(this).html());
		$('#skills').hide();
	})
	$('#skill_close').on('click', function(){
		$('#skills').hide()
	})		
	return {
		drawActionList: function(actionList){
			var markup = "";
			if (actionList.length) {
				for (var i = 0, action; action = actionList[i]; i++) {
					markup += '<SPAN class="action_link" actionType="' + action.name + '" objectID="' + action.id + '" style="color:blue;text-decoration:underline;">' + action.name + ' ' + action.cost + ' AP</SPAN><BR>';
				}
				$('#popup_text').html(markup)
				$('#popup').css({'top':mouseY + 10,'left':mouseX - 30}).draggable().resizable().show()
			} else {
				
				messageLog.push({text: 'No action available for this object'});
				render.drawMessageLog();
			}
		},
		buildMap: function buildMap(mapData) {
			var markup, x, y, tile,
				width = 5,
				height = 5,
				depth = 1,
				mapWidth = 5,
				mapHeight = 5;
			markup = "<style type='text/css'>"
			markup += '.mapSquare{width:'+100/mapWidth+'%;height:'+100/mapHeight+'%;}'
			markup += '.mapSquare2{width:'+100/mapWidth+'%;height:'+100/mapHeight+'%;}'
			markup += '.mapSquare3{width:'+100/mapWidth+'%;height:'+100/mapHeight+'%;}'
			for (x = 0; x < mapWidth; x += 1) {
				markup += '.x' + x + '{left:' + 100 * x / mapWidth + '%;}'
			}
			for (y = 0; y < mapHeight; y += 1) {
				markup += '.y' + y + '{top:' + 100 * y / mapHeight + '%;}'
			}
			markup += "</style>"
			$(markup).appendTo('head')
			markup = ""
			for (x = 0; x < mapWidth; x += 1) {
				for (y = 0; y < mapHeight; y += 1) {
					markup+= '<div class="mapSquare x' + x + ' y' + y + ' ';
					for (var i = 0, css; css = mapData[x * height * depth + y * depth + 0].drawData[i]; i++) {
						markup += " " + css;
					}
					markup += '">'
					if (mapData[x * height * depth + y * depth + 0].playerList.length && mapData[x * height * depth + y * depth + 0].npcList.length) {
						if ( mapData[x * height * depth + y * depth + 0].playerList.length > 1) {
							markup += '<div class="multiPlayerIcon multi";"></div>'
						} else {
							markup += '<div class="playerIcon multi";"></div>'
						}
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
			$('.mapSquare').on('click', function () {
				var vert = false, horiz = false;
				if ($(this).hasClass('x0')||$(this).hasClass('x1')){
					horiz = -1;
				} else if ($(this).hasClass('x3')||$(this).hasClass('x4')) {
					horiz = 1;
				}
				if ($(this).hasClass('y0')||$(this).hasClass('y1')){
					vert = -1;
				} else if ($(this).hasClass('y3')||$(this).hasClass('y4')) {
					vert = 1;
				}
				api.move({x:horiz, y:vert})
			})
		},
		drawMessageLog: function() {
			var markup = ""
			for (var i = 0, message; message = messageLog[i]; i++) {
				markup += message.text + "<br>";
			}
			$('#messageLog').html(markup).scrollTop($('#messageLog')[0].scrollHeight);
		},
		drawStats: function(){
			//markup = player.name + ' AP: ' + player.ap + ' HP: ' + player.hp + ' FP: ' + player.fp + ' WP: ' + player.wp;
			$('#apBar')
				.progressbar({value:player.ap/player.apMax*100})
				.children('.ui-progressbar-label')
				.text(player.ap + '/' + player.apMax + ' Action Points')
			$('#hpBar')
				.progressbar({value:player.hp/player.hpMax*100})
				.children('.ui-progressbar-label')
				.text(player.hp + '/' + player.hpMax + ' Hit Points')
			$('#fpBar')
				.progressbar({value:player.fp/player.fpMax*100})
				.children('.ui-progressbar-label')
				.text(player.fp + '/' + player.fpMax + ' Food Points')
			$('#wpBar')
				.progressbar({value:player.wp/player.wpMax*100})
				.children('.ui-progressbar-label')
				.text(player.wp + '/' + player.wpMax + ' Water Points')
			$('#fightBar')
				.progressbar({value:player.xp.fight})
				.children('.ui-progressbar-label')
				.text('Fight XP: ' + player.xp.fight)
			$('#buildBar')
				.progressbar({value:player.xp.build})
				.children('.ui-progressbar-label')
				.text('Build XP: ' + player.xp.build)
			$('#exploreBar')
				.progressbar({value:player.xp.explore})
				.children('.ui-progressbar-label')
				.text('Explore XP: ' + player.xp.explore)
				
		},
		drawInventory: function () {
			var markup = "INVENTORY:<p>weight: "+player.currentWeight+"/"+player.maxWeight+"<p>";
			console.log(player)
			if (player.inventory.length) {
				for (var i = 0, item; item = player.inventory[i]; i++) {
					markup += '<SPAN class="requestActions_link" objectID="' + item.id + '">' + item.name + "</SPAN><br>";
				}
			}
			$('#inventory').html(markup);
			$('#equips').html('weapon: ' + player.weapon.name + "; tool: " + player.tool.name + ";")
		
		},
		drawTileInfo: function (tileInfo) {
			var markup = '<P>LOCATION<P>';
			if (tileInfo.bigItemList.length) {
				for (var i = 0, bigItem; bigItem = tileInfo.bigItemList[i]; i++) {
					if (bigItem.prefix) {
						markup += bigItem.prefix
					} else {
						markup += 'You see a';
						if (checkVowel(bigItem.name)) {
							markup += 'n';
						}
						markup += ' ';
					}
					markup += '<SPAN class="requestActions_link" objectID="' + bigItem.id + '" style="color:blue;text-decoration:underline;">' + bigItem.name + '</SPAN>'
					markup += '.<P>'
				}
			}
			markup += '<P>ITEMS<P>';
			if (tileInfo.itemList.length) {
				markup += 'You see a'
				for (var i = 0, item; item = tileInfo.itemList[i]; i++) {
					if (i === 0) {
						if (checkVowel(item.name)) {
							markup += 'n';
						}
						markup += ' ';
					}
					markup += '<SPAN class="requestActions_link" objectID="' + item.id + '" style="color:blue;text-decoration:underline;">' + item.name + '</SPAN>'
					if (i < tileInfo.itemList.length - 2) {
						markup += ', '
					} else if (i === tileInfo.itemList.length - 2) {
						markup += ', and a '
					}
				}
				markup += '.'
			}
			markup += '<P>PLAYERS<P>';
			if (tileInfo.playerList.length) {
				markup += 'You see '
				for (var i = 0, plr; plr = tileInfo.playerList[i]; i++) {
					if (plr.id === player.id) {
						markup += '<SPAN class="requestActions_link" objectID="'+plr.id+'" style="color:blue;text-decoration:underline;">yourself</SPAN>'
					} else {
						markup += '<SPAN class="requestActions_link" objectID="'+plr.id+'" style="color:blue;text-decoration:underline;">' + plr.name + '</SPAN>'
					}
					if (i < tileInfo.playerList.length - 2) {
						markup += ', '
					} else if (i === tileInfo.playerList.length - 2) {
						markup += ', and '
					}
				}
				markup += '.'
			}
			$('#desc').html(markup);
		},
		drawSkills: function (skillInfo) {
			var markup = {
					'fight':	'<h2>Fight</h2><br>',
					'explore':	'<h2>Explore</h2><br>',
					'build':	'<h2>Build</h2><br>'		
				},
				type = '', skillName;
			for (var i = 0; i < skillInfo.length; i += 1) {
				skillName = skillInfo[i]['name'];
				type = skillInfo[i]['xpType'];
				markup[type] += '<span class="skill';
				console.log(player)
				if (player.skills[skillName]) {
					markup[type] += ' acquiredSkill'
				} else {
					var hasReq = true
					if (skillInfo[i]['req']) {
						for (var j = 0; j < skillInfo[i]['req'].length; j += 1) {
							console.log(skillInfo[i]['req'])
							console.log(skillInfo[i]['req'][j])
							console.log(j)
							if (!player.skills[skillInfo[i]['req'][j]]) {
								console.log('doesn"t have requirement');
								hasReq = false;
							}
						}
					}
					if (hasReq) {
						markup[type] += ' availableSkill';
					} else {
						markup[type] += ' lockedSkill';
					}
				}
				markup[type] +='">' + skillName + '</span><br>'
			}
			$('#skill_fight').html(markup['fight']);
			$('#skill_explore').html(markup['explore'])
			$('#skill_build').html(markup['build'])
			$('#skills').show();
		},
		drawClock: function (timeData) {
			var markup = '',
				bgColor = 'black';
			if (timeData.stage != timeStage) {
				timeStage = timeData.stage;
				switch (timeData.stage) {
					case 0:
						stageName = 'dawn'
						//bgColor = 'Khaki'
						bgColor ='#F5A636'
						break;
					case 1:
						stageName = 'morning'
						bgColor ='#FCE1CF'
						//bgColor = 'PowderBlue'
						break;
					case 2:
						stageName = 'afternoon'
						bgColor ='#CFE0FC'
						//bgColor = 'SkyBlue'
						break;
					case 3:
						stageName = 'dusk'
						bgColor ='#C7C5DC'
						//bgColor = 'Plum'
						break;
					case 4:
						stageName = 'evening'
						bgColor ='#3F3989'
						//bgColor = 'SlateBlue'
						break;
					case 5:
						stageName = 'night'
						bgColor ='#696969'
						//bgColor = 'SlateGray'
						break;				
				}
				$('body').animate({backgroundColor: bgColor}, 10000);
				//$('body').css('background-color', bgColor)
			}
			markup += stageName + ': ' + (-1 * (60 - (timeData.time * 3)));
		}
	}
}())