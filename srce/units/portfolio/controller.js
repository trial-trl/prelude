(function () {
    
    var _that;

    var _search,
        _gallery;

    var Portfolio = function ( block, requestParams, customData ) {
        this.block = block;
        _that = this;
    };

    Portfolio.prototype = {
        render: function () {
            console.log(348932);
            //_gallery = this.block.findElement('icons');
        }
    };

    window.Portfolio = Portfolio;

})();