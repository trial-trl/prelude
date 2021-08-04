window.T = (function (T) {

    var Unit = function (type, into, inject) {
        if (typeof type !== 'string') {
            throw new TypeError();
        }

        console.log('unit.type', type);

        this.dependencies = [];
        this.loaded = false;
        this.isDependenciesLoaded = false;
        
        var t = type.split(':')

        this.type = t[0];

        if (t[1]) {
            this.key = t[1];
        }

        if (typeof this.key !== 'number') {
            this.key = 0;
        }

        this.root = into;
        console.log(into.dataset.unit, this.type);
        if (into.dataset.unit === this.type) {
            this.loaded = this.root.children.length > 0;
            console.log('unit.loaded', this.loaded);
        } else {
            this.root.innerHTML = null;

            if (into.hasAttribute('data-unit')) {
                into.dataset.unit = this.type;
            }
        }
    };

    Unit.prototype.isLoaded = function () {
        return this.loaded;
    };

    Unit.prototype.getRoot = function () {
        return this.root;
    };

    Unit.prototype.getKey = function () {
        return this.key;
    };

    Unit.prototype.getType = function () {
        return this.type;
    };

    Unit.prototype.getTypePascalCaseStyle = function () {
        var camel = this.getTypeCamelCaseStyle();
        return camel.charAt(0).toUpperCase() + camel.slice(1);
    }

    Unit.prototype.getTypeCamelCaseStyle = function () {
        return this.type.replace(/^([A-Z])|[\s-_](\w)/g, function (match, p1, p2) {
            if (p2) return p2.toUpperCase();

            return p1.toLowerCase();
        });
    }

    Unit.prototype.getDeclaration = function () {
        return window.app.units[this.type];
    };

    Unit.prototype.getName = function () {
        return this.type + ':' + this.key;
    };

    Unit.prototype.getController = function () {
        return window.app.units[this.type].location + '/controller.js';
    };

    Unit.prototype.getTemplate = function () {
        return window.app.units[this.type].location + '/template.' + (this.getDeclaration().template === 'php' ? 'php' : 'js');
    };

    Unit.prototype.getStyle = function () {
        return window.app.units[this.type].location + '/style.css';
    };

    Unit.prototype.render = function (requestParams, customData) {
        var that = this;

        console.log('mvc.unit', this.unit);
        if (!this.unit) {
            var config = {
                onparsetemplate: function () {
                    console.log({
                        params: this.__template.args.params || {},
                        api: this.__template.args.api || {},
                        loading: this.__template.args.loading || false
                    });
                    return window.Pug.units[that.getType()]({
                        params: this.__template.args.params || {},
                        api: this.__template.args.api || {},
                        loading: this.__template.args.loading || false
                    });
                },
                ontemplateready: function () {
                    console.log(that.getType(),'onrender');
                    loadDependencies.call(that, requestParams, customData);
                }
            };
    
            if (requestParams) {
                
                config.templateArgs = requestParams;
                config.inject       = requestParams.constructor === Array ? requestParams : [requestParams];
                
                if (customData) {
                    config.inject.push(customData);
                }
                
            }

            this.unit = new T.MVC.Unit(this, config);
        } else {
            this.unit.render(requestParams);
        }
        console.log('mvc.unit', this.unit);

        return this;
    };

    Unit.prototype.instance = function () {
        return this.unit.instance;
    };

    Unit.prototype.view = function () {
        return this.unit;
    };

    Unit.prototype.destroy = function () {
        this.unit.destroy();
    };

    T.Unit = Unit;

    return T;

    function loadDependencies(requestParams, customData) {
        for (var i = 0, t = this.dependencies.length; i < t, dependency = this.dependencies[i]; i++) {
            dependency.destroy();
        }
        
        var dependencies = this.root.querySelectorAll('[data-unit]');

        for (var i = 0, t = dependencies.length, dependency; i < t, dependency = dependencies[i]; i++) {
            this.dependencies.push(new Unit(dependency.dataset.unit + ':' + dependency.dataset.key, dependency).render(requestParams, customData));
        }
        
        this.loaded = true;
        this.isDependenciesLoaded = true;
    }

    function generateRandomText(length) {
        if (typeof length !== 'number') {
            length = 20;
        }

        var characters = 'abcdefghijklmnopqrstuvwxyz_-';
        var result = '';
        var charactersLength = characters.length;

        for ( var i = 0; i < length ; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        return result;
    }

})(window.T || {});