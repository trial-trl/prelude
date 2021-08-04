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

                        var endpoint = declaration.endpoint.split(':');
                        var base = endpoint[0];
                        var route = endpoint[1];
                        endpoint = window.app.datasource[base] + route;

                        var xhr = new XMLHttpRequest();
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

                    parts.body = this.__template.parts;

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