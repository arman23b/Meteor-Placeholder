Template.item.helpers({
    is_active: function () {
        var curTime = new Date();
        var timeDiff = curTime - this.lastUpdate;
        var diffSecs = Math.ceil(timeDiff / 1000);
        if (diffSecs > TIMEOUT) {
            return "inactive";
        } else {
            return "active";
        }
    },

    timestamp: function () {
        return moment(this.lastUpdate).format('hh:mm:ss a, MMMM Do');
    },

    not_in_lock_room: function () {
        var roomName = Session.get(this._id);
        if (roomName && this.roomsToLock && this.roomsToLock.indexOf(roomName) >= -1) {
            return "not-in-lock-room";
        }
        return "";
    },

    rooms: function () {
        return Rooms.find({});
    }

});

Template.item.events({

    "change select": function (event) {
        var roomNamesToLock = $(event.target).val();
        Items.update(this._id, {$set: {roomsToLock: roomNamesToLock}});
    },

    "submit form": function (event, template) {
        var name = event.target.name.value.toUpperCase();
        var item = Items.findOne({name: name});
        if (item != null) {
            Notifications.error("Cannot register a beacon", "Beacon " + name + " already exists");
        } else {
            Items.update(this._id, {$set: {name : name, registered : true}});
        }
        // Clear form
        event.target.name.value = "";
        // Prevent default form submit
        return false;
    },

    "click .unregister-button": function (event) {
        Items.update(this._id, {$set: {name: null, registered : false, station: null}});
        return true;
    },

    "click .search-button": function (event) {
        var beaconId = this.beaconId;
        // Call server method to broadcast uuid
        Meteor.call('broadcastUUID', beaconId, function (err, res) {
            if (err != null) console.log("Error", "Couldn't broadcast uuid to " + station.ip);
        });
    },
});

Template.item.onRendered(function() {
    this.$("select.multiselect").multiselect({
        selectedList: true
    });
    var item = this;
    var toClick = [];
    this.$("select.multiselect").multiselect("widget").find(":checkbox").each(function(){
        if (item.data.roomsToLock && item.data.roomsToLock.indexOf(this.value) >= 0) {
            toClick.push(this);
        }
    });
    for (var i in toClick) {
        toClick[i].click();
    }
});