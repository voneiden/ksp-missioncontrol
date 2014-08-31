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
    paper = plotter.scope;

    plotter.marker_hilight = create_plot_marker(plotter, "yellow");
    plotter.marker_focus = create_plot_marker(plotter, "cyan");
    plotter.marker_select = create_plot_marker(plotter, "red");

    plotter_setup(canvas);

}

function plotter_setup(canvas, ref) {
    /*
       Setup should be called every time
       the plotter reference needs to be
       changed.
     */
    console.log("Plotter setup");
    if (!ref) {
        if (globals.active_vessel) {
            ref = globals.active_vessel.ref;
        }
        else {
            ref = "Kerbin";
        }
    }
    
    var plotter = plotter_data[canvas];
    paper = plotter.scope;
    plotter.ref = ref;

    plotter.active_vessel = globals.active_vessel;

    // Clean object markers from the scenery
    if (plotter.render_markers) {
        var old_markers_keys = Object.keys(plotter.render_markers);
        for (var i=0; i < old_markers_keys.length; i++) {
            console.log(plotter.render_markers);
            plotter.render_markers[old_markers_keys[i]].remove();
        }
    }

    // Clean object trajectories from the scenery
    if (plotter.render_trajectories) {
        var old_trajectories_keys = Object.keys(plotter.render_trajectories);
        for (var i=0; i < old_trajectories_keys.length; i++) {
            var trajectory_object = plotter.render_trajectories[old_trajectories_keys[i]];
            while (trajectory_object.length > 0) {
                var trajectory = trajectory_object.pop();
                trajectory.remove();
            }
        }
    }

    // Gather visible objects and record the distance of furthest object
    var furthest = 0;

    // Gather all visible children celestials
    var visible_objects = new Array();
    var keys = Object.keys(globals.celestials);
    for (var i=0; i < keys.length; i++) {
        var celestial = globals.celestials[keys[i]];
        if (celestial.ref == ref && visible_objects.indexOf(celestial) == -1) {
            console.log("Add ref", celestial.name);
            visible_objects.push(celestial);

            var distance = celestial.position.modulus();
            if (distance > furthest) { furthest = distance; }
        }
        else {
            console.log("Skip ref");
        }
    }

    // Gather all visible children vessels
    keys = Object.keys(globals.vessels);
    for (var i=0; i < keys.length; i++) {
        var vessel = globals.vessels[keys[i]];
        if (vessel.ref == ref && visible_objects.indexOf(vessel) == -1) {
            console.log("Add ref", vessel.name);
            visible_objects.push(vessel);

            var distance = vessel.position.modulus();
            if (distance > furthest) { furthest = distance; }
        }
        else {
            console.log("Skip ref");
        }
    }    
    // Default camera setup

    //plotter.camera_distance = furthest;
    //plotter.camera_rotation = Vector.create([0.0, 0.0, 0.0]);

    plotter.camera = Vector.create([0, 0, -furthest]);
    plotter.camera_rotz = 0;
    plotter.camera_rotx = 0;
    plotter.camera_rotz_matrix = Matrix.RotationZ(plotter.camera_rotz);
    plotter.camera_rotx_matrix = Matrix.RotationX(plotter.camera_rotx);
    plotter.camera_rotrix = plotter.camera_rotx_matrix.multiply(plotter.camera_rotx_matrix);
    plotter.camera_fov = 1;

    plotter.render_markers = new Object();
    plotter.render_trajectories = new Object();

    // Create the reference object marker
    var reference_object = globals.celestials[ref];
    var sizecolor = get_size_color(reference_object);
    var size = reference_object.radius || 10;
    create_plot_celestial(plotter, ref, size, sizecolor[1]);

    // Create the other visible objects
    for (var i=0; i < visible_objects.length; i++) {
        sizecolor = get_size_color(visible_objects[i]);
        var name = visible_objects[i].uid || visible_objects[i].name;
        var size = visible_objects[i].radius || 10;
        create_plot_celestial(plotter, name, size, sizecolor[1]);
    }

    var active_mode = null;
    paper.view.draw();
}

function get_size_color(celestial) {
    // Temporary function to give out sizes and colors until perspective is implemented again
    if      (celestial.name == "Sun")    { return [7, "yellow"]; }
    else if (celestial.name == "Moho")   { return [2, "brown"]; }
    else if (celestial.name == "Eve")    { return [4, "purple"]; }
    else if (celestial.name == "Kerbin") { return [3, "SpringGreen"]; }
    else if (celestial.name == "Mun")    { return [2, "grey"]; }
    else if (celestial.name == "Minmus") { return [2, "purple"]; }
    else if (celestial.name == "Duna")   { return [3, "orange"]; }
    else if (celestial.name == "Dres")   { return [3, "grey"]; }
    else if (celestial.name == "Jool")   { return [5, "lime"]; }
    else if (celestial.name == "Eeloo")  { return [3, "cyan"]; }
    else { return [2, "red"]; }
}

/* Creates new celestial planet and trajectory */
function create_plot_celestial(plotter, name, size, color)
{ 
    paper = plotter.scope;

    render_marker = new paper.Path.Circle(paper.view.center, size);
    render_marker.fillColor = color;
    render_marker.visible = true;
    render_marker.real_size = size;
    //render_marker.marker_size = size; // Used to keep track
    //render_marker.marker_scale = 1;

    plotter.render_markers[name] = render_marker;
    //plotter.render_markers[name].fillColor = color;
    //plotter.render_markers[name].visible = true;


    if (plotter.ref != name) {
        plotter.render_trajectories[name] = [];
        plotter.render_trajectories[name].color = color;

        /* trajectory multi-segment rewrite
        plotter.render_trajectories[name] = new paper.Path({closed: false, visible: true, strokeColor: color});
        for (var i = 0; i < 10; i++) {
            plotter.render_trajectories[name].add(new paper.Point(0, 0));
        }
        */
    }
}
/* Creates a new marker with text */
function create_plot_marker(plotter, color)
{   
    paper = plotter.scope;
    
    var marker = new paper.Group({visible: false});
    marker.addChild(new paper.Path.Line(new paper.Point(0, -10), new paper.Point(0, -5)));
    marker.addChild(new paper.Path.Line(new paper.Point(0, 10),  new paper.Point(0, 5)));
    marker.addChild(new paper.Path.Line(new paper.Point(-10, 0), new paper.Point(-5, 0)));
    marker.addChild(new paper.Path.Line(new paper.Point(10, 0),  new paper.Point(5, 0)));
    var text = new paper.PointText(new paper.Point(20, 10));
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
    var plotter = plotter_data[canvas];
    paper = plotter.scope;
    paper.view.setViewSize(width, height);
    if (paper.view.center.x > paper.view.center.y) { plotter.view_size = paper.view.center.y; }
    else { plotter.view_size = paper.view.center.x; }
}

/*
* Change the mode of the plotter
*/
function plotter_set_mode(canvas, mode)
{
    var plotter = plotter_data[canvas];
    paper = plotter.scope;
    return;
    // Disable all celestial dots
    var keys = Object.keys(plotter.render_markers)
    for (var i = 0; i < keys.length; i++)
    {
        plotter.render_markers[keys[i]].visible = false;
    }
    // Disable all trajectories
    var keys = Object.keys(plotter.render_trajectories)
    for (var i = 0; i < keys.length; i++)
    {
        plotter.render_trajectories[keys[i]].visible = false;
    }
    
    if (mode == "solar") {
        active_mode = "solar";
        // todo allow dynamic scaling
        plotter.render_markers.Sun.visible = true;
        plotter.render_markers.Sun.scale(14 / plotter.render_markers.Sun.bounds.width)
        plotter.render_markers.Moho.visible = true;
        plotter.render_markers.Moho.scale(2 / plotter.render_markers.Moho.bounds.width)
        plotter.render_trajectories.Moho.visible = true;
        plotter.render_markers.Eve.visible = true;
        plotter.render_markers.Eve.scale(6 / plotter.render_markers.Eve.bounds.width)
        plotter.render_trajectories.Eve.visible = true;
        plotter.render_markers.Kerbin.visible = true;
        plotter.render_markers.Kerbin.scale(4 / plotter.render_markers.Kerbin.bounds.width)
        plotter.render_trajectories.Kerbin.visible = true;
        plotter.render_markers.Duna.visible = true;
        plotter.render_markers.Duna.scale(4 / plotter.render_markers.Duna.bounds.width)
        plotter.render_trajectories.Duna.visible = true;
        plotter.render_markers.Dres.visible = true;
        plotter.render_markers.Dres.scale(4 / plotter.render_markers.Dres.bounds.width)
        plotter.render_trajectories.Dres.visible = true;
        plotter.render_markers.Jool.visible = true;
        plotter.render_markers.Jool.scale(8 / plotter.render_markers.Jool.bounds.width)
        plotter.render_trajectories.Jool.visible = true;
        plotter.render_markers.Eeloo.visible = true;
        plotter.render_markers.Eeloo.scale(4 / plotter.render_markers.Eeloo.bounds.width)
        plotter.render_trajectories.Eeloo.visible = true;
    }

}

/*
* This function updates the canvas
* with correct positions taking into consideration
* camera rotation.
*/
function plotter_draw(canvas) {
    var plotter = plotter_data[canvas];
    paper = plotter.scope;
    var fov = 1;

    // Check if reference or active vessel has changed
    if (globals.active_vessel && (plotter.ref != globals.active_vessel.ref || plotter.active_vessel != globals.active_vessel)) {
        console.log(plotter.active_vessel, globals.active_vessel);
        console.log(plotter.ref, globals.active_vessel.ref);
        plotter_setup(canvas, globals.active_vessel.ref);
    }

    // Todo calculate on demand
    //var rot = calculate_rotation_matrix(plotter.camera_rotation)
    //var cam_pos = rot.multiply(Vector.create([0, 0, plotter.camera_distance]))
    //var cam_pos = Vector.create([0, 0, plotter.camera_distance]) // TODO: cam pos can be focused on other planets too!

    // Camera rotation variables




    // Update visible markers
    var distances = new Object();
    var keys = Object.keys(plotter.render_markers)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = plotter.render_markers[keys[i]];
        if (obj.visible == true) {
            //var ratio = (plotter.view_size / plotter.camera_distance);

            // Marker is focus of the frame of reference
            var orbit_position;

            if (plotter.ref == keys[i]) {
                orbit_position = Vector.create([0, 0, 0]);
            }
            else {
                if (globals.celestials[keys[i]]) {
                    orbit_position = globals.celestials[keys[i]].position;
                }
                else if (globals.vessels[keys[i]]) {
                    orbit_position = globals.vessels[keys[i]].position;
                }
                else {
                    console.error("Unable to find object: ", keys[i]);
                    continue;
                }
            }
            //var render_position = rotrix.multiply(frame_position).subtract(plotter.camera);

            //var render_position = rot.multiply(world_position.multiply(ratio));
            //obj.render_position = render_position; // Save this

            // WIP: scaling
            //var render_scale = fov / render_position.e(3) * paper.view.center.y;
            //var x = render_scale * render_position.e(1);
            //var y = render_scale * render_position.e(2);

            var canvas_position = get_canvas_position_from_orbit_position(canvas, orbit_position)
            var render_size = canvas_position[2] * obj.real_size;
            /*
            if (render_size < 10) {
                render_size = 10;
            }

            if (render_size > 50) {
                render_size = 50;
            }
            */
            if (render_size < 2) { render_size = 2; }
            var new_render_object = new paper.Path.Circle(
                new paper.Point(canvas_position[0] + paper.view.center.x, canvas_position[1] + paper.view.center.y),
                render_size
            );



            // NOTE: TODO: The main planet is not scaled for some reason

            new_render_object.fillColor = obj.fillColor;
            new_render_object.visible = obj.visible;
            new_render_object.real_size = obj.real_size;
            //new_render_object.render_position = canvas_position[3];
            new_render_object.canvas_position = canvas_position;

            obj.remove();

            plotter.render_markers[keys[i]] = new_render_object;

            distances[new_render_object.canvas_position[3].e(3)] = new_render_object;

            // TODO: scale marker
        }
    }
    
    // Update visible trajectories
    var keys = Object.keys(plotter.render_trajectories)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = plotter.render_trajectories[keys[i]];
        var celestial = globals.celestials[keys[i]] || globals.vessels[keys[i]];
        //if (obj.visible == true && celestial.trajectory) // TODO: checking that object has trajectory
        if (obj && celestial && celestial.trajectory) {
            var segment_index = 0;
            var start_position;
            var segment_canvas_position;
            var start_new_path = true;
            var path;
            while (obj.length > 0) {
                path = obj.pop();
                path.remove();
            }


            for (var trajectory_index = 0; trajectory_index < globals.trajectory_points+1; trajectory_index++)
            {

                if (trajectory_index == globals.trajectory_points) {
                    if (celestial.e >= 1) {
                        continue;
                    }
                    segment_canvas_position = start_position;
                }
                else {
                    segment_canvas_position = get_canvas_position_from_orbit_position(canvas, celestial.trajectory[trajectory_index])
                }

                if (trajectory_index == 0) {
                    start_position = segment_canvas_position;
                }

                if (segment_canvas_position[3].e(3) < 0) {
                    start_new_path = true;
                }
                else {
                    if (start_new_path) {
                        path = new paper.Path({closed: false, visible: true, strokeColor: obj.color});
                        obj.push(path);
                        start_new_path = false;
                    }
                    path.add(new paper.Point(segment_canvas_position[0] + paper.view.center.x, segment_canvas_position[1] + paper.view.center.y));
                }
            }

            // Since trajectory segments are no longer closed add the final point to the object
            for (object_trajectory=0; object_trajectory<obj.length; object_trajectory++) {
                //obj[i].smooth();
                obj[object_trajectory].selected = true;
            }
        }
    }

    var keys = Object.keys(distances);
    keys.sort(function(a,b){return a-b});
    for (var i = 0; i < keys.length; i++)
    {
        //paper.project.activeLayer.insertChild(i, distances[keys[i]]);
    }
    
    var keys = Object.keys(plotter.render_trajectories)
    for (var i = 0; i < keys.length; i++)
    {
       // paper.project.activeLayer.insertChild(0, plotter.render_trajectories[keys[i]]);
    }
    paper.view.draw();
}

function get_canvas_position_from_orbit_position(canvas, orbit_position)
{
    var plotter = plotter_data[canvas];
    paper = plotter.scope;

    var render_position = plotter.camera_rotrix.multiply(orbit_position).subtract(plotter.camera);
    var render_scale;
    //if (render_position.e(3) > 0) {
    render_scale = plotter.camera_fov / render_position.e(3) * paper.view.center.y;
    //}
    //else {
    //    render_scale = 100000; // This ensures that points that are behind the camera get rendered somewhere damn far away. Trust me, it works.
    //}

    var canvas_x = render_scale * render_position.e(1);
    var canvas_y = render_scale * render_position.e(2);

    return [canvas_x, canvas_y, render_scale, render_position];
}


// event.button 0 left mouse
// event.button 2 right mouse
// event.button 1 middle mouse

function onPlotterMouseDown(event) {
    var canvas = $(this)[0].id;
    var plotter = plotter_data[canvas];
    
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
	plotter.camera_rotz += delta_x/300;
    plotter.camera_rotx += delta_y/300;

    plotter.camera_rotz_matrix = Matrix.RotationZ(plotter.camera_rotz);
    plotter.camera_rotx_matrix = Matrix.RotationX(plotter.camera_rotx);
    plotter.camera_rotrix = plotter.camera_rotx_matrix.multiply(plotter.camera_rotz_matrix);

    plotter_draw(canvas);
}

function onPlotterRightMouseDrag(canvas, delta_y) {
	// Add a point to the path every time the mouse is dragged
    var plotter = plotter_data[canvas];
	plotter.camera_distance = plotter.camera_distance + delta_y * 100000000;
    plotter_draw(canvas);
}

function onPlotterMouseWheel(event, delta, delta_x, delta_y) {
    var canvas = this.id;
    var plotter = plotter_data[canvas]

    plotter.camera = plotter.camera.add(plotter.camera.toUnitVector().multiply(delta_y * 0.1 * plotter.camera.modulus()));
    plotter_draw(canvas);
    plotter_draw(canvas);
}

/*
* Handle clicks (selection)
*/
function onPlotterMouseMove(event)
{
    canvas = this.id;
    var plotter = plotter_data[canvas];
    paper = plotter.scope;
    
    var keys = Object.keys(plotter.render_markers);
    var d = new Object(); // Distance object

    var click_position = new paper.Point(event.offsetX, event.offsetY);

    for (var i = 0; i < keys.length; i++) {
        var marker = plotter.render_markers[keys[i]];
        if (marker.visible == true) {
            d[click_position.getDistance(marker.position)] = keys[i];
        }
    }
    
    var keys = Object.keys(d);
    keys.sort(function(a,b){return a-b});
    //console.log(d);
    //console.log(keys);
    if (keys[0] < 10)
    {
        var uid = d[keys[0]];

        plotter.hilight_object = d[keys[0]];
        plotter.marker_hilight.visible = true;
        //plotter.marker_hilight.position = plotter.render_markers[d[keys[0]]].position;
        plotter.marker_hilight.position.x = plotter.render_markers[d[keys[0]]].position.x + plotter.marker_hilight.bounds.width/2 - 10;
        plotter.marker_hilight.position.y = plotter.render_markers[d[keys[0]]].position.y + plotter.marker_hilight.bounds.height/2 - 10;

        var text;
        if (globals.vessels[uid]) {
            text = globals.vessels[uid].name;
        }
        else if (globals.celestials[uid]) {
            text = globals.celestials[uid].name;
        }
        else {
            text = "U.F.O."
        }

        plotter.marker_hilight.text.content = text; //d[keys[0]];
        console.log(plotter.marker_hilight.position);
        console.log(plotter.render_markers[d[keys[0]]]);
        plotter_draw(canvas);
    }
    else
    {
        plotter.marker_hilight.visible = false;
        plotter.hilight_object = false;
    }
    console.log("Closest", d[keys[0]]);

}
