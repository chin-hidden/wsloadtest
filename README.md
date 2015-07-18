SockJS-node Echo example
========================

To run this example, first install dependencies:

    npm install


Sever
========================
And run a server, this server will broadcast 20 message/s for any connected client:

    node server.js

That will spawn an http server at http://127.0.0.1:9999/ which will
serve both html (served from the current directory) and also SockJS
server (under the [/echo](http://127.0.0.1:9999/echo) path).

Client
========================
For testing, edit var HOST & CLIENT_NUMBER
    node client.js

That will create x number of client and connect to our target server

