//initialize variables
var w;//width of screen
var h;//height of screen
var box;//screen variable
var danceOption; //option menu for dance moves 
var imgmap = {}; //map for source of images
var tail; //queue box for move 
var trashcan; //trashcan variable 

//implementation variables
var posmap; //hashtable for position of map 
var idMap; //hashtable for mapping unique id to sticker in the tail 
var result = []; //result queue  
var itemCart = []; //array for added items
var barX; //original bar position 

//Ros stuff
var ros;
var topic; 

//logic variables
var show = false; //boolean for showing options or not
var play = false; //boolean for playing or not

var timeOnBox = 3000; //time spent on each box in milisecond
var timeOnAnim = 3.0; //time spent on each animation on each box

var tCloseSrc = "musicImg/trashcanclose.png";
var tOpenSrc = "musicImg/trashcanopen.png";

var idCounter = 0; //unique id for each counter 



window.onload = prepare;

function prepare(){
	w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0); //get the maximum  width on tablet
	h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0); //get the maximum height on tablet

	//show big the screen is 
	box = document.getElementById("screen");
    box.style.width = w - 30;
    box.style.height = h - 30;

    //instantiation
    posmap = new Hashtable();
    idMap = new Hashtable();

	//disable the scroll of the page on the tablet
	document.body.addEventListener('touchmove', function(e){ e.preventDefault(); }); 
	
	//hide all the items inside the option in the beginning 
	danceOption = document.getElementById("doption");
	childs = danceOption.childNodes;
	updateMap();
	showContent();

	//setting up animation for the menu
    YUI().use('anim', function(Y) {
	    var anim = new Y.Anim({
	        node: '#doption',
	        to: { height: 0, width: 0 },
	        easing: 'backIn'
	    });

	    var anim1 = new Y.Anim({
	        node: '#doption',
	        to: { height: 700, width: 300 },
	        easing: 'backOut'
	    }); 

	    var bar = Y.one('#bar');
	    barX = bar.getX();

	    var onClick = function(e) {
	        e.preventDefault();
	        if (show){ 
	        	//closing
	        	show = false;
	        	anim.run();
	        	showContent();
	        }
	        else{
	        	//opening;
	        	show = true;
	        	setTimeout(function(){
  					showContent();
				}, 1000); 
	        	anim1.run();
	        }
	        
	    };
	    Y.one('#dance').on('click', onClick);

	});

	YUI().use('dd-delegate', 'dd-drop-plugin', function(Y){
		//making the new stickers draggable
		var del = new Y.DD.Delegate({
			container: '#screen',
			nodes: '.pagesticker'
		});

		tail = Y.one('#tail');

		//adding drop listener to the box
		var drop = Y.one('#tail').plug(Y.Plugin.Drop);
		drop.drop.on('drop:hit', function(e) {
    		var object = e.drag.get('node');
    		var pos =  e.drag.get('node').getX();
    		posmap.put(pos, object);
    		object.setY(110);
    		console.log("Added: " + pos + " , " + object.get('id'));

    		var uniqueID = object.get('title');
    		idMap.put(uniqueID, pos);

		});

		//adding drop listener to the outside of the box 
		
		del.on('drag:drag', function(e) {

    		var object = e.target.get('node');
			//console.log(e.target.get('node').get('id'));
			var uniqueID = object.get('title');
			if (idMap.containsKey(uniqueID)){
				var pos = idMap.get(uniqueID);
				posmap.remove(pos);
				idMap.remove(uniqueID);
				console.log("Deleted: " + pos + " , " + object.get('id'));
			}
			
			
		});

		//adding drop listener to the trashcan
		var drop0 = Y.one('#trashcan').plug(Y.Plugin.Drop);
		drop0.drop.on('drop:hit', function(e){
			var object = e.drag.get('node');
			//console.log(object.get('id'));
			var uniqueID = object.get('title');
			//var pos = idMap.get(uniqueID);

			//posmap.remove(pos);
			//idMap.remove(uniqueID);
			//console.log("Deleted: " + pos + " , " + object.get('id'));
			object.remove(false);
			var imgNode = Y.one('#trashcan');
			imgNode.set('src', tCloseSrc);

		});

		//adding drag enter listener to the trashcan
		var drop1 = Y.one('#trashcan').plug(Y.Plugin.Drop);
		drop1.drop.on('drop:enter', function(e){
			var imgNode = Y.one('#trashcan');
			imgNode.set('src', tOpenSrc);
		});

		//adding drag exit listener to the trashcan
		var drop2 = Y.one('#trashcan').plug(Y.Plugin.Drop);
		drop2.drop.on('drop:exit', function(e){
			var imgNode = Y.one('#trashcan');
			imgNode.set('src', tCloseSrc);
		});

	});

	connectRos();

}

function connectRos(){
	//connecting to ROS
    ros = new ROSLIB.Ros({
        
        url : 'ws://192.168.7.70:9090'
        //url : 'ws://localhost:9090'
    });

    ros.on('connection', function(){
        console.log('Connected to websocket server.');
    });

    ros.on('error', function(error){
        console.log('Error connecting to websocket server: ', error);
    });

    ros.on('close', function() {
        console.log('Connection to websocket server closed.');
    });
    
    //publishing a topic
    topic = new ROSLIB.Topic({ //creating topic
        ros: ros, 
        name : '/Actions',
        messageType : 'std_msgs/String'
    });

    var message = new ROSLIB.Message({
        data: "Connected"
    });
    topic.publish(message);

    //subscribing to the topic 
    //doing something when it receives something 
    /*
    topic.subscribe(function(message){
        console.log('Received message on ' + topic.name + ': ' + message.data);
        topic.unsubscribe();
    });
	*/
}

function sendMessage(message){
	var result = "Sent:" + message;

	var rosMessage = new ROSLIB.Message({
        data: result
    });

    topic.publish(rosMessage);
}

function printMap(){

	resetBar();
	var names = posmap.keys();

	if (names.length == 0){
		//console.log("Empty!!");
		return;
	}
	play = true;
	
	names.sort();
	for (var i = 0; i < names.length; i++){
		console.log( names[i] + ": " + posmap.get(names[i]).get('id') );
		//posmap.get(names[0]).setX(500);
		//posmap.get(names[1]).setX(580);
	}

	var length = 500 + ((names.length - 1) * 85);

	var names1 = []; //copy of names 

	while (names.length != 0){
		var item = names.pop();
		names1.unshift(posmap.get(item).get('id')  );
		//console.log("Length: " + length);
		YUI().use('anim', function(Y) {
		    var anim = new Y.Anim({
		        node: posmap.get(item) ,
		        duration: 2.0,
		        easing: Y.Easing.backBoth
		    });

	        anim.set('to', { xy: [length, 110] });
	        anim.run();
		});
		length = length - 85;
	}
	//console.log("Size: " + names1.length)
	setTimeout(function() { playMove(names1, play); }, timeOnBox);


	
}

function playMove(array, pSignal){

	if (play && array.length != 0){
		var queue = array;
		var item = queue.shift();

		var word = "Sent:" + item;
		sendMessage(word);
		console.log("Sent message: " + word);

		YUI().use('anim', function(Y){

			var bar = Y.one('#bar');

			var anim = new Y.Anim({
				node: bar,
				duration: timeOnAnim,
				easing: Y.Easing.easeIn
			});

			anim.set('to', {xy: [ (bar.getX() + 85) , bar.getY()]});
			if (play){
				anim.run();
			}
			else{
				console.log("stop signal");
				anim.stop();
				return;
			}
			
		});

		setTimeout(function() {
		    playMove(queue, pSignal);
		}, timeOnBox + 50);

	}
	
}

function stopAnim(){
	play = false;
	console.log("Play is falses");
}

function addToTail(item){
	tail.appendChild(item);
}

function updateMap(){
	for (var i = 0; i < childs.length; i++){
    	if (childs[i].nodeName != "#text"){
    		//console.log(childs[i].nodeName);
    		var source = "musicImg/";
    		source += childs[i].id + ".png";
    		imgmap[childs[i].id] = source;
    	}
    }
}

function showContent(){
    for (var i = 0; i < childs.length; i++){
    	
    	if (childs[i].nodeName != "#text"){
    		//console.log(childs[i].nodeName);
    		if (show){ //menu is open
    			childs[i].style.visibility = 'visible';
    		}
    		else{
    			childs[i].style.visibility = 'hidden';
    		}
    		
    	}
    	
    }
}

function reset(){
	posmap.clear();
	idMap.clear();

	for (var i = 0; i < itemCart.length; i++){
		itemCart[i].parentNode.removeChild(itemCart[i]);
	}

	resetBar();

}

function trashcanOpen(){

}

function resetBar(){
	YUI().use('anim', function(Y){

		var bar = Y.one('#bar');

		var anim = new Y.Anim({
			node: bar,
			duration: 1.0,
			easing: Y.Easing.easeIn
		});

		anim.set('to', {xy: [ barX , bar.getY()]});
		anim.run();
			
	});
}

function addSticker(sticker){
	var item = sticker;

	var image = document.createElement('img');
	image.setAttribute('id', item.id);
	image.setAttribute('class', 'pagesticker');
	image.setAttribute('src', imgmap[item.id]);
	image.setAttribute('title', idCounter);
	image.style.top = h/2 + "px";
	image.style.left = w/2 + "px";
	
	box.appendChild(image);

	itemCart.push(image);

	idCounter = idCounter + 1;
}

function delay(ms) {
	ms += new Date().getTime();
	while (new Date() < ms){}
} 

function moveBar(){
	play = true;

	clearQueue(); //clear Queue
	sortQueue(); //sort Queue
	
	for (var i = 0; i < playQ.length; i++){ //iterate through the boxes on the website
		
		if (play == false){
			break;
		}

		var info = "";

		info += (playQ[i].id);

		console.log("Sent: " + info);


		var message = new ROSLIB.Message({
        	data: info
    	});
    	topic.publish(message);

		delay(timeOnBox);    	
	}	
}








