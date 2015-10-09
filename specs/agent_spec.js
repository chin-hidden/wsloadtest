var expect = require('chai').expect;
var sinon = require('sinon');

var ws = require('../deps/ws');
var Agent = require('../deps/agent').Agent;

describe('Agent', function() {
  var agent, conn;
  beforeEach(function() {
    agent = new Agent();
  });

  describe('new', function() {
    it('should create a new instance', function() {
      expect(agent).to.be.an.instanceof(Agent);
      expect(agent).to.respondTo('swarm_size');
    });
  });

  describe('start', function() {
    var stub;

    afterEach(function() {
      if (stub) {
        stub.restore();
      }
    });

    it('create a swarm with ws & update its swarm when done', function(done) {
      stub = sinon.stub(ws, 'create_conn_swarm', function(host, count, tick) {
        var def = require('deferred')();
        def.resolve([{id: 1}, {id: 2}]);
        return def.promise;
      });

      agent.start('host', 2, 50).done(function() {
        expect(agent.swarm).to.have.length(2);
        done();
      });
    });
  });

  describe('stop', function() {
    var spy;
    beforeEach(function() {
      conn = {
        close: function() {}
      };
    });

    afterEach(function() {
      if (spy) {
        spy.restore();
      }
    });

    it('triggers close in all connections in the swarm', function() {
      agent.swarm = [conn, conn, conn];
      spy = sinon.spy(conn, 'close');

      agent.stop();
      expect(conn.close.callCount).to.be.equal(3);
    });

    it('cleans up its swarm', function() {
      agent.swarm = [conn];

      agent.stop();
      expect(agent.swarm).to.be.empty;
    })
  });

  describe('swarm_size', function() {
    beforeEach(function() {
      conn = {};
    });

    it('counts the number of connections', function() {
      agent.swarm = [conn, conn];

      expect(agent.swarm_size()).to.be.equal(2);
    });

    it('ignores falsy connections', function() {
      agent.swarm = [conn, conn];
      delete agent.swarm[1];

      expect(agent.swarm_size()).to.be.equal(1);
    });
  });

  describe('setup_ping', function() {
    beforeEach(function() {
      conn = {};
      agent.swarm = [conn];
    });

    it('has ping stats updated when a connection receives a message', function() {
      var msg = JSON.stringify({type: 'pong', data: 'abc'});
      var event = {data: msg};

      agent.setup_ping();
      agent.ping_stats.abc = {};
      conn.onmessage(event);

      expect(agent.ping_stats.abc).to.have.key('received_at');
      expect(agent.ping_stats.abc.received_at).to.be.a('number');
    });

    it('cleans up previous ping stats', function() {
      agent.ping_stats = {
        '1.1643012': {
          sent_at: 185234120,
          received_at: 1205129912
        }
      };

      agent.setup_ping();

      expect(agent.ping_stats).to.be.empty;
    });
  });
  // TODO stub & test
});
