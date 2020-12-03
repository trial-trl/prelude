h={
    title: "Treinamentos e capacitações",
    loads: "puzzle",
    data: "{API}/categories"
}
(function (block, requestParams, customData) {
       
    var _that = this;

    TRL.Home.prototype = {
        init: function () {
            new T.MVC.Block( 'puzzle', {
                template: {
                    extension: 'pug.js',
                    mimeType: 'application/javascript'
                },
                into: _that.block.findElement('puzzle-interaction'),
                onparsetemplate: function () {
                    return Pug.blocks[this.__blockName]( this.__template.args );
                },
                oninitialize: function () {
                }
            } );
        }
    };


    return TRL;

})