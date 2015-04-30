Template.logs.helpers({
    logs: function () {
        return Logs.find({}).fetch().reverse();
    },
});

Template.logs.events({
    "click button": function (event) {
        Meteor.call("clearLogs", this, function (err, res) {
            if (err != null) console.error(err);
        });
        return true;
    }
});