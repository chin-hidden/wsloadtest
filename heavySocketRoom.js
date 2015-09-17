
var CLIENT_COUNT = 1000;
var KEY_COUNT = 1000;
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
    for(var key=0; key<KEY_COUNT; key++){
        socketRoom.add(clientDouble(), key);
    }
}

setInterval(function(){
    socketRoom.emitRoom(0, 'test event', 'some message');
},1);
