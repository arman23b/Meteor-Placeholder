Template.unregistered.helpers({
    stations: function () {
        return Stations.find({registered: false});
    },
    items: function () {
        return Items.find({registered: false});
    },
});