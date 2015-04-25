var SET_ID_ROUTE = "set-id"
var BROADCAST_BEACON_ROUTE = "broadcast-uuid"
var BROADCAST_IP_ROUTE = "broadcast-ip"
var PORT = "8001"
var BROADCAST_IP_COMMAND = "python /home/ubuntu/Meteor-Placeholder/server/broadcast_ip.py"


Meteor.startup(function () {
  Meteor.methods({
    broadcastUUID: function (uuid) {
      var stations = Stations.find({});
      stations.forEach(function (station) {
        console.log("Broadcasting uuid to station", station.ip);
        HTTP.post("http://" + station.ip + ":" + PORT + "/" + BROADCAST_BEACON_ROUTE, 
          {params: {uuid: uuid}}, function (err, res) {
            if (err != null) console.log("Error", "Couldn't broadcast uuid to " + station.ip);
          });
      });
    },

    removeRoomFromStations: function (roomID) {
      var stations = Stations.find({});
      stations.forEach(function (station) {
        if (station.room && station.room._id == roomID) {
          Stations.update(station._id, {$set: {name: null, registered: false, room: null}});
        }
      });
    },

    removeRoomFromItems: function (roomID) {
      var items = Items.find({});
      items.forEach(function (item) {
        if (item.room && item.room._id == roomID) {
          Items.update(item._id, {$set: {name: null, registered: false, room: null}});
        }
      });
    },

    broadcastIP: function () {
      var exec = Npm.require('child_process').exec;
      var child = exec(BROADCAST_IP_COMMAND, function (err, stdout, stderr) {
        if (stdout && stdout.length > 0) console.log("Stdout", stdout);
        if (stderr && stderr.length > 0) console.log("Stderr", stderr);
        if (err != null) {
            console.log("Error", err);
        }
      });
    }

  });

  var myIP = null;
  Meteor.setInterval(function () {
    var newestIP = getLocalIP();
    if (myIP != newestIP) {
      myIP = newestIP;
      console.log("Web Server IP changed to " + newestIP);
      // Notify stations
      var stations = Stations.find({});
      stations.forEach(function (station) {
        console.log("Broadcasting IP to station", station.ip);
        HTTP.get("http://" + station.ip + ":" + PORT + "/" + BROADCAST_IP_ROUTE, 
          function (err, res) {
            if (err != null) console.log("Error", "Couldn't broadcast IP to " + station.ip);
          });
      });
   }
  }, 30*1000); // repeat every 30 seconds

});


Router.route("/newData", { where : 'server' }).post(function (req, res, next) {

  var stationID = req.body.id;
  var stationIpAddress = this.request.headers["x-forwarded-for"];
  var station = Stations.findOne({_id: stationID});
  if (station == null) {
    // No station with such id
    station = getOrCreateStation(stationIpAddress);
    // Need to send the new id
    try {
      var params = {data: JSON.stringify({"id": station._id})};
      HTTP.post("http://" + stationIpAddress + ":" + PORT + "/" + SET_ID_ROUTE, {params: params});
    }
    catch (error) {
      console.log("Error", "Couldn't send POST request to " + stationIpAddress)
    }
  } else {
    // Station with this id is in database
    if (station.ip != stationIpAddress) {
      // Update ipAddress
      Stations.update(station._id, {$set: {ip: stationIpAddress,
                                           lastUpdate: new Date()}});
    } else {
      // Update lastUpdate time
      Stations.update(station._id, {$set: {lastUpdate: new Date()}});
    }
  }

  var data = JSON.parse(req.body.data);

  for (var beaconId in data) {
    var item = getOrCreateItem(beaconId, station, data[beaconId]);
    var closestStation = findClosestStation(item);
    if (closestStation != null && closestStation.registered) {
      Items.update(item._id, {$set: {room: closestStation.room,
                                     lastUpdate: new Date()}});
    }
  }
  res.end("");
});


Router.route("/sendHeartbeat", { where : 'server' }).post(function (req, res, next) {

  // TODO: code reuse! Reuses lots of newData's code
  var stationID = req.body.id;
  var stationIpAddress = this.request.headers["x-forwarded-for"];
  var station = Stations.findOne({_id: stationID});
  if (station == null) {
    // No station with such id
    station = getOrCreateStation(stationIpAddress);
    // Need to send the new id
    try {
      var params = {data: JSON.stringify({"id": station._id})};
      HTTP.post("http://" + stationIpAddress + ":" + PORT + "/" + SET_ID_ROUTE, {params: params});
    }
    catch (error) {
      console.log("Error", "Couldn't send POST request to " + stationIpAddress)
    }
  } else {
    // Station with this id is in database
    if (station.ip != stationIpAddress) {
      // Update ipAddress
      Stations.update(station._id, {$set: {ip: stationIpAddress,
                                           lastUpdate: new Date()}});
    } else {
      // Update lastUpdate time
      Stations.update(station._id, {$set: {lastUpdate: new Date()}});
    }
  }
  res.end("");
});


function findClosestStation(item) {
  var distances = item.distances;
  var maxRSSI = -10000;
  var closestStationID;
  for (var stationID in distances) {
    if (distances[stationID] >= maxRSSI) {
      maxRSSI = distances[stationID];
      closestStationID = stationID;
    }
  }
  var closestStation = Stations.findOne({_id : closestStationID});
  return closestStation;
}


function getOrCreateItem(beaconId, station, rssi) {
  var item = Items.findOne({ beaconId : beaconId });
  var stationID = station._id;
  if (item == null) {
    var distances = {};
    distances[stationID] = rssi;
    var id = Items.insert({
      registered: false,
      beaconId: beaconId,
      distances: distances,
      lastUpdate: new Date()
    });
    item = Items.findOne({ _id: id });
    return item;
  } else {
    // Update or add new rssi value for this station
    var newDistances = item.distances;
    newDistances[stationID] = rssi;
    Items.update(item._id, {$set: {distances: newDistances,
                                   lastUpdate: new Date()}});
    return item;
  }
}


function getOrCreateStation(stationIpAddress) {
  var station = Stations.findOne({ ip : stationIpAddress });
  if (station == null) {
    var id = Stations.insert({
      registered: false,
      ip: stationIpAddress,
      lastUpdate: new Date()
    });
    station = Stations.findOne({ _id: id });
  }
  return station;
}

function getLocalIP () {
  var os = Npm.require('os');
  var wlan0 = os.networkInterfaces().wlan0;
  
  for (var i in wlan0) {
    var obj = wlan0[i];
    if (obj.family == "IPv4" && obj.internal == false) {
      var myIP = obj.address;
      return myIP;
    }
  }
  return null;
}
