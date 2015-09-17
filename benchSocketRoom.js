// This bench testing how SocketRoom manage large number of clients
// and large number of key
var Benchmark = require('benchmark');

var CLIENT_COUNT = 1000;
var KEY_COUNT = 1000;
var ITER_COUNT = 100;

var SocketRoom = require('../src/socket/SocketRooms.js');
var socketRoom = new SocketRoom({
    routingKey: 'code',
    name: 'STOCK'
});

function clientDouble(){
    return {
        emit: function(){
            // do nothing
        },
    }
}

for(var i=0; i<CLIENT_COUNT; i++){
    for(var key=0; key<ITER_COUNT; key++){
        socketRoom.add(clientDouble(), 'a' + key);
    }
}

function addRemove(){
    var client = clientDouble();
    socketRoom.add(client, 0);
    socketRoom.remove(client, 0);
}

function emitRoom(){
    socketRoom.emitRoom('a', 'test event', 'some message');
}

function publish(){
    socketRoom.publish('test event', 'some message');
}

var simpleArrays = [];
var simpleRoom = {
    'public': []
}

for(var i=0; i < CLIENT_COUNT; i++){
    simpleArrays.push(clientDouble());
}

var suite = new Benchmark.Suite;
//suite.add('Add remove clients', function(){
    //addRemove();
//})
suite.add('Emit to all clients in a room', function(){
    socketRoom.emitRoom('a0', 'test event', 'some message');
})
.add('Simple array iteration', function(){
    for(var i=0; i<simpleArrays.length; i++){
        simpleArrays[i].emit();
   }
})
//.add('Publish all', function(){
    //publish();
//})
.on('cycle', function(event){
    console.log(String(event.target));
})
 .run({'async': true});
