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