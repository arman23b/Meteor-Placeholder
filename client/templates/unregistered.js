Template.unregistered.helpers({
    stations: function () {
        // filter out expired stations
        var expireTime = new Date();
        expireTime.setSeconds(expireTime.getSeconds() - TIMEOUT);
        return Stations.find({registered: false,
                              time: {$gte: expireTime}});
    },
    items: function () {
        // filter out expired items
        var expireTime = new Date();
        expireTime.setSeconds(expireTime.getSeconds() - TIMEOUT);
        return Items.find({registered: false,
                           time: {$gte: expireTime}});
    },
});