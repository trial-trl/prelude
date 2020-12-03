/* 
 * (c) 2020 TRIAL.
 * Created on 03/10/2020, 17:23:04.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * ( c ) 2018 TRIAL.
 * Created on 20/08/2018, 17:34:25.
 * Adapted from Simple MVC of Todd Zebert
 *
 * Licensed under the Apache License, Version 2.0 ( the 'License' );
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

window.T = {};
window.T.Utils = {};


T.Utils.ajax_addInterceptor = function ( f ) {
    if ( typeof f !== 'function' ) {
        throw new TypeError();
    }
    __ajax_interceptors.push( f );
};

T.Utils.ajax_removeInterceptor = function ( f ) {
    if ( typeof f !== 'function' ) {
        throw new TypeError();
    }
    __ajax_interceptors.splice( __ajax_interceptors.indexOf( f ), 1 );
};

T.Utils.ajax = function ( options ) {
    var e = options.event || event || null,
            xhr    = new XMLHttpRequest,
            method = 'GET',
            url,
            data;

    if ( e ) e.preventDefault();

    if ( xhr.timeout ) {

        xhr.timeout = options.timeout ? options.timeout : 30000;

    }
    
    if ( __ajax_interceptors.length > 0 ) {
        for ( var i in __ajax_interceptors ) {
            options = __ajax_interceptors[ i ]( options );
        }
    }

    if ( options.data ) {

        method = options.method || 'POST';

        if ( this.isElement( options.data ) || this.isNode( options.data ) ) {

            method = options.data.getAttribute( 'method' );
            url = options.data.getAttribute( 'action' );
            data = new FormData( options.data );
            prepareData();

        } else {

            url = options.url;

            if ( options.data instanceof FormData ) {

                data = options.data;
                prepareData();

            } else {

                if ( method === 'GET') {

                    var args = [];
                    var names = Object.getOwnPropertyNames( options.data );

                    for ( var i = 0, total = names.length; i < total; i++ ) {
                      args.push( names[ i ] + '=' + options.data[ names[ i ] ] );
                    }

                    url += '?' + args.join( '&' );

                } else {

                    data = JSON.stringify( options.data );
                    options.headers = options.headers || [];
                    options.headers.push( 'Content-Type: application/json' );

                }

            }

        }

    } else {

        url = options.url || null;

    }

    if (!url ) {

        throw new Error( 'Request url is empty' );

    }

    if ( options.method ) {

        method = options.method;

    }

    xhr.onloadstart = ( e ) => {
        eventHandler( e, options.onloadstart );
    };
    xhr.onprogress  = ( e ) => {
        eventHandler( e, options.onprogress );
    };
    xhr.onload      = ( e ) => {
        eventHandler( e, options.onload );
    };
    xhr.onloadend   = ( e ) => {
        eventHandler( e, options.onloadend );
    };
    xhr.onabort     = ( e ) => {
        eventHandler( e, options.onabort );
    };
    xhr.onerror     = ( e ) => {
        eventHandler( e, options.onerror );
    };
    xhr.ontimeout   = ( e ) => {
        eventHandler( e, options.ontimeout );
    };

    xhr.open( method, url );

    xhr.responseType = ( options.response === 'json' ? null : options.response ) || 'text';

    if ( options.hasOwnProperty( 'headers' )) {
        for ( var i = 0, t = options.headers.length; i < t; i++ ) {
            try {
                var header = options.headers[ i ].split( ':' );
                xhr.setRequestHeader( header[ 0 ], header[ 1 ] );
            } catch ( e ) {}
        }
    }

    xhr.setRequestHeader( 'X-REQUESTED-WITH', 'xmlhttprequest' );

    if ( data ) xhr.send( data );
    else        xhr.send();

    return xhr;

    function prepareData() {
        if ( options.additional_data ) {
            var names = Object.getOwnPropertyNames( options.additional_data );
            for ( var i = 0, total = names.length; i < total; i++ ) {
                data.append( names[ i ], options.additional_data[ names[ i ] ] );
            }
        }
    }

    function eventHandler( e, custom ) {
        if ( custom ) {
            try {
                var response =  options.response === T.Constants.Response.JSON || 
                               !options.response 
                               ? ( typeof e.target.response === 'object'
                                   ? e.target.response 
                                   : ( e.target.responseText 
                                       ? JSON.parse( e.target.responseText ) 
                                       : null ) ) 
                               : e.target.response;
            } catch ( e ) {
                var response = { error: e };
            }
            custom( { 
                target: { 
                    response: response, 
                    status: e.target.status 
                } 
            } );
        }
    }
};


T.load = ( jss, fn ) => {
    var js      = [];
    var lib     = window[ 'loadjs' ] && typeof window[ 'loadjs' ] === 'function' && !!document.querySelector( 'script[ src*=\'loadjs\' ]' );
    var jss_str = typeof jss === 'string';

    if ( !jss_str && !( jss.constructor === Array ) ) {
        throw new TypeError( '( T.load ) Param must be a string or array' );
    }

    jss = jss_str ? [ jss ] : jss;

    for ( let i in jss ) {
        let url = jss[ i ];
        switch ( url ) {
            case 'account':
            case 'cookies':
            case 'history':
            case 'navigation':
            case 'utils':
            case 'elements':
            case 'design':
                var firstChar = url.substring(0, 1);
                var remainingStr = url.substring(1, url.length);
                if ( ( !T[ firstChar.toUpperCase() + remainingStr ] && !T[ firstChar + remainingStr ] ) || ( url === 'design' && !T.Animation && !T.Color ) ) {
                    url = T.API + '/' + url + '.js';
                } else {
                    url = null;
                }
                break;
        }
        if ( url ) {
            js.push( url );
        }
    };

    if ( !lib ) {
        var s    = document.createElement( 'script' );
        s.src    = T.LOADJS;
        s.onload = load.bind( this, fn );
        document.body.appendChild( s );
    } else
        load( fn );

    function load( callback ) {
        if ( js.length > 0 ) {
            loadjs( js, {
                success() {
                    T.dispatchCallback( callback );
                }
            } );
        } else {
            T.dispatchCallback( callback );
        }
    }
};

/*
* Simple MVC
*
* 2016 Todd Zebert
*
* repetative module pattern ( and eslint directives ) are so it can be
* easily customized and broken into multiple files
*/


/**
 * Simple MVC, 2016 Todd Zebert
 * Event Listeners and notifications module
 * 
 * @param {window.T} T 
 */
T.MVC = ( ( T ) => {
    'use strict';

    // sender is the context of the Model or View which originates the event
    T._Event = function ( sender ) {
        this._sender = sender;
        this._listeners = [];
    };

    T._Event.prototype = {
        // add listener closures to the list
        attach( listener ) {
            this._listeners.push( listener );
        },
        // loop through, calling attached listeners
        notify( args ) {

            this._listeners.forEach( function( v, i ) {
                this._listeners[ i ]( this._sender, args );
            }.bind( this ) );

        }
    };

    return T;

} )( T.MVC || {} );


/**
 * Simple MVC, 2016 Todd Zebert
 * Model module
 * 
 * @param {window.T} T 
 */
T.MVC = ( function( T ) { // eslint-disable-line no-redeclare, no-shadow
    'use strict';

    T.Model = function ( data ) {

        this._data = [];

        var properties = Object.getOwnPropertyNames( data );

        for ( var i in properties ) {

            var property = properties[ i ];

            if ( property === 'length' ) continue;

            if ( typeof data[ property ] === 'object' && data[ property ] !== null && data[ property ] !== undefined ) {

                this._data[ property ] = new T.Model( data[ property ] );

            } else {

                this._data[ property ] = ( ( _v ) => {

                    var value = _v;

                    var property = {
                        // get just returns the value
                        get() {
                            return value;
                        },
                        // sets the value and notifies any even listeners
                        set( data ) {
                            value = data;
                            this.onSet.notify( data );
                        },
                        onSet: new T._Event( this )
                    };

                    return property;

                } )( data[ property ] );

            }

        }

        return this._data;

    };

    return T;
} )( T.MVC || {} ); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow


/**
 * A 1-way View Module
 * 
 * @param {window.T} T 
 */
T.MVC = ( ( T ) => { // eslint-disable-line no-redeclare, no-shadow
    'use strict';

    T.OneWayView = function ( selector, binder ) {

        this._selector = selector;
        if ( !( !!this._selector ) ) {
            this._selector = document.querySelector( selector );
        }

        this._binder = binder;

        // since not a 2-way, don't need to set this.onChanged

        var attributes = Object.getOwnPropertyNames( binder );

        for ( var i in attributes ) {

            var attribute = attributes[ i ];

            // attach model listeners
            binder[ attribute ].onSet.attach( function ( attribute ) {

                return function ( sender, args ) {

                    this.bind( attribute, args );

                }.bind( this );

            }.call( this, attribute ) );

        }

    };

    T.OneWayView.prototype = {

        bind( attribute, args ) {

            this._selector[ attribute ] = args;

        },

        show() {

            var attributes = Object.getOwnPropertyNames( this._binder );

            for ( var i in attributes ) {

                var attribute = attributes[ i ];

                this._selector[ attribute ] = this._binder[ attribute ].get();

            }

        }

    };

    return T;
} )( T.MVC || {} ); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow


/**
 * A 2-way View Module
 * 
 * @param {window.T} T 
 */
T.MVC = ( ( T ) => { // eslint-disable-line no-redeclare, no-shadow
    'use strict';

    // selector is a DOM element that supports .onChanged and .value
    T.TwoWayView = function ( selector, binder ) {

        this._selector = selector;
        if ( !( this._selector instanceof HTMLElement ) ) {
            this._selector = document.querySelector( selector );
        }

        if ( !( this._selector instanceof HTMLElement ) ) {
            return null;
        }

        this._binder = binder;

        // for 2-way binding
        this.onChanged = new T._Event( this );

        var attributes = Object.getOwnPropertyNames( binder );

        for ( var i in attributes ) {

            var attribute = attributes[ i ];

            // attach model listeners
            binder[ attribute ].onSet.attach( function ( attribute ) {

                return function ( sender, args ) {

                    this.bind( attribute, args );

                }.bind( this );

            }.call( this, attribute ) );

        }

        // attach change listener for two-way binding
        this._selector.addEventListener( 'change', function ( e ) {
            this.onChanged.notify( e.target.value );
        }.bind( this ) );

    };

    T.TwoWayView.prototype = {

        bind( attribute, args ) {

            this._selector[ attribute ] = args;

        },

        show() {

            var attributes = Object.getOwnPropertyNames( this._binder );

            for ( var i in attributes ) {

                var attribute = attributes[ i ];

                this._selector[ attribute ] = this._binder[ attribute ].get();

            }

        }

    };

    return T;
} )( T.MVC || {} ); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow


/**
 * Controller module
 * 
 * @param {window.T} T 
 */
T.MVC = ( ( T ) => { // eslint-disable-line no-redeclare, no-shadow
    'use strict';

    T.Controller = function ( binder, view ) {

        this._binder = binder;
        this._view = view;

        var attributes = Object.getOwnPropertyNames( binder );

        for ( var i in attributes ) {

            var attribute = attributes[ i ];

            if ( this._view.hasOwnProperty( 'onChanged' ) ) {

                this._view.onChanged.attach( function ( model ) {

                    return function ( sender, data ) {

                        this.update( model, data );

                    }.bind( this );

                }.call( this, this._binder[ attribute ] ) );

            }

        }

    };

    T.Controller.prototype = {

        update( model, data ) {

            model.set( data );

        }

    };

    return T;
} )( T.MVC || {} ); // eslint-disable-line no-use-before-define, no-redeclare, no-shadow

T.MVC = ( ( MVC ) => {

    MVC.Block = function ( blockName, options ) {

        options = options || {};

        this.__rawBlockName = blockName;
        this.__blockName = blockName.split( '/' ).pop();
        this.__into = options.into || document.body;
        this.__template = options.template || {};
        this.__template.auto = this.__template.auto || options.templateAuto || options.lazyLoadTemplate || true;
        this.__template.extension = this.__template.extension || options.templateExtension || 'php';
        this.__template.mimeType = this.__template.mimeType || options.templateMimeType || 'text/html';
        this.__template.args = this.__template.args || options.templateArgs || {};
        this.__template.loaded = false;
        this.__listeners = {};

        var definedProperties = Object.getOwnPropertyNames( options );
        
        for ( var i in definedProperties ) {

            var property = definedProperties[ i ];

            if ( property.lastIndexOf( 'on', 0 ) === 0 ) {

                var listener = property.slice( 2 );

                this.on( listener, options[ 'on' + listener ] );

            }

        }

        Object.defineProperty( this, 'cssPath', {

            get() {
                return this.getFileUrl( 'css' );
            }

        } );

        Object.defineProperty( this, 'jsPath', {

            get() {
                return this.getFileUrl( 'js' );
            }

        } );

        this.name = this.__blockName.replace( /^([A-Z])|[\s-_](\w)/g, function ( match, p1, p2 ) {

            if ( p2 ) return p2.toUpperCase( );

            return p1.toLowerCase();

        } );

        MVC.Block.config.exports[ this.name ] = this;

        this.__element = this.__into.querySelector( '#' + this.__blockName );

        if ( !( this.__element instanceof HTMLElement ) ) {
            _init.call( this, options );
        }

    };

    MVC.Block.config = {

        exports : window,
        dir     : 'blocks'

    };

    MVC.Block.prototype = {

        getFileUrl( ext ) {
        
            var dir = MVC.Block.config.dir;
            if ( this.__rawBlockName.indexOf( '/' ) !== -1 ) {
                var splittedPath = this.__rawBlockName.split( '/' );
                splittedPath.pop();
                dir += '/' + splittedPath;
            }
            return dir + '/' + this.__blockName + '/' + this.__blockName + '.' + ext;

        },

        hide() {

            this.__element.hidden = true;

        },

        show() {

            this.__element.hidden = false;

        },

        updateView( data ) {
            this.__template.args = data || this.__template.args;
            
            _whenTemplateIsLoaded.call( this, function () {
                _parseTemplate.call( this );
                _insertTemplate.call( this );
            }.bind( this ) );
        },

        on( eventType, listener, onElement ) {

            onElement = ( onElement === true ? true : false ) || false;

            if ( typeof listener !== 'function' ) {

                throw new TypeError();

            }

            if ( onElement && !this.__element ) {

                throw new Error();

            }

            if ( onElement ) {
                
                modifyListeners.call( this.__listeners, eventType, this.__element, 'remove' );
                pushArray.call( this.__listeners, eventType, listener );
                modifyListeners.call( this.__listeners, eventType, this.__element, 'add' );

            } else {
                
                pushArray.call( this.__listeners, eventType, listener );
                pushArray.call( this.__listeners, 'on' + eventType, listener );

            }
            
            function pushArray( eventType, listener ) {
                if ( !this[ eventType ] || this[ eventType ].constructor !== Array ) {
                    this[ eventType ] = [];
                }
                this[ eventType ].push( listener );
            }
            
            function modifyListeners( eventType, el, operation ) {
                if ( Array.constructor === this[ eventType ] && this[ eventType ].length > 0 ) {
                    for ( var i in this[ eventType ] ) {
                        el[ operation + 'EventListener' ]( eventType, this[ eventType ][ i ] );
                    }
                }
            }

        },

        hasListener( eventType ) {

            var allEventKeys = Object.getOwnPropertyNames( this.__listeners );

            return allEventKeys.indexOf( eventType ) !== -1;

        },

        findElement( id ) {

            if ( !this.__element ) {

                return null;

            }

            return this.__element.querySelector( '#' + this.__blockName + ' #' + this.__blockName + '__' + id );

        },

        dispatch( event, data ) {

            var eventType;
            var dispatch;

            if ( typeof event === 'object' ) {

                eventType = event.eventType;
                dispatch = event.emitter;

                if ( dispatch === 'el' ) {

                    dispatch = this.__element;

                }

            } else {

                eventType = event;
                dispatch = this;

            }

            if ( !dispatch ) {

                dispatch = this;

            }

            if ( dispatch instanceof HTMLElement ) {

                dispatch.dispatchEvent(
                        new CustomEvent( eventType, data || null )
                );

            } else if ( this.__listeners ) {

                var call = this.__listeners[ 'on' + eventType ];
                var result;
                
                for ( var i in call ) {
                    
                    var fn = call[ i ];
                    if ( typeof fn === 'function' ) {
                        var called = fn.call( this, data || null );
                        if ( called && !result ) {
                            result = called;
                        }
                    }
                
                }
                
                return result;

            }

        },

        destroy() {

            if ( this.__element ) {

                this.__element.removeFromPage();
                this.__element.removeFromPage = null;
                this.__element.addToPage = null;
                this.__element = null;

            }

            if ( this.cssFile ) {

                this.cssFile.parentNode.removeChild( this.cssFile );

            }

            if ( this.jsFile ) {

                this.jsFile.parentNode.removeChild( this.jsFile );

            }

            this.cssFile = null;
            this.jsFile  = null;

            MVC.Block.config.exports[ this.name ] = null;

            this.__blockName = null;
            this.name        = null;

            this.dispatch( {
                eventType: 'destroy',
                emitter: null
            } );
            
            this.__listeners = null;

        }

    };
        
    function _loadTemplate() {

        var that = this;

        var config = {};

        config.ext = this.__template.extension;
        config.type = this.__template.mimeType;

        if ( this.hasListener( 'loadtemplate' ) ) {

            config = this.dispatch( {
                eventType: 'loadtemplate',
                emitter: null
            }, this.__template.args );

        }

        if ( config.ext ) {
            config.url = this.getFileUrl( config.ext );
        }

        if ( config.ext === 'php' ) {

            var args = [];

            for ( var i in this.__template.args ) {
                args.push( i + '=' + this.__template.args[ i ] );
            }

            if ( args.length > 0 ) {
                config.url += '?' + args.join( '&' );
            }

            T.Utils.ajax( {
                url: config.url,
                response: config.type || 'document',
                onloadend: ( e ) => {
                    var onload = that.dispatch( 'load', e );
                    if ( typeof onload === 'undefined' || onload ) {
                        var response = e.target.response;
                        that.__template._ = response && response.body ? response.body.firstChild : ( response ? response : document.createElement( 'div' ) );
                        _notifyTemplateIsLoaded.call( that );
                    }

                }
            } );
            
        } else {
            T.load( config.url, _notifyTemplateIsLoaded.bind( that ) );
        }
    }
    
    function _notifyTemplateIsLoaded() {
        this.__template.loaded = true;
        this.dispatch( 'templateloaded' );
    }
    
    function _parseTemplate() {
        if ( this.hasListener( 'parsetemplate' ) ) {

            this.__template._ = this.dispatch( {
                eventType: 'parsetemplate',
                emitter: null
            }, this.__template._ );

        }
    }

    function _insertTemplate() {
        if ( !this.__template._ ) return;
        
        if ( typeof this.__template._ === 'string' ) {
            var shadow = document.createElement( 'div' );
            shadow.innerHTML = this.__template._;
            this.__template._ = shadow.firstChild;
        }

        this.__element = this.__template._;
        this.__element.addToPage = _addToPage.bind( this );
        this.__element.removeFromPage = _removeFromPage.bind( this );

        this.__element.addToPage();
            
        if ( this.__template._ ) {
            this.dispatch( 'templateready' );
        }
    }

    function _init( options ) {

        var that = this;
        var load = [];

        if ( !options.hasOwnProperty( 'hasCss' ) || options.hasCss === true ) {
            load.push( this.cssPath );
        }

        if ( !options.hasOwnProperty( 'hasJs' )  || options.hasJs === true ) {
            load.push( this.jsPath );
        }

        _loadTemplate.call( that );

        loadjs( load, {

            before( path, script ) {

                if ( script instanceof HTMLLinkElement ) {
                    that.cssFile = script;
                }

                if ( script instanceof HTMLScriptElement ) {
                    that.jsFile = script;
                }

                return true;

            },

            success() {

                var blockInstanceClass = MVC.Block.config.exports[ that.name.charAt( 0 ).toUpperCase() + that.name.slice( 1 ) ];
                
                _constructor();
                
                if ( that.__template.auto === true ) {
                    _whenTemplateIsLoaded.call( that, that.updateView );
                }
                _whenTemplateIsReady.call( that, __init );
                
                function _constructor() {
                    if ( that.jsFile ) {

                        var inject = [ null, that ];

                        if ( options.inject && Array === options.inject.constructor ) {
                            inject = inject.concat( options.inject );
                        }

                        that.instance = new ( blockInstanceClass.bind.apply( blockInstanceClass, inject ) );
                        that.on( 'initialize', function () {
                            if ( that.instance.init ) {
                                that.instance.init();
                            }
                        } );

                    }
                }
                
                function __init() {
                    that.dispatch( {
                        eventType: 'initialize',
                        emitter: null
                    } );
                }

            }

        } );

        return false;

    };
                
    function _whenTemplateIsLoaded( _do ) {
        if ( this.__template.loaded === true ) {
            _do.call( this );
        } else {
            this.on( 'templateloaded', _do );
        }
    }
                
    function _whenTemplateIsReady( _do ) {
        if ( this.__template._ ) {
            _do.call( this );
        } else {
            this.on( 'templateready', _do );
        }
    }

    function _addToPage() {
        this.__into.appendChild( this.__element );
    }

    function _removeFromPage() {
        this.__into.removeChild( this.__element );
    }

    return MVC;

} )( T.MVC || {} );


new T.MVC.Block('home', {
    into: document.getElementById('main-content')
})