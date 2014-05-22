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
    var refresh = false;
    
    if (data.state){
        //console.log("UPDATE");
        //console.log(data);
        if (data.state.active_vessel && globals.vessels[data.state.active_vessel]) {
            globals.active_vessel = globals.vessels[data.state.active_vessel];
        }
        else {
            globals.active_vessel = false;
        }
        globals.frame_angle = -data.state.frame_angle;
        globals.frame_rotrix = rotZ(globals.frame_angle);
        globals.ut = data.state.ut;
        globals.throttle = data.state.throttle;
        refresh = true;

    }

    if (data.celestials) {
        globals.celestials = new Array();
        for (var i=0; i < data.celestials.length; i++) {
            var celestial = data.celestials[i];
            celestial.position = Vector.create([celestial.rv[0], celestial.rv[1], celestial.rv[2]]);
            celestial.velocity = Vector.create([celestial.rv[3], celestial.rv[4], celestial.rv[5]]);
            
            // Fix the rotation
            //console.log("Fixing the rotation");
            //console.log(globals.frame_angle);
            
            celestial.position = globals.frame_rotrix.multiply(celestial.position);
            celestial.velocity = globals.frame_rotrix.multiply(celestial.velocity);
            
            celestial.ang_v = rad2deg(celestial.ang_v);
            
            celestial.t0 = 0.0;
            globals.celestials[celestial.name] = celestial;
            globals.determine_orbit_constants(globals.celestials[celestial.name]);

            // DEBUG Testing mEp

            if (celestial.name == "Sun") { continue; }
            var rv = determine_rv_at_t(globals.celestials[celestial.name], 0);
            console.log(rv);
            var test = new Object();

            test.position = rv[0]
            test.velocity = rv[1]
            test.t0 = 0;
            test.ref = celestial.ref;
            console.log("Ref",test.ref);
            determine_orbit_constants(test);
            determine_orbit_elements(test);

            var n = Vector.create([0, 0, 1]).cross(test.h);
            console.log(celestial.name, "mEp", rad2deg(Math.acos(n.dot(test.position) / (n.modulus() * test.position.modulus()))));

        }
    }
    if (data.vessels) {
        //globals.vessels = new Array();
        for (var i=0; i < data.vessels.length; i++) {
            var vessel_data = data.vessels[i];


            //if (globals.active_vessel && globals.active_vessel.uid == vessel.uid) {
            //    globals.active_vessel = vessel;
            //}
            //else {
            //    console.log("nope");
            //}
            vessel_data.position = Vector.create([vessel_data.rv[0], vessel_data.rv[1], vessel_data.rv[2]]);
            vessel_data.velocity = Vector.create([vessel_data.rv[3], vessel_data.rv[4], vessel_data.rv[5]]);
            vessel_data.t0 = vessel_data.ut;

            vessel_data.position = globals.frame_rotrix.multiply(vessel_data.position);
            vessel_data.velocity = globals.frame_rotrix.multiply(vessel_data.velocity);

            globals.determine_orbit_constants(vessel_data);

            //console.log("Latitude (official): " + vessel.lat);
            //console.log("Longitude(official): " + vessel.lon);
            
            //lon = Math.atan2(vessel.position.e(1), vessel.position.e(2))
            //lon = Math.atan(vessel.position.e(1) / vessel.position.e(2));
            
            var ref = globals.celestials[vessel_data.ref]
            if (ref.rotrix_timestamp != vessel_data.ut) {
                ref.rotrix_timestamp = vessel_data.ut;
                ref.rotrix = rotZ(ref.rotation_angle + ref.ang_v * (vessel_data.ut - ref.rotation_t0))//); // TODO: initial_rotation ?
            }
            
            
            var rot_position = ref.rotrix.multiply(vessel_data.position);
            var uni_position = rot_position.toUnitVector();
            
            var lat = Math.asin(uni_position.e(3));
            var lon = Math.atan2(uni_position.e(1), uni_position.e(2));

            /*
            if (globals.active_vessel && globals.active_vessel.uid == vessel_data.uid) {
                var tmp = LatLonAtUT(globals.active_vessel, vessel_data.ut);
                console.log("LATLON", rad2deg(tmp[0]), "and",rad2deg(tmp[1]));
                console.log("TERRORl",  vessel_data);
            }
            */
            //console.log("Latitude (calc):     " ,rad2deg(lat), "vs", vessel_data.lat);
            //console.log("Longitude(calc):     " ,rad2deg(lon), "vs", vessel_data.lon);

            if (!globals.vessels[vessel_data.uid]) {
                // Vessel uid does not exist in database. Insert the received data as the vessel object
                globals.vessels[vessel_data.uid] = vessel_data;
                globals.vessels.push(vessel_data); // TODO should really consider switching to object keys
            }
            else {
                // Living dangerously..
                //globals.vessels[vessel.uid] = vessel; NO DONT DO THAT GOOD GRIEF

                // Perform a copy for now until object keys is implemented
                var stored_vessel = globals.vessels[vessel_data.uid]
                for (var elements in vessel_data) {
                    stored_vessel[elements] = vessel_data[elements];
                }
            }
            
        }
        //for (var i = globals.groundtracks.length; i>0; i--) {
        //    var groundtrack = globals.groundtracks[i];
        //    groundtrack.
        //}
        //onResize();
    }
    
    
    xxx = event.data;
    if (refresh) {
        //console.log(globals.active_vessel);
        //console.log("AE POS4", globals.active_vessel.position.e(1), globals.active_vessel.position.e(2), globals.active_vessel.position.e(3));
        var ticks_start = new Date().getTime();
        refreshGroundtracks();
        refreshState();
        var ticks = new Date().getTime() - ticks_start;
        ticks /= 1000;
        $(".debug-groundtrack-ticks").text(ticks.toFixed(3))
    }
}

function ws_error(event)
{
    console.log(event);
}

function ws_close(event)
{
    console.log(event);
}