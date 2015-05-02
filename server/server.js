var SET_ID_ROUTE = "set-id"
var BROADCAST_BEACON_ROUTE = "broadcast-uuid"
var BROADCAST_IP_ROUTE = "broadcast-ip"
var PORT = "8001"
var BROADCAST_IP_COMMAND = "python /home/ubuntu/Meteor-Placeholder/server/broadcast_ip.py"
var txPower = -4.0;

Meteor.startup(function () {
  Meteor.methods({
    broadcastUUID: function (uuid) {
      var stations = Stations.find({});
      stations.forEach(function (station) {
        addLog("Sending POST request", "Broadcasting uuid to station " + station.ip);
        console.log("Broadcasting uuid to station", station.ip);
        HTTP.post("http://" + station.ip + ":" + PORT + "/" + BROADCAST_BEACON_ROUTE,
          {params: {uuid: uuid}}, function (err, res) {
            if (err != null) {
              addLog("Error", "Couldn't broadcast uuid to " + station.ip);
              console.log("Error", "Couldn't broadcast uuid to " + station.ip);
            }
          });
      });
    },

    removeRoomFromStations: function (roomID) {
      var stations = Stations.find({});
      stations.forEach(function (station) {
        if (station.room && station.room._id == roomID) {
          Meteor.call('unregisterStation', station, function (err, res) {
            if (err != null) console.error(err);
          });
        }
      });
    },

    unregisterStation: function (station) {
      Stations.update(station._id, {$set: {name: null, registered: false, room: null}});
      var items = Items.find({});
      items.forEach(function (item) {
        if (item.station && item.station._id == station._id) {
          Items.update(item._id, {$set: {station: null}});
        }
      });     
    },

    broadcastIP: function () {
      var exec = Npm.require('child_process').exec;
      var child = exec(BROADCAST_IP_COMMAND, function (err, stdout, stderr) {
        if (stdout && stdout.length > 0) {
          addLog("Broadcasting IP with BLE", stdout.toString());
          console.log("Stdout", stdout);
        }
        if (stderr && stderr.length > 0) {
          // addLog("Broadcasting IP with BLE", stderr.toString());
          console.log("Stderr", stderr);
        }
        if (err != null) {
            addLog("Error", err.toString());
            console.log("Error", err);
        }
      });
    },

    clearLogs: function () {
      Logs.remove({});
    },

    clearRooms: function () {
      Rooms.remove({});
    },

    clearStations: function () {
      Stations.remove({});
    },

    clearItems: function () {
      Items.remove({});
    }

  });

  sendIPAddress();
  Meteor.setInterval(sendIPAddress, 30*1000); // repeat every 30 seconds

});


Router.route("/newData", { where : 'server' }).post(function (req, res, next) {
  var stationID = req.body.id;
  var stationIpAddress = this.request.headers["x-forwarded-for"];
  addLog("Incoming POST request", "/newData request from " + stationIpAddress);
  console.log("/newData request from " + stationIpAddress);
  var stationID = updateOrCreateStation(stationID, stationIpAddress);

  var data = JSON.parse(req.body.data);
  for (var beaconId in data) {
    var item = getOrCreateItem(beaconId, stationID, data[beaconId]);
    var closestStation = findClosestStation(item);
    if (closestStation != null && closestStation.registered) {
      Items.update(item._id, {$set: {station: closestStation,
                                     lastUpdate: new Date()}});
    }
  }
  res.end("");
});


Router.route("/sendHeartbeat", { where : 'server' }).post(function (req, res, next) {
  var stationID = req.body.id;
  var stationIpAddress = this.request.headers["x-forwarded-for"];
  addLog("Incoming POST request", "/sendHeartbeat request from " + stationIpAddress);
  console.log("/sendHeartbeat request from " + stationIpAddress);
  updateOrCreateStation(stationID, stationIpAddress);
  res.end("");
});


function findClosestStation(item) {
  var distances = item.distances;
  var maxRSSI = -10000;
  var closestStationID;
  var newDistanceMap = item.distanceMap;
  var curTime = new Date();
  for (var stationID in distances) {
    var work_rssi = distances[stationID].rssi;
    var lastUpdate = distances[stationID].lastUpdate;
    // formula to calculate distance from rssi and tx. need to calibrate it
    // TODO: regression d=A*(rssi/tx)^B+C
    newDistanceMap[stationID] = Math.pow(10,((txPower - work_rssi)/(10*2)));

    // make sure distance entry has been updated recently
    var timeDiff = curTime - lastUpdate;
    var diffSecs = Math.ceil(timeDiff / 1000);
    if (diffSecs > TIMEOUT) {
      continue;
    }

    var station = Stations.findOne({_id: stationID});
    if (station != null && work_rssi >= maxRSSI) {
      maxRSSI = work_rssi;
      closestStationID = stationID;
    }
  }
  var closestStation = Stations.findOne({_id : closestStationID});
  Items.update(item._id, {$set: {distanceMap: newDistanceMap}});
  return closestStation;
}


function getOrCreateItem(beaconId, stationID, rssi) {
  var item = Items.findOne({ beaconId : beaconId });
  if (item == null) {
    var distances = {};
    var distanceMap = {};
    distances[stationID] = {rssi: rssi, lastUpdate: new Date()};
    // formula to calculate distance from rssi and tx. need to calibrate it
    // TODO: regression d=A*(rssi/tx)^B+C
    distanceMap[stationID] = Math.pow(10,((txPower - rssi)/(10*2)));
    var id = Items.insert({
      registered: false,
      beaconId: beaconId,
      distances: distances,
      distanceMap: distanceMap,
      lastUpdate: new Date()
    });
    item = Items.findOne({ _id: id });
    return item;
  } else {
    // Update or add new rssi value for this station
    var newDistances = item.distances;
    newDistances[stationID] = {rssi: rssi, lastUpdate: new Date()};
    Items.update(item._id, {$set: {distances: newDistances,
                                   lastUpdate: new Date()}});
    return item;
  }
}


function updateOrCreateStation(stationID, stationIpAddress) {
  var station = Stations.findOne({_id: stationID});
  if (station == null) {
    // No station with such id
    station = Stations.findOne({ ip : stationIpAddress });
    var idToSend;
    if (station == null) {
      // No station with such IP address
      idToSend = Stations.insert({
        registered: false,
        ip: stationIpAddress,
        lastUpdate: new Date()
      });
    } else {
      idToSend = station._id;
      Stations.update(station._id, {$set: {lastUpdate: new Date()}});
    }
    // Send a new id to the station
    try {
      var params = {data: JSON.stringify({"id": idToSend})};
      HTTP.post("http://" + stationIpAddress + ":" + PORT + "/" + SET_ID_ROUTE, {params: params});
    }
    catch (error) {
      addLog("Error", "Couldn't send POST request to " + stationIpAddress);
      console.log("Error", "Couldn't send POST request to " + stationIpAddress);
    }
    return idToSend;
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
    return station._id;
  }
}


function getLocalIP () {
  var os = Npm.require("os");
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


function addLog(tag, message) {
  // console.log(Logs.find({}));
  while (Logs.find({}).count() > 100) {
    var oldLog = Logs.find({}, {sort: {timestamp: 1}, limit: 1}).fetch()[0];
    if (oldLog != null) {
        Logs.remove({_id: oldLog._id});
    }
  }
  Logs.insert({timestamp: new Date(),
               tag: tag,
               message: message});
}

function sendIPAddress () {
  var newestIP = getLocalIP();
  addLog("Broadcasting IP with WIFI", "Web Server IP is " + newestIP);
  console.log("Web Server IP is " + newestIP);
  // Update the ip of UDOO station
  server_ip = "http://" + newestIP + ":3000"
  var fs = Npm.require("fs");
  fs.writeFile("/home/ubuntu/station/ip_address.conf", server_ip, function (err) {
      if (err) console.error(err);
      console.log("Overwrite ip_addrees.conf file with " + server_ip);
  });
  // Notify webapp
  try {
    var params = {data: JSON.stringify({"ip": server_ip})};
    HTTP.post("http://placeholder-ipupdater.meteor.com/set-ip", {params: params});
  }
  catch (error) {
    addLog("Error", "Couldn't send POST request to webapp");
  }
  // Notify stations
  var stations = Stations.find({});
  stations.forEach(function (station) {
    addLog("Broadcasting IP with WIFI", "Broadcasting IP to station " + station.ip);
    console.log("Broadcasting IP to station", station.ip);
    HTTP.get("http://" + station.ip + ":" + PORT + "/" + BROADCAST_IP_ROUTE,
      function (err, res) {
        if (err != null) {
          addLog("Error", "Couldn't broadcast IP to " + station.ip);
          console.log("Error", "Couldn't broadcast IP to " + station.ip);
        }
      });
  });
}