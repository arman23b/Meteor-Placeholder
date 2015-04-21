Template.station.helpers({
    rooms: function () {
        return Rooms.find({});
    },

    is_active: function () {
        var curTime = new Date();
        var timeDiff = curTime - this.lastUpdate;
        var diffSecs = Math.ceil(timeDiff / 1000);
        if (diffSecs > TIMEOUT) {
            return "inactive";
        } else {
            return "active";
        }
    }
});

Template.station.events({
    "change select": function (event) {
        Session.set("room", $(event.target).val());
    },

    "submit form": function (event) {
        var name = event.target.name.value;
        var room = Rooms.findOne({ name : Session.get("room") });
        if (name == "" || room == null) {
            return false;
        }
        Stations.update(this._id, {$set: {name : name, registered : true, room : room}});
        // Clear form
        event.target.name.value = "";
        // Prevent default form submit
        return false;
    },

    "click button": function (event) {
        Stations.update(this._id, {$set: {name: null, registered : false, room: null, lastUpdate : new Date()}});
        return true;
    }
});