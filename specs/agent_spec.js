var expect = require('chai').expect;
var Agent = require('../deps/agent').Agent;

describe('Agent', function() {
  var agent;
  beforeEach(function() {
    agent = new Agent();
  });

  describe('new', function() {
    it('should create a new instance', function() {
      expect(agent).to.be.an.instanceof(Agent);
      expect(agent).to.respondTo('swarm_size');
    });
  });

  // TODO stub & test
  describe('setup_ping', function() {

  });
});
