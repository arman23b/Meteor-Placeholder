Template.registered.helpers({
    rooms: function () {
        return Rooms.find({});
    },
    stations: function () {
        return Stations.find({registered: true});
    },
    items: function () {
        return Items.find({registered: true});
    },
});

Template.registered.events({

    "submit .new-room": function (event) {
        var name = event.target.name.value;
        Rooms.insert({
            name: name
        });
        // Clear form
        event.target.name.value = "";
        // Prevent default form submit
        return false;
    },

});