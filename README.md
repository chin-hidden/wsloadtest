SockJS-node Echo example
========================

To run this example, first install dependencies:

    npm install


Sever
========================
Edit var PORT in server.js for listening port.
After that to run a server, this server will broadcast 20 message/s for any connected client:

    node server.js

That will spawn an http server at http://127.0.0.1:9999/ which will
serve both html (served from the current directory) and also SockJS
server (under the [/echo](http://127.0.0.1:9999/echo) path). Any client connects to this server will receive 20 message/s from the server.

Client
========================
For testing, edit var HOST & CLIENT_NUMBER
    node client.js

That will create x number of client and connect to our target server.

## Lazy Client
This client simply create a number of connection to the server

Arguments:
    --ccu   Number of concurrent connection
    --host  URL of the host
E.g:
node lazy_client.js --ccu 1000 --host "http://localhost:8080/echo"

