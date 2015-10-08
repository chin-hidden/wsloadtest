var expect = require('chai').expect;
var _ = require('underscore');

var PingReport = require('../deps/report').PingReport;
var BroadcastReport = require('../deps/report').BroadcastReport;

describe('PingReport', function() {
  describe('new', function() {
    describe('with no argument', function() {
      var report;
      beforeEach(function() {
        report = new PingReport();
      });

      it('should create a new PingReport instance', function() {
        expect(report).to.be.instanceof(PingReport);
      });

      it('should create a new object with no_received as 0', function() {
        expect(report.no_received).to.be.equal(0);
      });

      it('should create a new object with no_timeout as 0', function() {
        expect(report.no_timeout).to.be.equal(0);
      });

      it('should create a new object with min_rtt as Inf', function() {
        expect(report.min_rtt).to.be.equal(Infinity);
      });

      it('should create a new object with max_rtt as -Inf', function() {
        expect(report.max_rtt).to.be.equal(-Infinity);
      });

      it('should create a new object with mean_rtt as null', function() {
        expect(report.mean_rtt).to.be.null;
      });

      it('should create a new object with agents as an empty array', function() {
        expect(report.agents).to.be.an('array');
        expect(report.agents).to.be.empty;
      });
    });

    describe('with object as argument', function() {
      var report, seed;
      beforeEach(function() {
        seed = {no_received: 100, no_timeout: 50, min_rtt: 0, max_rtt: 0, mean_rtt: 0, agents: ['abc']};
        report = new PingReport(seed);
      });

      it('should create a new object & copy values from the argument', function() {
        expect(report.no_received).to.be.equal(seed.no_received);
        expect(report.no_timeout).to.be.equal(seed.no_timeout);
        expect(report.min_rtt).to.be.equal(seed.min_rtt);
        expect(report.max_rtt).to.be.equal(seed.max_rtt);
        expect(report.mean_rtt).to.be.equal(seed.mean_rtt);
        expect(report.agents).to.include.members(seed.agents);
      });
    });
  });

  describe('sum', function() {
    var result, r1, r2;

    beforeEach(function() {
      r1 = new PingReport();
      r2 = new PingReport();
    })

    it('should create a new PingReport instance', function() {
      result = r1.sum(r2);
      expect(result).to.be.instanceof(PingReport);
    });

    describe('when r1 is empty', function() {
      it('should be identical to r2', function() {
        r2.no_received = 2;
        r2.no_timeout = 0;
        r2.min_rtt = 1;
        r2.max_rtt = 2;
        r2.mean_rtt = .5;
        r2.agents = ['abc'];

        result = r1.sum(r2);
        _.each(r2, function(v, k) {
          if (k === 'agents') {
            return;
          }
          expect(result[k]).to.be.equal(v);
        });
      });
    });

    describe('when r2 is empty', function() {
      it('should be identical to r1', function() {
        r1.no_received = 2;
        r1.no_timeout = 0;
        r1.min_rtt = 1;
        r1.max_rtt = 2;
        r1.mean_rtt = .5;
        r1.agents = ['abc'];

        result = r1.sum(r2);
        _.each(r1, function(v, k) {
          if (k === 'agents') {
            return;
          }
          expect(result[k]).to.be.equal(v);
        });
      });
    });

    describe('when both r1 & r2 are not empty', function() {
      beforeEach(function() {
        r1.no_received = 2;
        r1.no_timeout = 0;
        r1.min_rtt = 1;
        r1.max_rtt = 2;
        r1.mean_rtt = .5;
        r1.agents = ['abc'];

        r2.no_received = 3;
        r2.no_timeout = 2;
        r2.min_rtt = 0;
        r2.max_rtt = 5;
        r2.mean_rtt = 3;
        r2.agents = ['def'];

        result = r1.sum(r2);
      });

      it('should have no_received as total from r1 & r2', function() {
        expect(result.no_received).to.be.equal(r1.no_received + r2.no_received);
      });

      it('should have no_timeout as total from r1 & r2', function() {
        expect(result.no_timeout).to.be.equal(r1.no_timeout + r2.no_timeout);
      });

      it('should have min_rtt as min value from rtts of r1 & r2', function() {
        expect(result.min_rtt).to.be.equal(Math.min(r1.min_rtt, r2.min_rtt));
      });

      it('should have max_rtt as max value from rtts of r1 & r2', function() {
        expect(result.max_rtt).to.be.equal(Math.max(r1.max_rtt, r2.max_rtt));
      });

      it('should have mean_rtt composed from rtts of r1 & r2', function() {
        var expected = (r1.mean_rtt * r1.no_received + r2.mean_rtt * r2.no_received) / (r1.no_received + r2.no_received);
        expect(result.mean_rtt).to.be.equal(expected);
      });

      it('should have agents combined from both', function() {
        r2.agents = ['abc', 'def'];
        result = r1.sum(r2);

        expect(result.agents).to.include.members(r1.agents);
        expect(result.agents).to.include.members(r2.agents);
      });
    });
  });

  describe('to_json', function() {
    var report = new PingReport();
    var json = report.to_json();

    it('should create an object with keys from the report instance', function() {
      expect(json).to.have.all.keys('no_received', 'no_timeout', 'min_rtt', 'max_rtt', 'mean_rtt', 'agents');
    });
  });
});

describe('BroadcastReport', function() {
  describe('new', function() {
    describe('with no argument', function() {
      var report;
      beforeEach(function() {
        report = new BroadcastReport();
      });

      it('should create a new PingReport instance', function() {
        expect(report).to.be.instanceof(BroadcastReport);
      });

      it('should create a new object with no_expected as 0', function() {
        expect(report.no_expected).to.be.equal(0);
      });

      it('should create a new object with no_received as 0', function() {
        expect(report.no_received).to.be.equal(0);
      });

      it('should create a new object with agents as an empty array', function() {
        expect(report.agents).to.be.an('array');
        expect(report.agents).to.be.empty;
      });
    });

    describe('with object as argument', function() {
      var report, seed;
      beforeEach(function() {
        seed = {no_received: 100, no_expected: 150, agents: ['abc']};
        report = new BroadcastReport(seed);
      });

      it('should create a new object & copy values from the argument', function() {
        expect(report.no_expected).to.be.equal(seed.no_expected);
        expect(report.no_received).to.be.equal(seed.no_received);
        expect(report.agents).to.include.members(seed.agents);
      });
    });
  });

  describe('sum', function() {
    var result, r1, r2;

    before(function() {
      r1 = new BroadcastReport();
      r2 = new BroadcastReport();

      r1.no_expected = 100;
      r1.no_received = 50;

      r2.no_expected = 200;
      r2.no_received = 125;

      result = r1.sum(r2);
    });

    it('should create a new BroadcastReport instance', function() {
      expect(result).to.be.instanceof(BroadcastReport);
    });

    it('should create instance with no_expected as sum from r1 & r2\'s', function() {
      expect(result.no_expected).to.be.equal(r1.no_expected + r2.no_expected);
    });

    it('should create instance with no_received as sum from r1 & r2\'s', function() {
      expect(result.no_received).to.be.equal(r1.no_received + r2.no_received);
    });

    it('should create instance with agents composed from r1 & r2\'s', function() {
      expect(result.agents).to.include.members(r1.agents);
      expect(result.agents).to.include.members(r2.agents);
    });
  });

  describe('to_json', function() {
    var report = new BroadcastReport();
    var json = report.to_json();

    it('should create an object with keys from the report instance', function() {
      expect(json).to.have.all.keys('no_received', 'no_expected', 'agents');
    });
  });
});
