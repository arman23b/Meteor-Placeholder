Meteor.startup(function () {
    Notifications.defaultOptions.timeout = 2000;
});

// No iron-router on client 
Router.options.autoStart = false;

Template.body.events({
    "click #broadcast-button": function (event) {
        Meteor.call('broadcastIP', function (err, res) {
            if (err != null) console.error(err);
        });       
        return false;
    }
});
