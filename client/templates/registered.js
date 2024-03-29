Template.registered.helpers({
    rooms: function () {
        return Rooms.find({});
    },
    stations: function () {
        return Stations.find({registered: true});
    },
    items: function () {
        return Items.find({registered: true}, {sort: {beaconId: 1}});
    },
});

Template.registered.events({

    "submit .new-room": function (event) {
        var name = event.target.name.value.toUpperCase();
        var room = Rooms.findOne({name: name});
        if (room != null) {
            Notifications.error('Cannot add a new room', "Room " + name + " already exists");
        } else {
            Rooms.insert({
                name: name
            });
        }
        // Clear form
        event.target.name.value = "";
        // Prevent default form submit
        return false;
    },

    "click #clearRooms": function (event) {
        Meteor.call("clearRooms", function (err, res) {
            if (err != null) console.error(err);
        });
    },

    "click #clearStations": function (event) {
        Meteor.call("clearStations", function (err, res) {
            if (err != null) console.error(err);
        });
    },

    "click #clearItems": function (event) {
        Meteor.call("clearItems", function (err, res) {
            if (err != null) console.error(err);
        });
    }

});
