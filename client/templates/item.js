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
    }
});

Template.item.events({

    "submit form": function (event) {
        var name = event.target.name.value;
        Items.update(this._id, {$set: {name : name, registered : true}});
        // Clear form
        event.target.name.value = "";
        // Prevent default form submit
        return false;
    },

    "click .unregister-button": function (event) {
        Items.update(this._id, {$set: {registered : false, lastUpdate : new Date()}});
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