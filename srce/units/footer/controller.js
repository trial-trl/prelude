(function () {
    
    var _that;

    var Footer = function ( block, requestParams, customData ) {
        this.block = block;
        _that = this;
    };

    Footer.prototype = {
        init: function () {
            var year = this.block.findElement('year');
            year.innerHTML = new Date().getFullYear();
        }
    };

    window.Footer = Footer;

})();