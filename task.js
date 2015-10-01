var Task = function() {
    this.errors = [];
};

Task.prototype = {
    start: function(runner, interval) {
        var self = this;
        if(self.timeout_id){
            throw new Error('Task is already running');
        }
        var timer = function() {
            try {
                runner();
            } catch(e) {
                self.errors.push(e);
            }
            self.timeout_id = setTimeout(function() {
                timer();
            }, interval);
        };
        timer();
    },

    stop: function() {
        clearTimeout(this.timeout_id);
        delete this.timeout_id;
    }

};

module.exports = {
    Task: Task
};

