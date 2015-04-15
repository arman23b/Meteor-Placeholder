Template.station.helpers({
    rooms: function () {
        return Rooms.find({});
    },

    is_active: function () {
        var curTime = new Date();
        var timeDiff = curTime - this.lastUpdate;
        var diffSecs = Math.ceil(timeDiff / 1000);
        return diffSecs > TIMEOUT;
    }
});

Template.station.events({
    "change select": function (event) {
        Session.set("room", $(event.target).val());
    },

    "submit form": function (event) {
        var name = event.target.name.value;
        var room = Rooms.findOne({ name : Session.get("room") });
        Stations.update(this._id, {$set: {name : name, registered : true, room : room}});
        // Clear form
        event.target.name.value = "";
        // Prevent default form submit
        return false;
    },
});