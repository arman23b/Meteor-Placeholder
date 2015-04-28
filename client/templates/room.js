Template.room.events({
    "click button": function (event) {
        // Call server method to unregister stations and items with given room
        Meteor.call('removeRoomFromStations', this._id, function (err, res) {
            if (err != null) console.log("Error", "Couldn't remove stations from room");
        });
        Meteor.call('removeRoomFromItems', this._id, function (err, res) {
            if (err != null) console.log("Error", "Couldn't remove items from room");
        });
        Rooms.remove(this._id);
        return true;
    }

});

Template.room.onRendered(function() {
    this.$("#example").multiselect();
});