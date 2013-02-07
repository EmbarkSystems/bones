Backbone.$ = $;

// Initialize any properties on the router object.
// On the client this will be called automatically by
// the default initialize method.
Backbone.Router.prototype.initializeState = function(app) {};

// Initialize the router.
// This differs from the upstream backbone method, in that
// we automatically call the initializeAssets method for you.
Backbone.Router.prototype.initialize = function(app) {
   this.initializeState.apply(this, arguments)
};

Backbone.Router.prototype.route = function(route, name, callback) {
    Backbone.history || (Backbone.history = new Backbone.History);
    if (!_.isRegExp(route)) route = this._routeToRegExp(route);
    Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
    }, this));
};

// Generate CSRF protection token that is valid for the specified amount of
// msec. The default is 1 second. Callers should provide the request path to
// ensure the cookie is not pervasive across requests.
Backbone.csrf = function(path, timeout) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXZY0123456789';
    var token = '';
    while (token.length < 32) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Remove hashes, query strings from cookie path.
    path = path || '/';
    path = path.split('#')[0].split('?')[0];

    var expires = new Date(+new Date + (timeout || 2000)).toGMTString();
    document.cookie = 'bones.token=' + token
        + ';expires=' + expires
        + ';path=' + path + ';';
    return token;
};

// Client-side override of `Backbone.sync`. Adds CSRF double-cookie
// confirmation protection to all PUT/POST/DELETE requests. The csrf middleware
// must be used server-side to invalidate requests without this CSRF
// protection. The original `Backbone.sync` cannot be reused because it does
// not send a request body for DELETE requests.
Backbone.sync = _.wrap(Backbone.sync, function(_sync, method, model, options) {
    // Throw an error when a URL is needed, and none is supplied.
    var urlError = function() {
        throw new Error('A "url" property or function must be specified');
    };

    if (method !== 'read') {
        var url = _.result(model, 'url') || urlError();
        var modelJSON = model.toJSON ? model.toJSON(options) : model;
        modelJSON['bones.token'] = Backbone.csrf(url);
        options.data = JSON.stringify(modelJSON);
    }
    return _sync.call(this, method, model, options);
});
