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

## Master & Agent Client
These clients are indeed http webserver and connect to the target server based on commands from http requests.

### Agents
```
curl http://127.0.0.1:8082/swarm/_start?host=#{host}&ccu=#{ccu}
```
Create a swarm of connections to the target server:

  - `host`: target server, including protocol, host, uri for websocket connections (https://priceservice.vndirect.com.vn/realtime by default)
  - `ccu`: swarm size

Subsequent commands will stop & release running swarm

```
curl http://127.0.0.1:8082/swarm/_stop
```
Stop & release the swarm

```
curl http://127.0.0.1:8082/swarm/_ping
```
Issue the swarm to ping the target server, message: `{"type":"ping"}`

```
curl http://127.0.0.1:8082/swarm/_stats
```
Fetch the swarm stats (size indeed)

```
curl http://127.0.0.1:8082/reports
```
Fetch reports of previous pings (with min, max, mean round trip time, number of timeout messages)

```
curl http://127.0.0.1:8082/reports/_flush
```
Wipe all reports

### Master
Agents are currently hard-coded in `agents` variable.

```
curl http://127.0.0.1:8083/agents/_start?host=#{host}&ccu=#{ccu}
```
Command agents to connect to the target server:

  - `host`: target server, including protocol, host, uri for websocket connections (https://priceservice.vndirect.com.vn/realtime by default)
  - `ccu`: swarm size of each agent

```
curl http://127.0.0.1:8083/agents/_stop
```
Stop & release all running connections in agents

```
curl http://127.0.0.1:8083/agents/_ping?hits=#{hits}&tick=#{tick}
```
Issue agents to ping the target server:

  - `hits`: number of ping messages to make
  - `tick`: time gap (in ms) between pings

```
curl http://127.0.0.1:8083/agents
```
List all agents

```
curl http://127.0.0.1:8083/agents/_stats
```
Fetch stats of all agents: swarm size in each alive agent, number of dead/alive agents

```
curl http://127.0.0.1:8083/reports
```
Fetch raw reports from all agents

```
curl http://127.0.0.1:8083/reports/_brief
```
Fetch reports from all agents & merge them into a single report

```
curl http://127.0.0.1:8083/reports/_flush
```
Issue all agents to wipe their accumulated reports

```
curl http://127.0.0.1:8083/host/_broadcast?host=#{host}&hits=#{hits}&tick=#{tick}
```
Send a request for broadcast to the target server
This request only works with priceservice due to its dependency to the Socket API (message: `{"type":"loadTest","data":"..."}`)

  - `host`: target server
  - `hits`: number of messages to be broadcasted
  - `tick`: time gap (in ms) between requests
