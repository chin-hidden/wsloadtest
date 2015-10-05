var expect = require('chai').expect;
var Task = require('../deps/task.js').Task;

describe('Task', function(){
    var task;
    var counter;
    var runner = function(){counter++;}

    beforeEach(function(){
        task = new Task();
        counter = 0;
    }),

    afterEach(function(){
        task.stop();
    });

    describe('new', function(){
        it('should initialize a new instance', function(){
            expect(task).to.not.be.null;
        });
    });

    describe('start', function(){
        it('should make it running', function(done){
            task.start(runner, 10);
            setTimeout(function() {
                expect(counter).to.be.at.least(5);
                expect(counter).to.be.at.most(6);
                done();
            }, 60);
        });

        it('should report error if task has exception', function(done){
            expect(task.errors).to.have.length(0);
            task.start(function(){
                throw 'error';
            }, 10);
            setTimeout(function(){
                expect(task.errors).to.have.length.of.at.least(5);
                done();
            }, 60);
        });

        it('should report error if task is already running' , function(){
            task.start(function(){}, 10);
            var fn = function(){task.start(function(){}, 10)}
            expect(fn).to.throw(Error);
        });
    });

    describe('stop', function(){
        it('should make it stopped', function(done){
            task.start(runner, 10);
            setTimeout(function() {
                task.stop();
            }, 5);
            setTimeout(function() {
                expect(counter).to.be.at.most(1);
                done();
            }, 50);
        });

        it('should be able to run a new task after stop', function(){
            var emptyFn = function(){};
            task.start(emptyFn, 10);
            task.stop();
            var fn = function(){
                task.start(emptyFn, 10);
            };
            expect(fn).to.not.throw(Error);
        });
    });

});
