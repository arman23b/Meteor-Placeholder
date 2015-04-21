Template.room.events({
    "click button": function (event) {
        // Call server method to unregister stations with given room
        Meteor.call('removeRoomFromStations', this._id, function (err, res) {
            if (err != null) console.log("Error", "Couldn't remove rooms");
        });
        Rooms.remove(this._id);
        return true;
    }

});