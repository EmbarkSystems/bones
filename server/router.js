var Backbone = require('./backbone');
var _ = require('underscore');

module.exports = Backbone.Router;

Backbone.Router.register = function(server) {
    // Add the router if it's not a server-only router.
    this.files.forEach(function(filename) {
        if (!(/\.server\.bones$/).test(filename) && server.assets &&
            server.assets.routers.indexOf(filename) < 0) {
            server.assets.routers.push(filename);
        }
    });

    // TODO push the order of the routers to the client

    return server.routers[this.title] = new this({ server: server });
};

Backbone.Router.toString = function() {
    return '<Router ' + this.title + '>';
};

Backbone.Router.prototype.initialize = function(options) {
    if (!options.server) {
        throw new Error("Can't initialize router without server.");
    }
    this.server = options.server;

    // Bind routes.
    if (this.routes) {
        var router = this, routes = this.routes;
        // Add the last routes first.
        _(this.routes).keys().reverse().forEach(function(route) {
            var name = routes[route];
            router.route(route, name, router[name]);
        });
    }
};

Backbone.Router.prototype.initializeState = function(options) {
    // Noop. It is up to the application to determine what their state is.
};

Backbone.Router.prototype.toString = function() {
    return '[Router ' + this.constructor.title + ']';
};

Backbone.Router.prototype._bindRoutes = function() {
    // Noop. Routes are bound in initialize();
};

Backbone.Router.prototype.route = function(route, name, callback) {
    if (!_.isRegExp(route)) route = this._routeToRegExp('/' + route);
    if (!_.isFunction(callback)) throw new Error("'" + name + "' is not a function in " + this);

    // Add route to express server.
    var router = this;
    this.server.get(route, function(req, res, next) {
        var fragment = (req.query && req.query['_escaped_fragment_']) || req.url.replace(/[#?].*$/, '');
        var args = router._extractParameters(route, fragment);

        // The initialization of the router is handled differently between the client
        // and server, leading to any properties set on the router in the initialize
        // method bleeding through between requests.
        //
        // Firstly, we create a new context object from the Router prototype, that contains
        // read-only and immutable copies of this request's req + res objects.
        var context = Object.create(router, { req: { value: req }, res: { value: res } });

        // Then we provide a method for routers to initialize their application state
        // separately from the main initialize() call. This allows us to rebuild the
        // state for each call that hits the backend.
        router.initializeState.apply(context, args);

        // We call the registered callback, using the descendant
        // of the router object we created earlier.
        callback.apply(context, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
    });
};
