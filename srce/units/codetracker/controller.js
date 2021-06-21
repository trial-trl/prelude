(function () {
    
    var _that;

    var _clients,
        _projects,
        _repos,
        _codelines;

    var Codetracker = function ( block, requestParams, customData ) {
        this.block = block;
        _that = this;
    };

    Codetracker.prototype = {
        init: function () {
            _clients = this.block.findElement('clients');
            _projects = this.block.findElement('projects');
            _repos = this.block.findElement('repos');
            _codelines = this.block.findElement('codelines');
            TRL.ajax(null, function (code) {
                _clients.innerHTML = 20;
                _projects.innerHTML = 20;
                _repos.innerHTML = _roundStats(code.repositories);
                _codelines.innerHTML = _roundStats(code.util);
            }, function (e) {
                alert(e);
            }).to('https://op.trialent.com/repo/v1.0/repositories/count', 'GET');
        }
    };

    // Code from https://stackoverflow.com/questions/12900332/how-do-i-round-millions-and-thousands-in-javascript/16950661
    function _roundStats(num) {
        // Nine Zeroes for Billions
        return Math.abs(Number(num)) >= 1.0e+9
            ? Math.round(Math.abs(Number(num)) / 1.0e+9 ) + "B"
            // Six Zeroes for Millions
            : Math.abs(Number(num)) >= 1.0e+6
                ? Math.round(Math.abs(Number(num)) / 1.0e+6 ) + "M"
                // Three Zeroes for Thousands
                : Math.abs(Number(num)) >= 1.0e+3
                    ? Math.round(Math.abs(Number(num)) / 1.0e+3 ) + "K"
                    : Math.abs(Number(num)); 
    }

    window.Codetracker = Codetracker;

})();