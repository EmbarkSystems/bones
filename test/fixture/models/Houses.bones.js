model = Backbone.Collection.extend({
    model: models.House,
    sync: function(method, model, options) {
        options.success(model, [
            {'foo': 'bar'},
            {'foo': 'baz'},
            {'foo': 'blah'}
        ], options);
    }
});
