(function () {
    
    var _that;

    var Home = function ( block, requestParams, customData ) {
        this.block = block;
        _that = this;
        console.log(1);
        //TRL.Page.Title.set('#SomosInspirados - TRIAL');
    };

    Home.prototype = {
        render: function () {
            console.log(1);
            this.block.findElement('test').onclick = function () {
                console.log(typeof _that.block.__template.args, _that.block.__template.args);
                console.log(_that.block.__template.args);
                console.log(_that.block.__template.args.api);
                console.log(_that.block.__template.args.loading);
                _that.block.render({
                    cel: 12875298919
                });
                console.log(2);
            };
        }
    };

    window.Home = Home;

})();