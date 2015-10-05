/**
 * this is not a spec indeed
 * just to test some behavior of (group) defer with error
 */

var expect = require('chai').expect;
var deferred = require('deferred');

describe('group defer', function() {
  var ok_defer, nok_defer, error_defer;

  before(function() {
    ok_defer = function(i) {
      i = typeof i !== 'undefined' ? i : 1;
      var defer = deferred();
      process.nextTick(function() {
        defer.resolve(i);
      });
      return defer.promise;
    };

    nok_defer = function(i) {
      i = typeof i !== 'undefined' ? i : 2;
      var defer = deferred();
      process.nextTick(function() {
        defer.reject(i);
      });
      return defer.promise;
    };
  });

  describe('when all component defers are resolved', function(done) {

    it('should be triggered with done fn', function(done) {
      var defer1 = ok_defer();
      var defer2 = ok_defer();

      deferred(defer1, defer2).done(function(i) {
        done();
      }, function(i) {
        expect.fail();
      });
    });

    it('should be triggered with done fn with argument as single object when only 1 defer involves', function(done) {
      var defer1 = ok_defer();

      deferred(defer1).done(function(i) {
        expect(i).to.be.equal(1);
        done();
      }, function(i) {
        expect.fail();
      });
    });

    it('should be triggered with done fn with argument as array when many defers involve', function(done) {
      var defer1 = ok_defer();
      var defer2 = ok_defer();

      deferred(defer1, defer2).done(function(i) {
        expect(i).to.be.a('array');
        expect(i).to.include(1);
        done();
      }, function(i) {
        expect.fail();
      });
    });
  });

  describe('when some component defers are rejected', function(done) {
    it('should be triggered with failed fn', function(done) {
      var defer1 = ok_defer();
      var defer2 = nok_defer();

      deferred(defer1, defer2).done(function(i) {
        expect.fail();
      }, function(i) {
        expect(i).to.be.equal(2);
        done();
      });
    });

    it('should be triggered with 1 arg in failed fn even when many rejects occured', function(done) {
      var defer1 = nok_defer();
      var defer2 = nok_defer(3);

      deferred(defer1, defer2).done(function(i) {
        expect.fail();
      }, function(i) {
        expect(i).to.be.equal(2);
        done();
      });
    });
  });

  describe('when exception is thrown inside any component defers', function(done) {
    it('could still handle it in fail fn', function(done) {
      var defer1 = ok_defer();
      var defer2 = ok_defer()(function() {
        throw 'shit happened';
      });

      deferred(defer1, defer2).done(function() {
        expect.fail();
      }, function(e) {
        expect(e).to.match(/shit/);
        done();
      });
    });

    it('could still handle it in fail fn even with apply style', function(done) {
      var defer1 = ok_defer();
      var defer2 = ok_defer()(function() {
        throw 'shit happened';
      });

      deferred.apply(null, [defer1, defer2]).done(function() {
        expect.fail();
      }, function(e) {
        expect(e).to.match(/shit/);
        done();
      });
    });
  });
});
