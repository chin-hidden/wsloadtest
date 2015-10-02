var expect = require('chai').expect;
var report_processor = require('../deps/report_processor');
var _ = require('underscore');

describe('report_processor', function() {
  describe('gen_empty', function() {
    var report;
    beforeEach(function() {
      report = report_processor.gen_empty();
    });

    it('should create a new object', function() {
      expect(report).to.be.an('object');
    });

    it('should create a new object with no_received as 0', function() {
      expect(report.no_received).to.be.equal(0);
    });

    it('should create a new object with no_timeout as 0', function() {
      expect(report.no_timeout).to.be.equal(0);
    });

    it('should create a new object with min_rtt as null', function() {
      expect(report.min_rtt).to.be.null;
    });

    it('should create a new object with max_rtt as null', function() {
      expect(report.max_rtt).to.be.null;
    });

    it('should create a new object with mean_rtt as null', function() {
      expect(report.mean_rtt).to.be.null;
    });

    it('should create a new object with agents as an empty array', function() {
      expect(report.agents).to.be.an('array');
      expect(report.agents).to.be.empty;
    });
  });

  describe('sum', function() {
    var result, r1, r2;

    beforeEach(function() {
      r1 = report_processor.gen_empty();
      r2 = report_processor.gen_empty();
    })

    it('should create a new object with report structure', function() {
      result = report_processor.sum(r1, r2);
      expect(result).to.be.an('object');
      expect(result).to.have.all.keys('no_received', 'no_timeout', 'min_rtt', 'max_rtt', 'mean_rtt', 'agents');
    });

    describe('when r1 is empty', function() {
      it('should be identical to r2', function() {
        r2.no_received = 2;
        r2.no_timeout = 0;
        r2.min_rtt = 1;
        r2.max_rtt = 2;
        r2.mean_rtt = .5;
        r2.agents = ['abc'];

        result = report_processor.sum(r1, r2);
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

        result = report_processor.sum(r1, r2);
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

        result = report_processor.sum(r1, r2);
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
        result = report_processor.sum(r1, r2);

        expect(result.agents).to.include.members(r1.agents);
        expect(result.agents).to.include.members(r2.agents);
      });
    });
  });
});
