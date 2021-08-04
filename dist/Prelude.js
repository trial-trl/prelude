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
                return unit + '/template.php';
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
                    new T.Unit('app', _root.children[0]).render(requestParams, customData);
                    return _app.render(_routerOutlet.dataset.unit, requestParams, customData);
                }
            };
        }
    };

    return T;

})(window.T || {});

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
        console.log('dependencies', this.dependencies);
        for (var i = 0, t = this.dependencies.length; i < t, dependency = this.dependencies[i]; i++) {
            dependency.destroy();
        }
        
        var dependencies = this.root.querySelectorAll('[data-unit]');
        console.log('loadDependencies', dependencies);

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

window.T = (function (T) {    
    // module Router created at E3L on 06/03/2019
    // added here on 23/03/2019
    // based on article: http://krasimirtsonev.com/blog/article/A-modern-JavaScript-router-in-100-lines-history-api-pushState-hash-url
    T.Router = {
        routes: [],
        interceptors: [],
        handlerInterceptors: [],
        root: '/',
        config(options) {
            if (options) {
                this.root = options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
                
                if (options.filterRouter && 'function' === typeof options.filterRouter) {
                    this.__filterRouter = options.filterRouter;
                }
            }
            return this;
        },
        getFragment(removeQueryString) {
            var fragment = '';
            fragment = this.clearSlashes(decodeURI(location.pathname + location.search + location.hash));
            if (typeof removeQueryString === 'undefined' || removeQueryString === true) {
                fragment = fragment.replace(/\?(.*)$/, '').replace(/\#(.*)$/, '');
            }
            fragment = this.root !== '/' ? fragment.replace(this.clearSlashes(this.root), '') : fragment;
            fragment = this.clearSlashes(fragment);
            return '/' + fragment;
        },
        clearSlashes(path) {
            return path.toString().replace(/\/$/, '').replace(/^\//, '');
        },
        add(regex, handler) {
            if (typeof regex === 'function') {
                handler = regex;
                regex = '';
            }
            this.routes.push({
                regex: regex,
                handler: handler
            });
            return this;
        },
        remove(param) {
            for (var i = 0, r; i < this.routes.length, r = this.routes[ i]; i++) {
                if (r.handler === param || r.regex.toString() === param.toString()) {
                    this.routes.splice(i, 1);
                    return this;
                }
            }
            return this;
        },
        flush() {
            this.routes = [];
            this.interceptors = [];
            this.root = '/';
            return this;
        },
        addInterceptor: function (fc) {
            if (typeof fc !== 'function') {
                throw new TypeError();
            }
            
            this.interceptors.push(fc);
            return this;
        },
        removeInterceptor: function (fc) {
            if (typeof fc !== 'function') {
                throw new TypeError();
            }
            
            var i = this.interceptors.indexOf(fc);
            if (i !== -1) {
                this.interceptors.splice(i, 1);
            }
            return this;
        },
        addHandlerInterceptor: function (fc) {
            if (typeof fc !== 'function') {
                throw new TypeError();
            }
            
            this.handlerInterceptors.push(fc);
            return this;
        },
        removeHandlerInterceptor: function (fc) {
            if (typeof fc !== 'function') {
                throw new TypeError();
            }
            
            var i = this.handlerInterceptors.indexOf(fc);
            if (i !== -1) {
                this.handlerInterceptors.splice(i, 1);
            }
            return this;
        },
        setData(data, persist) {
            persist = typeof persist === 'boolean' ? persist : false;
            this.__data = data || null;
            
            if (persist === true) {
                history.replaceState(this.__data, null, this.root + this.clearSlashes(this.getFragment(false)));
            }
        },
        check(f) {
            var fragment = f || this.getFragment(false);
            
            for (var i in this.interceptors) {
                var returned = this.interceptors[ i](fragment, this.__data);
                if (typeof returned === 'boolean' && returned === false) {
                    return this;
                }
                if (typeof returned === 'string' && returned !== fragment) {
                    T.Router.navigate(returned, this.__data);
                    return this;
                }
            }
            
            fragment = this.getFragment();
            
            for (var i = 0, r; i < this.routes.length, r = this.routes[ i]; i++) {
                var match = fragment.match('^' + r.regex + '$');
                if (match) {
                    match.shift();
                    var groups = match.groups;
                    var q = this.getFragment(false);
                    var qs = {};
                    
                    if (q.indexOf('?') !== -1) {
                        var search = q.split('?')[ 1];
                        search = search.split('&');
                        for (var i in search) {
                            var pair = search[ i].split('=');
                            qs[ decodeURIComponent(pair[ 0])] = decodeURIComponent(pair[ 1] || '');
                        }
                    }
                    
                    if (q.indexOf('#') !== -1) {
                        qs.hash = q.split('#')[ 1];
                    }
                    
                    if (groups) {
                        Object.assign(groups, qs);
                    } else {
                        groups = qs;
                    }
                    
                    var old = this.lastGroup;
                    this.lastGroup = groups;
            
                    for (var i in this.handlerInterceptors) {
                        var returned = this.handlerInterceptors[ i](groups, this.__data, old);
                        if (typeof returned === 'boolean' && returned === false) {
                            delete this.__data;
                            return this;
                        }
                    }
            
                    r.handler.call(null, groups, this.__data);
                    delete this.__data;
                    return this;
                }
            }
            return this;
        },
        listen() {
            var self = this;
            var current = this.getFragment(false);
            var fn = () => {
                if (current !== self.getFragment(false)) {
                    current = self.getFragment(false);
                    self.check(current);
                }
            };
            clearInterval(this.interval);
            this.interval = setInterval(fn, 50);
            
            window.removeEventListener('click', _onwindowclick.bind(this));
            window.addEventListener('click', _onwindowclick.bind(this));

            return this;
        },
        refresh() {
            this.check(this.getFragment());
            return this;
        },
        navigate(path, data) {
            path = path || '';
            this.setData(data);
            
            for (var i in this.interceptors) {
                var returned = this.interceptors[ i](path, this.__data);
                if (typeof returned === 'boolean' && returned === false) {
                    return this;
                }
                if (typeof returned === 'string' && returned !== path) {
                    T.Router.navigate(returned, this.__data);
                    return this;
                }
            }
            
            history.pushState(this.__data, null, this.root + this.clearSlashes(path));
            return this;
        },
        filterRouterData(data) {
            if (!data) {
                return undefined;
            }
            return   this.__filterRouter 
                   ? this.__filterRouter(data) 
                   : JSON.parse(decodeURIComponent(atob(data)));
        }
    };

    function _onwindowclick(e) {
        var el = e.target, href;
        while (el && el.getAttribute && !(href = el.getAttribute('href'))) {
            el = el.parentNode;
        }
        
        if (!href) {
            return;
        }

        e.preventDefault();
        this.navigate(
            href, 
            this.filterRouterData(
                    e.target.dataset.router || null
            )
       );
    }

    return T;
    
})(window.T || {});

window.T = (function (T) {
    /**
     * (c) 2018 TRIAL.
     * Created on 20/08/2018, 17:34:25.
     * Adapted from Simple MVC of Todd Zebert
     *
     * Licensed under the Apache License, Version 2.0 (the 'License');
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *      http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an 'AS IS' BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    _ = (function (T) {

        /*
         * Simple MVC
         *
         * 2016 Todd Zebert
         *
         * repetative module pattern (and eslint directives) are so it can be
         * easily customized and broken into multiple files
         */


        /**
         * Simple MVC, 2016 Todd Zebert
         * Event Listeners and notifications module
         * 
         * @param {window.T} T 
         */
        T.MVC = (function (T) {
            'use strict';

            // sender is the context of the Model or View which originates the event
            T._Event = function (sender) {
                this._sender = sender;
                this._listeners = [];
            };

            T._Event.prototype = {
                // add listener closures to the list
                attach(listener) {
                    this._listeners.push(listener);
                },
                // loop through, calling attached listeners
                notify(args) {

                    this._listeners.forEach(function(v, i) {
                        this._listeners[i](this._sender, args);
                    }.bind(this));

                }
            };

            return T;

        })(T.MVC || {});


        /**
         * Simple MVC, 2016 Todd Zebert
         * Model module
         * 
         * @param {window.T} T 
         */
        T.MVC = (function(T) { // eslint-disable-line no-redeclare, no-shadow
            'use strict';

            T.Model = function (data) {
                this._data = [];

                var properties = Object.getOwnPropertyNames(data);

                for (var i in properties) {

                    var property = properties[i];

                    if (property === 'length') continue;

                    if (typeof data[property] === 'object' && data[property] !== null && data[property] !== undefined) {
                        this._data[property] = new T.Model(data[property]);
                    } else {
                        this._data[property] = (function (value) {
                            return {
                                // get just returns the value
                                get() {
                                    return value;
                                },
                                // sets the value and notifies any even listeners
                                set(data) {
                                    value = data;
                                    this.onSet.notify(data);
                                },
                                onSet: new T._Event(this)
                            };
                        })(data[property]);
                    }
                }

                return this._data;
            };

            return T;
        })(T.MVC || {}); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow


        /**
         * A 1-way View Module
         * 
         * @param {window.T} T 
         */
        T.MVC = (function (T) { // eslint-disable-line no-redeclare, no-shadow
            'use strict';

            T.OneWayView = function (selector, binder) {
                this._selector = selector;
                if (!(!!this._selector)) {
                    this._selector = document.querySelector(selector);
                }

                this._binder = binder;

                // since not a 2-way, don't need to set this.onChanged

                var attributes = Object.getOwnPropertyNames(binder);

                for (var i in attributes) {
                    var attribute = attributes[i];

                    // attach model listeners
                    binder[attribute].onSet.attach(function (attribute) {
                        return function (sender, args) {
                            this.bind(attribute, args);
                        }.bind(this);
                    }.call(this, attribute));
                }
            };

            T.OneWayView.prototype = {
                bind(attribute, args) {
                    this._selector[attribute] = args;
                },

                show() {
                    var attributes = Object.getOwnPropertyNames(this._binder);

                    for (var i in attributes) {
                        var attribute = attributes[i];
                        this._selector[attribute] = this._binder[attribute].get();
                    }
                }
            };

            return T;
        })(T.MVC || {}); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow


        /**
         * A 2-way View Module
         * 
         * @param {window.T} T 
         */
        T.MVC = (function (T) { // eslint-disable-line no-redeclare, no-shadow
            'use strict';

            // selector is a DOM element that supports .onChanged and .value
            T.TwoWayView = function (selector, binder) {
                this._selector = selector;
                if (!(this._selector instanceof HTMLElement)) {
                    this._selector = document.querySelector(selector);
                }

                if (!(this._selector instanceof HTMLElement)) {
                    return null;
                }

                this._binder = binder;

                // for 2-way binding
                this.onChanged = new T._Event(this);

                var attributes = Object.getOwnPropertyNames(binder);

                for (var i in attributes) {

                    var attribute = attributes[i];

                    // attach model listeners
                    binder[attribute].onSet.attach(function (attribute) {
                        return function (sender, args) {
                            this.bind(attribute, args);
                        }.bind(this);
                    }.call(this, attribute));

                }

                // attach change listener for two-way binding
                this._selector.addEventListener('change', function (e) {
                    this.onChanged.notify(e.target.value);
                }.bind(this));
            };

            T.TwoWayView.prototype = {
                bind(attribute, args) {
                    this._selector[attribute] = args;
                },

                show() {
                    var attributes = Object.getOwnPropertyNames(this._binder);

                    for (var i in attributes) {
                        var attribute = attributes[i];
                        this._selector[attribute] = this._binder[attribute].get();
                    }
                }
            };

            return T;
        })(T.MVC || {}); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow


        /**
         * Controller module
         * 
         * @param {window.T} T 
         */
        T.MVC = (function (T) { // eslint-disable-line no-redeclare, no-shadow
            'use strict';

            T.Controller = function (binder, view) {
                this._binder = binder;
                this._view = view;

                var attributes = Object.getOwnPropertyNames(binder);

                for (var i in attributes) {
                    var attribute = attributes[i];

                    if (this._view.hasOwnProperty('onChanged')) {
                        this._view.onChanged.attach(function (model) {
                            return function (sender, data) {
                                this.update(model, data);
                            }.bind(this);
                        }.call(this, this._binder[attribute]));
                    }
                }
            };

            T.Controller.prototype = {
                update(model, data) {
                    model.set(data);
                }
            };

            return T;
        })(T.MVC || {}); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow

        T.MVC = (function (MVC) {

            MVC.Unit = function (unit, options) {
                if (!(unit instanceof T.Unit)) {
                    throw new TypeError();
                }

                options = options || {};

                this.__unit = unit;
                this.__into = unit.getRoot();
                this.__template = options.template || {};
                this.__template.args = {};
                this.__template.args.params = options.templateArgs;
                this.__template.loaded = unit.isLoaded();
                this.__listeners = {};

                var definedProperties = Object.getOwnPropertyNames(options);
                
                for (var i in definedProperties) {
                    var property = definedProperties[i];

                    if (property.lastIndexOf('on', 0) === 0) {
                        var listener = property.slice(2);
                        this.on(listener, options['on' + listener]);
                    }
                }

                this.name = this.__unit.getTypeCamelCaseStyle();

                _init.call(this, options);
            };

            MVC.Unit.config = {
                exports : window,
                dir     : 'units'
            };

            MVC.Unit.prototype = {

                hide: function () {
                    this.__element.hidden = true;
                },

                show: function () {
                    this.__element.hidden = false;
                },

                render(data, api) {
                    var that = this;

                    this.__template.args.params = data || this.__template.args.params;

                    if (!this.__template.args.api) {
                        if (api) {
                            return _endpointResult({
                                target: {
                                    status: 200,
                                    response: api
                                }
                            });
                        }

                        this.__template.args.loading = true;
                        console.log(this.__unit.getType(), 'loading true');
                        _callback.call(that);

                        var declaration = window.app.units[this.__unit.getType()];

                        var xhr = new XMLHttpRequest();

                        var endpoint = declaration.endpoint.split(':');
                        var base = endpoint[0];
                        var route = endpoint[1];
                        endpoint = window.app.datasource[base] + route;

                        xhr.open('GET', endpoint);
                        xhr.setRequestHeader('Accept', declaration.expect);
                        xhr.onerror = xhr.onloadend = _endpointResult;
                        xhr.send();
                    } else {
                        this.__template.args.loading = false;
                        console.log(this.__unit.getType(), 'loading false');
                        _callback.call(this);
                    }

                    function _callback() {
                        console.log(this.__unit.getType(), '_callback');
                        _whenTemplateIsLoaded.call(this, function () {
                            console.log(this.__unit.getType(), 'in _callback');
                            if (this.__element) {
                                this.__element.removeFromPage();
                            }
                            console.log(this.__unit.getType(), 1);
                            _parseTemplate.call(this);
                            _insertTemplate.call(this);
                            console.log(this.__unit.getType(), 3);
                            this.dispatch({
                                eventType: 'render',
                                emitter: null
                            });
                            console.log(this.__unit.getType(), 4);
                        }.bind(this));
                    }

                    function _endpointResult(e) {
                        var response = e.target.response;

                        if (declaration.expect === 'application/json' && typeof response === 'string') {
                            response = JSON.parse(response);
                        }

                        that.__template.args.api = {
                            error: !(e.target.status >= 200 || e.target.status < 400),
                            data: response
                        };
                        that.__template.args.loading = false;

                        _callback.call(that);
                    }
                },

                on: function (eventType, listener, onElement) {
                    onElement = (onElement === true ? true : false) || false;

                    if (typeof listener !== 'function') {
                        throw new TypeError();
                    }

                    if (onElement && !this.__element) {
                        throw new Error();
                    }

                    if (onElement) {
                        modifyListeners.call(this.__listeners, eventType, this.__element, 'remove');
                        pushArray.call(this.__listeners, eventType, listener);
                        modifyListeners.call(this.__listeners, eventType, this.__element, 'add');
                    } else {
                        pushArray.call(this.__listeners, eventType, listener);
                        pushArray.call(this.__listeners, 'on' + eventType, listener);
                    }
                    
                    function pushArray(eventType, listener) {
                        if (!this[eventType] || this[eventType].constructor !== Array) {
                            this[eventType] = [];
                        }
                        
                        this[eventType].push(listener);
                    }
                    
                    function modifyListeners(eventType, el, operation) {
                        if (Array.constructor === this[eventType] && this[eventType].length > 0) {
                            for (var i in this[eventType]) {
                               el[operation + 'EventListener'](eventType, this[eventType][i]);
                            }
                        }
                    }
                },

                hasListener: function (eventType) {
                    var allEventKeys = Object.getOwnPropertyNames(this.__listeners || {});

                    return allEventKeys.indexOf(eventType) !== -1;
                },

                findElement: function (id) {
                    if (!this.__element) {
                        return null;
                    }

                    return this.__element.querySelector('#' + this.__unit.getType() + '__' + id);
                },

                dispatch: function (event, data) {
                    var eventType;
                    var dispatch;

                    if (typeof event === 'object') {
                        eventType = event.eventType;
                        dispatch = event.emitter;

                        if (dispatch === 'el') {
                            dispatch = this.__element;
                        }
                    } else {
                        eventType = event;
                        dispatch = this;
                    }

                    if (!dispatch) {
                        dispatch = this;
                    }

                    if (dispatch instanceof HTMLElement) {
                        dispatch.dispatchEvent(
                                new CustomEvent(eventType, data || null)
                        );
                    } else if (this.__listeners) {
                        var call = this.__listeners['on' + eventType];
                        var result;
                        
                        for (var i in call) {
                            var fn = call[i];

                            if (typeof fn === 'function') {
                                var called = fn.call(this, data || null);
                                if (called && !result) {
                                    result = called;
                                }
                            }
                        }
                        
                        return result;
                    }
                },

                destroy: function () {
                    if (this.__element) {
                        this.__element.removeFromPage();
                        this.__element.removeFromPage = null;
                        this.__element.addToPage = null;
                        this.__element = null;
                    }

                    this.styleFile = null;
                    this.controllerFile = null;

                    MVC.Unit.config.exports[this.name] = null;

                    this.__unitName = null;
                    this.name       = null;

                    this.dispatch({
                        eventType: 'destroy',
                        emitter: null
                    });
                    
                    this.__listeners = null;
                }

            };

            function _declareDataUnit(tags) {
                return tags.replace(/<([a-z]{1,)/g, '<$1 data-unit="' + this.__unit.getType() + '"');
            }
                
            function _loadTemplate() {
                var that = this;
                var config = {};

                if (this.hasListener('loadtemplate')) {
                    config = this.dispatch({
                        eventType: 'loadtemplate',
                        emitter: null
                    }, this.__template.args);
                }

                config.url = this.__unit.getTemplate();

                if (config.url.indexOf('.php') !== -1) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', config.url);
                    xhr.setRequestHeader('Accept', 'text/html');
                    xhr.onerror = xhr.onloadend = function (e) {
                        console.log(e.target.response);
                        window.Pug.units[that.__unit.getType()] = (function (template) {
                            return function () {
                                return template;
                            };
                        })(e.target.response);
                        _notifyTemplateIsLoaded.call(that);
                    };
                    xhr.send();
                } else {
                    loadjs(config.url, {
                        success() {
                            _notifyTemplateIsLoaded.call(that);
                        }
                    });
                }
            }
            
            function _notifyTemplateIsLoaded() {
                this.__template.loaded = true;
                this.dispatch('templateloaded');
            }
            
            function _parseTemplate() {
                var that = this;

                if (this.hasListener('parsetemplate')) {
                    this.__template.parts = this.dispatch({
                        eventType: 'parsetemplate',
                        emitter: null
                    }, this.__template.parts);
                }

                console.log(this.__unit.getType(), this.__unit.getType());
                console.log(this.__unit.getType(), this.__template.parts);

                if (this.__template.parts && typeof this.__template.parts === 'string') {
                    var parts = {};

                    this.__template.parts = this.__template.parts.replace(
                        /<!-- #html -->(.*)<!-- html# -->/is,
                        function (whole, part) {
                            parts.html = part.match('/<attr (.*)><\/attr>/', part);
                            parts.html = parts.html.match(/[a-z0-9A-Z_-=\'\"]{1,}/g);
                            parts.html.shift();
                            return '';
                        },
                    );

                    this.__template.parts = this.__template.parts.replace(
                        /<!-- #meta -->(.*)<!-- meta# -->/is,
                        function (whole, part) {
                            parts.meta = _declareDataUnit.call(that, part);
                            return '';
                        },
                    );

                    this.__template.parts = this.__template.parts.replace(
                        /<!-- #head -->(.*)<!-- head# -->/is,
                        function (whole, part) {
                            parts.head = _declareDataUnit.call(that, part);
                            return '';
                        },
                    );

                    this.__template.parts = this.__template.parts.replace(
                        /<!-- #title -->(.*)<!-- title# -->/is,
                        function (whole, part) {
                            parts.title = part;
                            return '';
                        },
                    );

                    this.__template.parts = this.__template.parts.replace(
                        /<!-- #footer -->(.*)<!-- footer# -->/is,
                        function (whole, part) {
                            parts.footer = part;
                            return '';
                        },
                    );

                    console.log(this.__template.parts.trim());
                    parts.body = this.__template.parts.trim();

                    this.__template.parts = parts;
                }
            }

            function _insertTemplate() {
                console.log(this.__unit.getType(), this.__template.parts);
                if (!this.__template.parts) return;
                
                if (typeof this.__template.parts.body === 'string') {
                    var shadow = document.createElement('div');
                    shadow.innerHTML = this.__template.parts.body;
                    this.__template.parts.body = shadow.firstChild;
                }

                this.__element = this.__template.parts.body;
                this.__element.addToPage = _addToPage.bind(this);
                this.__element.removeFromPage = _removeFromPage.bind(this);

                console.log(this.__unit.getType(), 'insert', this.__element); 

                this.__element.addToPage();

                this.dispatch('templateready');
            }

            function _init(options) {
                var that = this;
                var load = [];

                if (!options.hasOwnProperty('hasStyle') || options.hasStyle === true) {
                    var style = document.querySelector('link[data-unit="' + that.__unit.getType() + '"]');
                    if (!style) {
                        load.push(this.__unit.getStyle());
                    }
                }

                var scriptWasLoaded = MVC.Unit.config.exports[that.__unit.getTypePascalCaseStyle()];
                if (!scriptWasLoaded) {
                    var controller = document.querySelector('script[data-unit="' + that.__unit.getType() + '"]');
                    if (controller) {
                        controller.onload = _instantiate;
                    } else {
                        load.push(this.__unit.getController());
                    }
                } else {
                    console.log(this.__unit.getType(), 2);
                    _instantiate();
                }
                console.log(this.__unit.getType(), 'loaded', this.__unit.isLoaded());

                if (!this.__unit.isLoaded()) {
                    _loadTemplate.call(that);
                } else {
                    window.Pug.units[this.__unit.getType()] = (function (template) {
                        return function () {
                            return template;
                        };
                    })(this.__unit.getRoot().innerHTML);
                    _notifyTemplateIsLoaded.call(this);
                    console.log(this.__unit.getType(), 'notify', this.__unit.getRoot());
                    this.__element = this.__unit.getRoot().firstChild;
                    this.__template.parts = {body: this.__element};
                    this.__element.addToPage = _addToPage.bind(this);
                    this.__element.removeFromPage = _removeFromPage.bind(this);
                    this.dispatch('templateready');
                }
                
                if (load.length > 0) {
                    loadjs(load, {
                        before(path, script) {
                            script.dataset.unit = that.__unit.getType();

                            if (script instanceof HTMLLinkElement) {
                                that.styleFile = script;
                                document.head.appendChild(that.styleFile);
                            }

                            if (script instanceof HTMLScriptElement) {
                                that.controllerFile = script;
                                document.body.appendChild(that.controllerFile);
                            }
                            console.log(that.__unit.getType(), script);

                            return false;
                        },

                        success() {
                            _instantiate()
                        }
                    });
                }

                return false;

                function _instantiate() {
                    _constructor();

                    console.log(that.__unit.getType(), that.__template.loaded);
                    console.log(that.__unit.getType(), that.__template.parts);
                    
                    that.render();
                }
                            
                function _constructor() {
                    var unitInstanceClass = MVC.Unit.config.exports[that.__unit.getTypePascalCaseStyle()];

                    var inject = [null, that];

                    if (options.inject && Array === options.inject.constructor) {
                        inject = inject.concat(options.inject);
                    }

                    that.instance = new (unitInstanceClass.bind.apply(unitInstanceClass, inject));
                    that.on('render', function () {
                        if (that.instance.render) {
                            that.instance.render();
                        }
                    });
                }
            };
                        
            function _whenTemplateIsLoaded(_do) {
                if (this.__template.loaded === true) {
                    _do.call(this);
                } else {
                    this.on('templateloaded', _do);
                }
            }
                        
            function _whenTemplateIsReady(_do) {
                if (this.__template.parts) {
                    _do.call(this);
                } else {
                    this.on('templateready', _do);
                }
            }

            function _addToPage() {
                console.log(this.__unit.getType(), 'INSERTING --------------------------------');
                console.log(this.__unit.getType(), this.__into, this.__element);
                this.__into.appendChild(this.__element);

                var parts = this.__template.parts;

                if (parts.html) {
                    for (var i in parts.html) {
                        var part = parts.html[i].replace('"', '').replace('\'', '').split('=');
                        document.documentElement.setAttribute(part[0], part[1]);
                        parts.html[i] = part;
                    }
                }

                if (parts.head) {
                    document.head.innerHTML += parts.head;
                }

                if (parts.meta) {
                    document.head.innerHTML += parts.meta;
                }

                if (parts.title) {
                    document.title = parts.title;
                }

                if (parts.footer) {
                    document.body.innerHTML += parts.footer;
                }
            }

            function _removeFromPage() {
                console.log(this.__unit.getType(), 'REMOVING --------------------------------');
                console.log(this.__unit.getType(), this.__into, this.__element);
                this.__into.removeChild(this.__element);

                var dependencies = document.head.querySelectorAll('[data-unit="' + this.__unit.getType() + '"]:not(link)');
                for (var i = 0, t = dependencies.length, dependency; i < t, dependency = dependencies[i]; i++) {
                    dependency.parentNode.removeChild(dependency);
                }

                var parts = this.__template.parts || {};
                if (parts.html) {
                    for (var i in parts.html) {
                        document.documentElement.removeAttribute(parts[i][0]);
                    }
                }
            }

            return MVC;

        })(T.MVC || {});

        return T;

    })(T);
    
    return _;
    
})(window.T || {});