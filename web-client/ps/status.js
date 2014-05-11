/**
 * Created by voneiden on 9.5.2014.
 */

function get_status() {
    // Find existing status element that does not exist in the DOM
    var status;
    for (var i = globals.status.length; i>0; i--)
    {
        status = globals.status[i-1];
        if (jQuery.contains(document.documentElement, status[0])) { continue }
        else { return status };
    }

    // A new status-element needs to be created
    var id = "status-" + (globals.status.length + 1);
    //$('<canvas id="' + id + '">').appendTo("#hidden");

    // Take a copy of status-0-root element
    var root = $("#status-0-root").clone();
    var launch = root.children("#status-0-launch");

    // Rename ID's
    root.attr("id", root.attr("id").replace("status-0", id));
    launch.attr("id", launch.attr("id").replace("status-0", id));

    id += "-root";

    // Create storage object and push the element in the array
    var status = new Object();
    globals.status[id] = status;
    globals.status.push(root);

    // Bind events

    // Refresh
    status_update(id);

    return root;

    /*
    plotter = $("#"+id);
    console.log(plotter);
    plotter_initialize(id);
    plotter_set_mode(id, "solar");
    plotter.mousedown(onPlotterMouseDown);
    plotter.bind("contextmenu", function() { return false; }); // Disable right click context menu
    plotter.mousewheel(onPlotterMouseWheel);
    plotter.mousemove(onPlotterMouseMove);
    globals.plotters.push(plotter); // Save it
    */
}

function status_update(id){
    //console.log("Status update:", id)
    var root = $("#"+id);
    var status = globals.status[id];
    var launch = root.children("div[id$=launch]");

    // Set up default status mode
    if (!status.mode) {
        status.mode = 0;
        launch.hide(0);
    }
    // If we are in prelaunch or suborbital, display launch window
    if (globals.active_vessel) {

        var state = globals.active_vessel.state;
        if (state == "suborbital" || state == "flying" || state == "prelaunch"  || state == "landed") {
            if (status.mode != 1) {
                launch.show(0);
                status.mode = 1;
            }
        }
        else {
            console.log("UNKNOWN STATE");
            console.log(globals.active_vessel.state);
        }
        var LatLon = LatLonAtUT(globals.active_vessel, globals.ut);
        var lat = Math.round(rad2deg(LatLon[0]) * 100) / 100;
        var lon = Math.round(rad2deg(LatLon[1]) * 100) / 100;
        var alt = Math.round(globals.active_vessel.alt) + " m";
        var inc = Math.round(globals.active_vessel.elements[2] * 10) / 10;
        var alt_apo = Math.round(globals.active_vessel.alt_apo) + " m";
        var srf_v = Math.round(globals.active_vessel.srf_v * 10) / 10 + " m/s";
        var pressure_d = Math.round(0.5 * globals.active_vessel.pressure_d * Math.pow(globals.active_vessel.srf_v, 2) * 10) / 10;
        var rot = globals.active_vessel.rot;

        // Unity exports the rotation as X Y Z, the plugin sends it in "Y X Z" to us,
        // However it seems to be totally backwards, so the final map is
        // X -> Y -> Z
        // Y -> X -> Y
        // Z -> Z -> X
        // This is really based more on trial and error than anything......
        var rot_x = rot[2];
        var rot_y = rot[1];
        var rot_z = rot[0];


        // World up vector, which points "north"
        var ksp_up_vector = Vector.create([1, 0, 0]);

        // World forward vector..
        var ksp_forward_vector = Vector.create([0, 0, 1]); //

        // Apply the euler rotations
        var vessel_up = rotZ(rot_z).multiply(rotY(rot_y).multiply(rotX(rot_x).multiply(ksp_up_vector)));
        var vessel_forward = rotZ(rot_z).multiply(rotY(rot_y).multiply(rotX(rot_x).multiply(ksp_forward_vector)));

        // Apply rotating frame of reference
        vessel_up = rotZ(-globals.frame_angle).multiply(vessel_up);
        vessel_forward = rotZ(-globals.frame_angle).multiply(vessel_forward);

        var north = Vector.create([0,0,1]);

        // Calculate position unit vector TODO: should position be calculated with the physics engine?
        var position = globals.active_vessel.position.toUnitVector();
        var right = vessel_forward.cross(position).toUnitVector();

        // Calculate east unit vector
        var east = north.cross(position).toUnitVector();

        // "Magnetic north" for mnorth-east plane
        //var mnorth = east.cross(globals.active_vessel.position).toUnitVector();
        var mnorth = position.cross(east).toUnitVector();

        // Calculate pitch
        var pitch = -(rad2deg(vessel_forward.angleFrom(globals.active_vessel.position))-90);

        // Calculate yaw
        var yaw_east_component = east.dot(vessel_forward);
        var yaw_mnorth_component = mnorth.dot(vessel_forward);
        var yaw = rad2deg(Math.atan2(-yaw_east_component, yaw_mnorth_component));
        if (yaw < 0) { yaw += 360; }

        // calculate roll
        var roll_position_component = position.dot(vessel_up);
        var roll_right_component = right.dot(vessel_up);
        var roll = rad2deg(Math.atan2(roll_right_component, -roll_position_component));

        var a = vessel_forward.toUnitVector();
        var b = globals.active_vessel.position.toUnitVector()
        var c = vessel_up.toUnitVector();
        //rot = "<br>" + a.e(1) + ", " + a.e(2) + ", " + a.e(3) + "<br>"
        //rot +=b.e(1) + ", " + b.e(2) + ", " + b.e(3) + "<br>"
        //rot +=c.e(1) + ", " + c.e(2) + ", " + c.e(3) + "<br>"
        rot = "Pitch: " + pitch + "<br>";
        rot += "Yaw  : " + yaw + "<br>";
        rot += "Roll : " + roll + "<br>";
        //console.log("NIG");
        //console.log(rot);
        //console.log(rotZ(rot_z).multiply(forward_vector));
        launch.find(".status-av-lon").text(lon); // TODO should the lon be calculated?
        launch.find(".status-av-lat").text(lat);
        launch.find(".status-av-alt").text(alt);
        launch.find(".status-av-inc").text(inc);
        launch.find(".status-av-apo").text(alt_apo);
        launch.find(".status-av-v").text(srf_v);
        launch.find(".status-av-dp").text(pressure_d);
        launch.find(".status-av-rot").html(rot);

        //console.log("Check");
        // If prelaunch, hide orbital information
        //var launch_orbit = launch.children(".status-launch-current");
        //launch_orbit.hide(0);
    }
    else {

    }
}