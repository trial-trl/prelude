window.T = (function (T) {

    var _app,
        _declaration = {
            datasource: {},
            units: {},
            routes: {}
        },
        _router,
        _dependencies = [],
        _state = {};

    var _root,
        _routerOutlet,
        _currentPageUnit;

    var Prelude = function (declaration) {
        _declaration.datasource = declaration.datasource;
        _declaration.units      = declaration.units;

        _router = T.Router.config();
        for (var path in declaration.routes) {
            _router.add(path, (function (path) {
                return function (requestParams, customData) {
                    _app.render(declaration.routes[path], requestParams, customData);
                }
            })(path));
        }
        _router.listen();

        Object.defineProperty(this, 'datasource', {
            get() {
                return _declaration.datasource;
            }
        });

        Object.defineProperty(this, 'units', {
            get() {
                return _declaration.units;
            }
        });

        Object.defineProperty(this, 'router', {
            get() {
                return _router;
            }
        });

        _root = document.getElementById('app');
        _routerOutlet = _root.querySelector('[data-router-outlet]');
    };

    Prelude.prototype.hasUnit = function (type) {
        return typeof _units[type] !== 'undefined';
    }

    Prelude.prototype.getUnit = function (type) {
        if (!this.hasUnit(type)) {
            return false;
        }

        var unit = _units[type].location;

        return {
            getController: function () {
                return unit + '/controller.js';
            },
            getTemplate: function () {
                return unit + '/template.js';
            },
            getStyle: function () {
                return unit + '/style.css';
            }
        };
    }

    Prelude.prototype.update = function (requestParams, customData) {
        _currentPageUnit.render(requestParams, customData);
        return this;
    };

    Prelude.prototype.render = function (unit, requestParams, customData) {
        if (_currentPageUnit) _currentPageUnit.destroy();
            
        _state[unit] = Object.assign(requestParams, customData || {});
        _currentPageUnit = new T.Unit(unit, _routerOutlet).render(requestParams, customData);

        return this;
    };

    T.Prelude = {
        create: function (declaration) {
            if (!(_app instanceof Prelude)) {
                _app = new Prelude(declaration);
            }
            window.app = _app;
            return {
                init: function (requestParams, customData) {
                    _state = customData;
                    return _app.render('app', requestParams, customData);
                }
            };
        }
    };

    return T;

})(window.T || {});