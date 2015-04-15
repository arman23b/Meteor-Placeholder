var SET_ID_ROUTE = "set-id"
var BROADCAST_BEACON_ROUTE = "broadcast-uuid"
var PORT = "8001"


Meteor.startup(function () {
  Meteor.methods({
    broadcastUUID: function (uuid) {
      var stations = Stations.find({});
      stations.forEach(function (station) {
        console.log("Broadcasting uuid to station", station.ip);
        HTTP.post("http://" + station.ip + ":" + PORT + "/" + BROADCAST_BEACON_ROUTE, 
          { params : { uuid : uuid } }, function (err, res) {
            if (err != null) console.log("Error", "Couldn't broadcast uuid to " + station.ip);
          });
      });
    }
  });
});


Router.route("/newData", { where : 'server' }).post(function (req, res, next) {

  var stationID = req.body.id;
  var stationIpAddress = this.request.headers["x-forwarded-for"];
  var station = Stations.findOne({ _id : stationID });
  if (station == null) {
    // No station with such id
    station = getOrCreateStation(stationIpAddress);
    // Need to send the new id
    try {
      var params = { data : JSON.stringify({"id" : station._id}) };
      HTTP.post("http://" + stationIpAddress + ":" + PORT + "/" + SET_ID_ROUTE, { params : params });
    }
    catch (error) {
      console.log("Error", "Couldn't send POST request to " + stationIpAddress)
    }
  } else {
    // Station with this id is in database
    if (station.ip != stationIpAddress) {
      // Update ipAddress
      Stations.update(station._id, {$set : { ip : stationIpAddress }});
    }
  }

  var data = JSON.parse(req.body.data);

  for (var beaconId in data) {
    var item = getOrCreateItem(beaconId);
    if (station.registered) {
      Items.update(item._id, {$set: {room : station.room}});
    }
  }
  res.end("");
}); 


function getOrCreateItem(beaconId) {
  var item = Items.findOne({ beaconId : beaconId });
  if (item == null) {
    var id = Items.insert({
      registered: false,
      beaconId: beaconId
    });
    item = Items.findOne({ _id: id });
  }
  return item;
}


function getOrCreateStation(stationIpAddress) {
  var station = Stations.findOne({ ip : stationIpAddress });
  if (station == null) {
    var id = Stations.insert({
      registered: false,
      ip: stationIpAddress
    });
    station = Stations.findOne({ _id: id });
  }
  return station;
}