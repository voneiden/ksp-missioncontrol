websocket = null;
xxx = null;

function ws_connect(ip, port)
{
    var uri = "ws://" + ip + ":" + port + "/mcs"
    console.log(uri);
    websocket = new WebSocket(uri); 
    websocket.onopen = function(evt) { ws_open(evt) }; 
    websocket.onclose = function(evt) { ws_close(evt) }; 
    websocket.onmessage = function(evt) { ws_receive(evt) }; 
    websocket.onerror = function(evt) { ws_error(evt) }; 
}
function ws_open(event)
{
    websocket.send("subscribe");
    close_mainmenu();
}

function ws_receive(event)
{
    //console.log(event);
    var data = JSON.parse(event.data);
    var obj;
    
    if (data.state){
        //console.log("UPDATE");
        //console.log(data);
        if (data.state.active_vessel) {
            globals.active_vessel = globals.vessels[data.state.active_vessel];
        }
        else {
            globals.active_vessel = false;
        }
        globals.frame_angle = data.state.frame_angle;
        globals.frame_rotrix = rotZ(-globals.frame_angle);
        globals.ut = data.state.ut;
        globals.throttle = data.state.throttle;
        refreshState();
    }

    if (data.celestials) {
        globals.celestials = new Array();
        for (var i=0; i < data.celestials.length; i++) {
            var celestial = data.celestials[i];
            celestial.position = Vector.create([celestial.rv[0], celestial.rv[1], celestial.rv[2]]);
            celestial.velocity = Vector.create([celestial.rv[3], celestial.rv[4], celestial.rv[5]]);
            
            // Fix the rotation
            console.log("Fixing the rotation");
            console.log(globals.frame_angle);
            
            celestial.position = globals.frame_rotrix.multiply(celestial.position);
            celestial.velocity = globals.frame_rotrix.multiply(celestial.velocity);
            
            celestial.ang_v = rad2deg(celestial.ang_v);
            
            celestial.t0 = 0.0;
            globals.celestials[celestial.name] = celestial;
            globals.determine_orbit_constants(globals.celestials[celestial.name]);
        }
    }
    if (data.vessels) {
        globals.vessels = new Array();
        for (var i=0; i < data.vessels.length; i++) {
            var vessel = data.vessels[i];
            
            vessel.position = Vector.create([vessel.rv[0], vessel.rv[1], vessel.rv[2]]);
            vessel.velocity = Vector.create([vessel.rv[3], vessel.rv[4], vessel.rv[5]]);
            vessel.t0 = vessel.ut;
            
            vessel.position = globals.frame_rotrix.multiply(vessel.position);
            vessel.velocity = globals.frame_rotrix.multiply(vessel.velocity);
            
            globals.vessels[vessel.uid] = vessel;
            globals.vessels.push(vessel);
            globals.determine_orbit_constants(vessel);
            
            //console.log("Latitude (official): " + vessel.lat);
            //console.log("Longitude(official): " + vessel.lon);
            
            //lon = Math.atan2(vessel.position.e(1), vessel.position.e(2))
            //lon = Math.atan(vessel.position.e(1) / vessel.position.e(2));
            
            var ref = globals.celestials[vessel.ref]
            if (ref.rotrix_timestamp != vessel.ut) {
                ref.rotrix_timestamp = vessel.ut;
                ref.rotrix = rotZ(ref.rotation_angle); // TODO: initial_rotation ?
            }
            
            
            var rot_position = ref.rotrix.multiply(vessel.position);
            var uni_position = rot_position.toUnitVector();
            
            var lat = Math.asin(uni_position.e(3));
            var lon = Math.atan2(uni_position.e(1), uni_position.e(2));

            //console.log("Latitude (calc):     " + rad2deg(lat));
            //console.log("Longitude(calc):     " + rad2deg(lon));
            
        }
        //for (var i = globals.groundtracks.length; i>0; i--) {
        //    var groundtrack = globals.groundtracks[i];
        //    groundtrack.
        //}
        //onResize();
    }
    
    
    xxx = event.data;
}

function ws_error(event)
{
    console.log(event);
}

function ws_close(event)
{
    console.log(event);
}