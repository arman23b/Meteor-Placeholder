Template.logs.helpers({
    logs: function () {
        return Logs.find({}).fetch().reverse();
    },
});