/*
 * plotter.js - Provides canvas drawing functions for orbit trajectory plotting
 * For a license, see: https://github.com/voneiden/ksp-missioncontrol/blob/master/LICENSE.md
 */

plotter_data = new Object(); // Container for plotter objects to store variables

/*
 * Returns a free plotter object or creates a new one if necessary
 */
function get_plotter()
{
    var plotter;
    for (var i = globals.plotters.length; i>0; i--)
    {
        plotter = globals.plotters[i-1];
        if (jQuery.contains(document.documentElement, plotter[0])) { continue }
        else { return plotter };
    }
    
    // A new plot needs to be created
    var id = "plotter-" + (globals.plotters.length + 1);
    $('<canvas id="' + id + '">').appendTo("#hidden");
    plotter = $("#"+id);
    console.log(plotter);
    plotter_initialize(id);         
    //plotter_set_mode(id, "solar");
    plotter.mousedown(onPlotterMouseDown);
    plotter.bind("contextmenu", function() { return false; }); // Disable right click context menu
    plotter.mousewheel(onPlotterMouseWheel);
    plotter.mousemove(onPlotterMouseMove);
    globals.plotters.push(plotter); // Save it
    
    return plotter;
}



/* 
* Calculates a rotation matrix for 3D plot objects
* The matrix allows rotation through X axis and Z axis
*/
function calculate_rotation_matrix(rotation_vector) 
{
    var rot_x = Matrix.RotationX(rotation_vector.e(1))
    var rot_z = Matrix.RotationZ(rotation_vector.e(3))
    
    return rot_x.multiply(rot_z)
}

function create_celestial_circle(color)
{ // TODO Error here, no scope defined
    var circle = new paper.Path.Circle(new Point(0,0), 1);
    circle.fillColor = color;
    return circle;
}


/*
* Initializes (a) plotter canvas
*/ 
function plotter_initialize(canvas) {
    // Setup the environment
    var plotter = new Object();
    plotter_data[canvas] = plotter;

    plotter.scope = new paper.PaperScope();
    plotter.scope.setup(canvas);
    var scope = plotter.scope;
    
    plotter_setup(canvas);

}

function plotter_setup(canvas, ref) {
    if (!ref) {
        if (globals.active_vessel) {
            ref = globals.active_vessel.ref;
        }
        else {
            ref = "Kerbin";
        }
    }
    
    var plotter = plotter_data[canvas];
    var scope = plotter.scope;

    scope.project.clear();

    if (!globals.celestials[ref]) { console.error("Reference undefined"); return; }
    plotter.ref = ref;                  // Reference object
    plotter.camera = NaN;               // Camera position
    plotter.main_layer = new scope.Layer();
    plotter.main_layer.activate();

    // TODO clear old visible objects!

    // Check what objects to render
    plotter.visible_objects = new Object();
    plotter_find_visible_objects(plotter);

    // Determine furthest (child) object to initialize canvas pos
    var ut = globals.ut || 0;
    var distance = globals.celestials[ref].radius;
    var keys = Object.keys(plotter.visible_objects);
    for (var i=0; i < keys.length; i++) {
        var uid = keys[i];
        var data_object = plotter.visible_objects[uid].object;
        if (data_object.ref == globals.celestials[plotter.ref].name) {
            var object_distance = determine_rv_at_t(data_object, ut)[0].modulus();
            if (object_distance > distance) { distance = object_distance; }
        }
    }

    console.log("Peak distance determined as",distance)
    //var r = determine_rv_at_t(globals.celestials[ref], ut)[0];
    plotter.camera = Vector.create([0, 0, -object_distance]);
    plotter.camera_rotz = 0
    plotter.camera_rotx = 0
    plotter.camera_roty = 0

    //plotter.camera_ut = ut;
    //plotter.camera_utr = r;
    //console.log(plotter.camera_utr);
    plotter_draw(canvas);

}

function plotter_find_visible_objects(plotter) {
    // This function determines what objects to
    // render and creates necessary graphic elements
    // for those objects.

    // plotter.visible_objects is a Object
    // local variable found_objects is an array

    // Clear the main  layer and remove any traces of previous visible objects
    plotter.main_layer.activate();
    plotter.main_layer.removeChildren();
    if (plotter.visible_objects) {
        var visible_objects_keys = Object.keys(plotter.visible_objects);
        for (var i=0; i < visible_objects_keys.length; i++) {
            var uid = visible_objects_keys[i];
            var render_object = plotter.visible_objects[uid];
            if (render_object.marker) {
                render_object.marker.remove();
            }
            if (render_object.trajectory) {
                console.log("Remove trajectory layer");
                render_object.trajectory.remove();
            }
            else {
                console.log("No trajectory for " + render_object.name)
                console.log(render_object)
            }
        }

        delete plotter.visible_objects;
        plotter.visible_objects = new Object();
    }

    console.log("DEBUG PLOTTER_FIND_VISIBLE_OBJECTS")
    var visible_objects = new Array();

    // Browse through celestial objects
    // and fill visible_objects
    var keys = Object.keys(globals.celestials);
    var ref = globals.celestials[plotter.ref];
    for (var i=0; i < keys.length; i++) {
        var celestial = globals.celestials[keys[i]];

        // Skip objects that we've found already
        if (visible_objects.indexOf(celestial) != -1) { continue; }

        // Child objects
        if (celestial.ref == ref.name) { visible_objects.push(celestial); }

        // Myself, duh
        else if (celestial.name == ref.name) { visible_objects.push(celestial); }

        // Parent object
        else if (ref.ref == celestial.name) { visible_objects.push(celestial); }

        // Parent of parent object
        else if (globals.celestials[ref.ref] && globals.celestials[ref.ref].ref == celestial.name) {visible_objects.push(celestial); }
    }
    console.log("DEBUG 2")
    // Create graphics for new objects
    for (var i=0; i < visible_objects.length; i++) {
        var object = visible_objects[i];

        // Define unique identifier for the object (vessels have uid, planets have names)
        var uid;
        if (typeof object.uid != 'undefined') { uid = object.uid; }
        else { uid = object.name; }

        if (typeof uid == 'undefined') {
            console.log("ERROR ERRROR ERROR")
            console.log(object)
            console.log(object.uid)
            console.log(object.name)
        }
        console.log("DEBUG 3: " + uid)
        if (!visible_objects[uid]) {
            console.log("DEBUG 4")
            // Determine object color
            var color;
            if (uid == "Sun") { color = "yellow"; }
            else if (uid == "Moho") { color = "red"; }
            else if (uid == "Eve") { color = "purple"; }
            else if (uid == "Kerbin") { color = "SpringGreen"; }
            else if (uid == "Duna") { color = "orange"; }
            else if (uid == "Dres") { color = "grey"; }
            else if (uid == "Jool") { color = "lime"; }
            else if (uid == "Eeloo") { color = "cyan"; }
            else if (uid == "Mun") { color = "grey"; }
            else if (uid == "Minmus") { color = "turquoise" }

            else {
                var choices = ["red","green","cyan","purple","yellow"]
                color = choices[Math.floor(Math.random()*choices.length)];
            }


            // Determine size
            var size;
            if (!object.radius) {
                size = 10;
            }
            else { size = object.radius; }

            var render_object = new Object();

            render_object.color = color;
            render_object.size = size;
            render_object.object = object;
            render_object.uid = uid;
            render_object.scale = 1;

            plotter.main_layer.activate();
            console.log("NEW MARKER GENERATED");
            console.log(plotter.main_layer);
            console.log(paper.project.activeLayer);
            render_object.marker = new paper.Path.Circle(plotter.scope.view.center, size);
            console.log(render_object.marker.layer);
            console.log("###");
            render_object.marker.fillColor = color;
            plotter_generate_trajectory(plotter, render_object);
            plotter.visible_objects[uid] = render_object;

        }
    }

    // Check vessels
    /*
    keys = Object.keys(globals.vessels);
    for (var i=0; i < keys.length; i++) {
        var vessel = globals.vessels[keys[i]];
        if (vessel.ref == ref && visible_objects.indexOf(vessel) == -1) {
            console.log("Add ref", vessel.name);
            visible_objects.push(vessel);
        }
        else {
            console.log("Skip ref");
        }
    }
    */
}
function plotter_generate_trajectory(plotter, render_object) {
    var steps = 10;

    if (render_object.object.e >= 1 || isNaN(render_object.object.period)) {
        render_object.trajectory_data = false;
        render_object.trajectory = false;
    }
    else {
        render_object.trajectory_data = new Array();
        if (render_object.trajectory) {
            render_object.trajectory.remove();
        }
        console.log("NEW T-LAYER GENERATED")
        if (render_object.trajectory) {
            console.log("Removing old tlayer")
            render_object.trajectory.remove()
        }
        render_object.trajectory = new plotter.scope.Layer();
        render_object.trajectory.position = plotter.scope.view.center;

        for (var i=0; i < steps; i++) {
            ut = i / steps * render_object.object.period;
            render_object.trajectory_data.push(plotter_determine_relative_position(plotter, render_object.object, globals.celestials[plotter.ref], ut));
        }
    }
}


/* Creates new celestial planet and trajectory */
function create_plot_celestial(plotter, name, size, color)
{ 
    var scope = plotter.scope;
    
    plotter.C[name] = new scope.Path.Circle(scope.view.center, size);
    plotter.C[name].fillColor = color;
    plotter.C[name].visible = true;
    plotter.T[name] = new scope.Path({closed: true, visible: true, strokeColor: color});
    for (var i = 0; i < 10; i++) {
        plotter.T[name].add(new scope.Point(0, 0));
    }
}
/* Creates a new marker with text */
function create_plot_marker(plotter, color)
{   
    var scope = plotter.scope;
    
    var marker = new scope.Group({visible: false});
    marker.addChild(new scope.Path.Line(new scope.Point(0, -10), new scope.Point(0, -5)));
    marker.addChild(new scope.Path.Line(new scope.Point(0, 10),  new scope.Point(0, 5)));
    marker.addChild(new scope.Path.Line(new scope.Point(-10, 0), new scope.Point(-5, 0)));
    marker.addChild(new scope.Path.Line(new scope.Point(10, 0),  new scope.Point(5, 0)));
    var text = new scope.PointText(new scope.Point(20, 10));
    marker.addChild(text);
    marker.text = text;
    marker.strokeColor = "lime";
    return marker;
}

/*
 * This function must be called if the canvas needs to be resized
 * It resizes the canvas, paper and calculates view size
 */
function plotter_resize(canvas, width, height)
{
    var plot = plotter_data[canvas];
    var scope = plot.scope;
    scope.view.setViewSize(width, height);
    if (scope.view.center.x > scope.view.center.y) { plot.view_size = scope.view.center.y; }
    else { plot.view_size = scope.view.center.x; }
}


function plotter_determine_relative_position(plotter, object, reference, ut) {
    var uid = object.uid || object.name;
    var relative_position;

    // Check if result is already generated
    if (ut == plotter.celestial_positions_ut && plotter.celestial_positions[uid]) {
        return plotter.celestial_positions[uid];
    }

    // 1) Object is the reference
    if (uid == reference.name) {
        relative_position = Vector.create([0,0,0]);
    }
    // 2) Object is a child of the reference
    else if (object.ref == reference.name) {
        relative_position = determine_rv_at_t(object, ut)[0]; // The position returned is relative to reference
    }
    // 3) Object is a sibling of the reference
    else if (uid != "Sun" && object.ref == reference.ref) {
        //console.log("insanity", object.ref, object, reference);
        //return false;
        console.log("rpos", uid);
        console.log("rnam", reference.name);
        var relative_position_to_parent = determine_rv_at_t(object, ut)[0]; // The position is relative to the parent of the reference
        var relative_position_of_parent = plotter_determine_relative_position(plotter, globals.celestials[object.ref], reference, ut);
        var relative_position = relative_position_of_parent.sum(relative_position_to_parent);
    }
    // 4) Parent of the reference
    else if (uid == reference.ref) {
        var reference_position = determine_rv_at_t(reference, ut)[0];
        var relative_position = reference_position.multiply(-1);
    }
    // 5) Parent of the reference parent
    else if (reference.ref && uid == globals.celestials[reference.ref].ref) {
        /*
        var reference_position = plotter.celestial_positions[reference.name];
        var parent_position;
        if (!plotter.celestial_positions[reference.ref]) {
            plotter_determine_re
            parent_position = plotter.celestial_positions[reference.ref]
        }
        else {
            parent_position = determine_rv_at_t(globals.celestials[reference.ref], ut);
            plotter.celestial_positions[reference.ref] = parent_position;
        }
        var relative_position = reference_position.add(parent_position).multiply(-1);
        plotter.celestial_positions[uid]= relative_position;
        */
        console.error("Unsupported reference mode");
    }
    else {
        console.error("Body has too many references!")
        return;
    }
    if (ut == plotter.celestial_positions_ut) { plotter.celestial_positions[uid] = relative_position; }
    return relative_position;
}
/*
* This function updates the canvas
* with correct positions taking into consideration
* camera rotation.
*/
function plotter_draw(canvas) { // TODO implement camera as simple distance and rotations angles insteead of vectors
    var plotter = plotter_data[canvas];
    var scope = plotter.scope;
    var reference = globals.celestials[plotter.ref]; // Pointer to the actual ref object
    
    var ut = globals.ut || 0;
    var fov = 1; // 90 degree FoV

    // TESTING
    plotter_find_visible_objects(plotter);

    plotter.main_layer.activate(); // Draw most of the stuff on this layer
    console.log("Main layer activated")
    console.log(plotter.main_layer)
    var rotz = Matrix.RotationZ(plotter.camera_rotz);
    var rotx = Matrix.RotationX(plotter.camera_rotx);
    var rotrix = rotx.multiply(rotz);

    // Render celestials
    plotter.celestial_positions = new Object();
    plotter.celestial_distance = new Object();
    // Loop through all visible objects
    var keys = Object.keys(plotter.visible_objects);
    for (var i = 0; i < keys.length; i++) {
        var uid = keys[i];
        var render_object = plotter.visible_objects[uid];
        console.log("MCHECK: ", render_object.uid, render_object.marker.layer);
        var relative_position = plotter_determine_relative_position(plotter, render_object.object, reference, ut);
        var render_position = rotrix.multiply(relative_position).subtract(plotter.camera);

        // Store distance for depth sorting
        plotter.celestial_distance[render_position.e(3)] = render_object;

        var render_scale = fov / render_position.e(3) * scope.view.center.y;
        if (render_scale < 0) {
            render_object.marker.visible = false;
            if (render_object.trajectory) {
                render_object.trajectory.visible = false;
            }
            continue;
        }

        var x = render_scale * render_position.e(1);
        var y = render_scale * render_position.e(2);

        // Scale the marker
        var render_size = render_scale * render_object.size
        if (render_size < 2) { render_size = 2; }

        // Texture rendering
        // TODO: doesn't delete the texture after use?
        if (render_size > 3 && uid == "Kerbin" && false) {
            // Attempt to texture the celestial
            var ticks = new Date().getTime();
            // Remove the old texture
            if (plotter.reference_texture) {
                plotter.reference_texture.remove();
            }
            // First, load a  new raster texture
            if (!plotter.reference_map) {
                plotter.reference_map = new scope.Raster('img/kerbin2.png');
                plotter.reference_map.visible = false;
            }
            var texture_input = plotter.reference_map;
            var texture_output = new plotter.scope.Raster();

            // Limit output size
            var output_size = parseInt(render_size*2);
            var output_scale;
            if (output_size > 64) {
                output_scale = output_size / 64;
                output_size = 64;
            }
            else { output_scale = 1; }

            texture_output.size = new scope.Size(output_size, output_size);
            texture_output.scale(output_scale);

            // TODO: Apply day night shading
            // TODO: convert to raster
            // rotx 0 = straight above (latitude 90)
            // rotx -pi = straight below (latitude -90)
            var theta = deg2rad(render_object.object.rotation_angle + render_object.object.ang_v * (ut - render_object.object.rotation_t0));
            //console.log(rad2deg(plotter.camera_rotz), rad2deg(theta));

            var latitude = plotter.camera_rotx + Math.PI/2; // add 90 to bring to to range [-90, 90]
            var longitude = (plotter.camera_rotz - theta + Math.PI) % (Math.PI*2); // Range [0, 360]

            if (longitude < 0) { longitude += Math.PI*2;}

            //console.log(rad2deg(longitude));
            //var longitude = 0;
            //console.log(latitude)

            var radius = texture_output.width / 2;
            var ux, uy, d, input_latitude, input_longitude, c, p, P, input_y, input_x;

            // ux, uy are unit x-y coordinates on a circle
            // d is the distance from center
            // input_latitude & longitude are used to retrieve pixels from texture_input
            // c, p, P, helper variables
            // http://pubs.usgs.gov/pp/1395/report.pdf
            // p == d
            // c == arcsin(d)
            P = plotter.camera.modulus() / render_object.object.radius; // Distance of camera
            for (var x=0; x < texture_output.width; x++) {
                for (var y=0; y < texture_output.height; y++) {
                    ux = (x - radius) / radius;
                    uy = -(y - radius) / radius;

                    d = Math.sqrt(Math.pow(ux, 2) + Math.pow(uy, 2));

                    if (d >= 1) {
                        texture_output.setPixel(x, y, [0,0,0,0]);
                    }
                    else {
                        /*
                        delta_latitude = (latitude + rad2deg(Math.asin(uy)));
                        delta_longitude = ((longitude + rad2deg(Math.asin(ux))) + 360);

                        if (delta_latitude > 180) {
                            delta_latitude = 360 - delta_latitude%360;
                            delta_longitude += 180;
                        }
                        else if (delta_latitude < 0) {
                            delta_latitude = -delta_latitude
                            delta_longitude += 180;
                        }
                        */
                        if (d == 0) {
                            input_latitude = rad2deg(latitude)+90;
                            input_longitude = rad2deg(longitude);
                            //console.log("d0lat",input_latitude)
                            //console.log("d0lon",input_longitude)
                        }
                        else {
                            c = Math.asin(d)
                            //a = P - Math.sqrt((1 - Math.pow(d, 2) * (P + 1) / (P - 1)))
                            //b = (P - 1) / d + d / (P - 1);

                            //c = Math.asin(a / b)
                            //console.log("P",P,"c",c);
                            //console.log("a",a,"b",b,"d",d);
                            input_latitude = rad2deg(Math.asin(Math.cos(c) * Math.sin(latitude) +
                                                       uy * Math.sin(c) * Math.cos(latitude) / d));

                            input_longitude = rad2deg(longitude) + rad2deg(Math.atan2(ux * Math.sin(c),
                                                                       d * Math.cos(latitude) * Math.cos(c) - uy * Math.sin(latitude) * Math.sin(c)));
                            //input_longitude = rad2deg(longitude) + rad2deg(Math.atan(ux * Math.sin(c) /
                            //                                               Math.cos(latitude) * Math.cos(c) - uy * Math.sin(latitude) * Math.sin(c)));
                            //input_longitude = rad2deg(longitude) + rad2deg(Math.atan2(Math.cos(latitude) * Math.cos(c) - uy * Math.sin(latitude) * Math.sin(c),
                            //                                               ux * Math.sin(c)));


                            input_latitude = (input_latitude+450)%180;   // Scale latitude to 0-180
                            input_longitude = (input_longitude+360)%360;
                        }
                        //console.log("ilat", input_latitude);
                        //console.log("ilon", input_longitude);

                        input_y = (180-input_latitude) / 180 * texture_input.height;
                        input_x = input_longitude / 360 * texture_input.width;

                        //console.log("Input x", input_x, texture_input.height);
                        //console.log("Input y", input_y, texture_input.width);
                        texture_output.setPixel(x, y, texture_input.getPixel(input_x, input_y));
                        //texture_output.setPixel(x, y, [0, input_y/180 ,0]);
                    }
                }
            }


            texture_output.position = scope.view.center;
            render_object.marker.visible = false;
            plotter.reference_texture = texture_output;
            console.log("Time taken:", new Date().getTime() - ticks);
        }
        else {

            if (uid == "Kerbin" && plotter.reference_texture) {
                plotter.reference_texture.remove();
                plotter.reference_texture = null;
            }
            // Just draw the marker
            render_object.marker.visible = true;

            var render_marker_scale = render_size / render_object.size;
            var required_marker_scale = render_marker_scale / render_object.scale;

            render_object.marker.scale(required_marker_scale);
            render_object.scale = render_marker_scale;

            // Position the marker
            render_object.marker.position.x = x + scope.view.center.x;
            render_object.marker.position.y = y + scope.view.center.y;

            // Draw the trajectory

            if (render_object.trajectory_data.length) {

                // Clear the old group
                render_object.trajectory.removeChildren();
                render_object.trajectory.activate();

                var current_path = false;


                // Loop through segments
                for (var ti=0; ti < render_object.trajectory_data.length; ti++) {

                    render_position = rotrix.multiply(render_object.trajectory_data[ti]).subtract(plotter.camera);
                    render_scale = fov / render_position.e(3) * scope.view.center.y;

                    // Check if point is beyond the camera
                    // TODO wtf? current_path is not defined anywhere
                    if (render_scale < 0.000001) {
                        if (current_path) {
                            if (current_path.segments.length < 3) {
                                current_path.visible = false;
                            }
                            //current_path.smooth();
                            current_path.fullySelected = true;
                            current_path = false;

                        }
                        continue;
                        //render_object.trajectory.visible = false;
                        //break;
                    }
                    else if (!current_path) { // Create a new path
                        current_path = new scope.Path();
                        current_path.strokeColor = render_object.color;
                    }
                    x = render_scale * render_position.e(1);
                    y = render_scale * render_position.e(2);

                    // Position the marker
                    //render_object.trajectory.segments[ti].point.x = x + scope.view.center.x;
                    //render_object.trajectory.segments[ti].point.y = y + scope.view.center.y;

                    current_path.add(new scope.Point(x + scope.view.center.x, y + scope.view.center.y));
                    //render_object.trajectory.segments[].point = new plotter.scope.Point(x + scope.view.center.x, y + scope.view.center.y)
                    //console.log(uid,"ti",ti,render_object.trajectory.segments[ti].point)

                }
                if (current_path) {
                    current_path.smooth()
                    //current_path.fullySelected = true;
                }
                //render_object.trajectory.smooth()
                //render_object.trajectory.fullySelected = true;
            }

        }

    }

    // Depth sorting of markers
    var keys = Object.keys(plotter.celestial_distance);
    keys.sort(function (a, b) { return parseFloat(a) - parseFloat(b)});
    for (var i = keys.length-1; i >= 0; i--) {
        // Looping from farthest to closest
        var render_object = plotter.celestial_distance[keys[i]];
        console.log("Marker of depth", keys[i]);
        console.log(render_object);
        console.log(render_object.marker);
        console.log(render_object.marker.layer);
        console.log("---");
        render_object.marker.bringToFront();
        if (render_object.object.name == plotter.ref && plotter.reference_texture) {
            plotter.reference_texture.bringToFront();
        }
    }
    /*
    // Todo calculate on demand
    var rot = calculate_rotation_matrix(P.camera_rotation)
    //var cam_pos = rot.multiply(Vector.create([0, 0, P.camera_distance]))
    var cam_pos = Vector.create([0, 0, P.camera_distance]) // TODO: cam pos can be focused on other planets too!

    // Testing latlon
    var cam_tmp = rot.multiply(cam_pos)
    var LatLon = LatLonAtPos(cam_tmp);
    console.log("Camera Latitude ", rad2deg(LatLon[0]));
    console.log("Camera Longitude", rad2deg(LatLon[1]));


    // Update visible celestials
    var distances = new Object();
    var keys = Object.keys(P.C)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = P.C[keys[i]];
        if (obj.visible == true)
        {
            var ratio = (P.view_size / P.camera_distance);
            if (P.ref == keys[i]) {
                var world_position = Vector.create([0, 0, 0]);
            }
            else {
                if (globals.celestials[keys[i]]) {
                    var world_position = globals.celestials[keys[i]].position; // TODO position at time?
                }
                else {
                    console.log("SEARCH",keys[i]);
                    var world_position = globals.vessels[keys[i]].position; // TODO this is a hack
                }
            }
            
            var render_position = rot.multiply(world_position.multiply(ratio)); 
            obj.render_position = render_position; // Save this 

            distances[cam_pos.distanceFrom(render_position)] = obj; // I know I'm doing a bit wrong here but it works for now
            obj.position = new scope.Point(render_position.e(1) + scope.view.center.x, render_position.e(2) + scope.view.center.y);
        }
    }
    
    // Update visible trajectories
    var keys = Object.keys(P.T)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = P.T[keys[i]];
        if (obj.visible == true && globals.celestials[keys[i]].trajectory) // TODO: checking that object has trajectory
        {
            for (var j = 0; j < 10; j++)
            {
 
                //console.log(keys[i]);
                //console.log(globals.celestials[keys[i]].trajectory);
                if (globals.celestials[keys[i]]) {
                    var render_segment_position = rot.multiply(globals.celestials[keys[i]].trajectory[j].multiply(P.view_size / P.camera_distance));
                }
                else {
                    console.log("SEARCH",keys[i]);
                    var render_segment_position = rot.multiply(globals.vessels[keys[i]].trajectory[j].multiply(P.view_size / P.camera_distance));
                }

 
                //console.log("OK");
                obj.segments[j].point = new scope.Point(render_segment_position.e(1) + scope.view.center.x, render_segment_position.e(2) + scope.view.center.y);
            }
            obj.smooth();
        }
    }

    var keys = Object.keys(distances);
    keys.sort(function(a,b){return a-b});
    for (var i = 0; i < keys.length; i++)
    {
        scope.project.activeLayer.insertChild(i, distances[keys[i]]);
    }
    
    var keys = Object.keys(P.T)
    for (var i = 0; i < keys.length; i++)
    {
        scope.project.activeLayer.insertChild(0, P.T[keys[i]]);
    }
    */
    scope.view.draw();
}
// event.button 0 left mouse
// event.button 2 right mouse
// event.button 1 middle mouse

function onPlotterMouseDown(event) {
    var canvas = $(this)[0].id;
    P = plotter_data[canvas];
    
    if (event.button == 0) { 
        globals.mouse_left = canvas;
        globals.mouse_left_x = event.pageX;
        globals.mouse_left_y = event.pageY;
        
        
    }
    
    if (event.button == 2) {
        globals.mouse_right = canvas;
        globals.mouse_right_y = event.pageY;
    }
    console.log(event);
}


function onPlotterLeftMouseDrag(canvas, delta_x, delta_y) {
	// Add a point to the path every time the mouse is dragged

    var plotter = plotter_data[canvas];
    //P.camera_rotation.setElements([P.camera_rotation.e(1) + delta_y/100, P.camera_rotation.e(2), P.camera_rotation.e(3) - delta_x/100])
    //var camera_origin = plotter.camera.subtract(plotter.camera_utr);
    //var rotation_axis_Z = plotter.camera_right.cross(plotter.camera).toUnitVector();
    //var rotz = Matrix.Rotation(delta_x/10);
    //console.log("rot:",delta_x/10000)
    //console.log("cam:", plotter.camera);
    plotter.camera_rotz += delta_x/300;
    plotter.camera_rotx += delta_y/300;

    if (plotter.camera_rotx > -0.01) { plotter.camera_rotx = -0.01; }
    else if (plotter.camera_rotx < -3.13) { plotter.camera_rotx = -3.13; }
    //plotter.camera = Matrix.Rotation(delta_x/1000, rotation_axis_Z).multiply(plotter.camera);
    //console.warn(plotter.camera.e(1),plotter.camera.e(2),plotter.camera.e(3))
    //plotter.camera_right = Matrix.Rotation(delta_x/1000, rotation_axis_Z).multiply(plotter.camera_right);
    //plotter.camera = camera_origin.add(plotter.camera_utr);
    plotter_draw(canvas);
}

function onPlotterRightMouseDrag(canvas, delta_y) {
	// Add a point to the path every time the mouse is dragged
    return;
    var plotter = plotter_data[canvas];

	P.camera_distance = P.camera_distance + delta_y * 100000000;
    plotter_draw(canvas);
}

function onPlotterMouseWheel(event, delta, delta_x, delta_y) {
    var canvas = this.id;
    var plotter = plotter_data[canvas];
    var to_ref = plotter.camera;

    plotter.camera = plotter.camera.add(to_ref.toUnitVector().multiply(delta_y * 0.1 * to_ref.modulus()));
    plotter_draw(canvas);
}

/*
* Handle clicks (selection)
*/
function onPlotterMouseMove(event)
{
    //console.log("Plotter click");
    return;
    canvas = this.id;
    P = plotter_data[canvas];
    var scope = P.scope;
    
    var keys = Object.keys(P.C);
    var d = new Object(); // Distance object
    var click_x = event.offsetX - P.scope.view.center.x;
    var click_y = event.offsetY - P.scope.view.center.y;
    var click_position = new scope.Point(click_x, click_y);
    //console.log(click_position);
    var rot = calculate_rotation_matrix(P.camera_rotation) // Todo this needs not to be calculated all the time
    
    for (var i = 0; i < keys.length; i++) // Loop through visible objects
    {
        if (P.C[keys[i]].visible == true)
        {
            var ratio = (P.view_size / P.camera_distance);
            var render_position = P.C[keys[i]].render_position; // Precalculated by plot draw
            //rot.multiply(globals.celestials[keys[i]].position.multiply(ratio)); 
            render_position = new scope.Point(render_position.e(1), render_position.e(2))
            //console.log(keys[i] + ": " + render_position);
            d[click_position.getDistance(render_position)] = keys[i];
        }
    }
    
    var keys = Object.keys(d);
    keys.sort(function(a,b){return a-b});
    //console.log(d);
    //console.log(keys);
    if (keys[0] < 10)
    {
        console.log("WOOT WOOT");
        P.hilight_object = d[keys[0]];
        P.marker_hilight.visible = true;
        //P.marker_hilight.position = P.C[d[keys[0]]].position;
        P.marker_hilight.position.x = P.C[d[keys[0]]].position.x + P.marker_hilight.bounds.width/2 - 10;
        P.marker_hilight.position.y = P.C[d[keys[0]]].position.y + P.marker_hilight.bounds.height/2 - 10;

        P.marker_hilight.text.content = d[keys[0]];
        console.log(P.marker_hilight.position);
        console.log(P.C[d[keys[0]]]);
        plotter_draw(canvas);
    }
    else
    {
        P.marker_hilight.visible = false;
        P.hilight_object = false;
    }
    console.log("Closest", d[keys[0]]);

}
