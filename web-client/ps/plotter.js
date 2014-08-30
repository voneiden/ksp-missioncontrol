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
            plotter.render_trajectories[old_trajectories_keys[i]].remove();
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

    plotter.camera_distance = furthest;
    plotter.camera_rotation = Vector.create([0.0, 0.0, 0.0]);
    plotter.render_markers = new Object();
    plotter.render_trajectories = new Object();

    // Create the reference object marker
    var reference_object = globals.celestials[ref];
    var sizecolor = get_size_color(reference_object);
    create_plot_celestial(plotter, ref, sizecolor[0], sizecolor[1]);

    // Create the other visible objects
    for (var i=0; i < visible_objects.length; i++) {
        sizecolor = get_size_color(visible_objects[i]);
        var name = visible_objects[i].uid || visible_objects[i].name;
        create_plot_celestial(plotter, name, sizecolor[0], sizecolor[1]);
    }
    /*
    if (ref == "Sun") {
        plotter.camera_distance = globals.celestials.Eeloo.position.modulus()
        plotter.camera_rotation = Vector.create([0.0, 0.0, 0.0]);
        
        // Create paths for all celestials
        // Todo simplify?
        plotter.render_markers = new Object(); // Celestial dots
        plotter.render_trajectories = new Object(); // Trajectory paths
        plotter.render_markers.Sun = new paper.Path.Circle(paper.view.center, 7);
        plotter.render_markers.Sun.fillColor = "yellow"
        plotter.render_markers.Sun.visible = false;
        
        create_plot_celestial(plotter, "Sun",    7, "yellow");
        create_plot_celestial(plotter, "Moho",   2, "red");
        create_plot_celestial(plotter, "Eve",    4, "purple");
        create_plot_celestial(plotter, "Kerbin", 3, "SpringGreen");
        create_plot_celestial(plotter, "Duna",   3, "orange");
        create_plot_celestial(plotter, "Dres",   2, "grey");
        create_plot_celestial(plotter, "Jool",   5, "lime");
        create_plot_celestial(plotter, "Eeloo",  3, "cyan");
    }
    else if (ref == "Kerbin") {
        console.log("KERBIN MODE");
        plotter.camera_distance = globals.celestials.Minmus.position.modulus()
        plotter.camera_rotation = Vector.create([0.0, 0.0, 0.0]);
        
        // Create paths for all celestials
        // Todo simplify?
        plotter.C = new Object(); // Celestial dots
        plotter.T = new Object(); // Trajectory paths
        plotter.C.Kerbin = new paper.Path.Circle(paper.view.center, 7);
        plotter.C.Kerbin.fillColor = "cyan"
        plotter.C.Kerbin.visible = true;
        
        //create_plot_celestial(plotter, "Kerbin",    7, "cyan");
        create_plot_celestial(plotter, "Mun",   4, "grey");
        create_plot_celestial(plotter, "Minmus",    3, "purple");
        
        for (var i=0; i<visible_objects.length; i++) {
            var object = visible_objects[i];
            if (object.name == "Mun" || object.name == "Minmus") { continue; }
            else {
                create_plot_celestial(plotter, object.uid, 2, "lime");
            }
        }
    } */


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
    
    plotter.render_markers[name] = new paper.Path.Circle(paper.view.center, size);
    plotter.render_markers[name].fillColor = color;
    plotter.render_markers[name].visible = true;

    if (plotter.ref != name) {
        plotter.render_trajectories[name] = new paper.Path({closed: true, visible: true, strokeColor: color});
        for (var i = 0; i < 10; i++) {
            plotter.render_trajectories[name].add(new paper.Point(0, 0));
        }
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

    // Check if reference or active vessel has changed
    if (globals.active_vessel && (plotter.ref != globals.active_vessel.ref || plotter.active_vessel != globals.active_vessel)) {
        console.log(plotter.active_vessel, globals.active_vessel);
        console.log(plotter.ref, globals.active_vessel.ref);
        plotter_setup(canvas, globals.active_vessel.ref);
    }

    // Todo calculate on demand
    var rot = calculate_rotation_matrix(plotter.camera_rotation)
    //var cam_pos = rot.multiply(Vector.create([0, 0, plotter.camera_distance]))
    var cam_pos = Vector.create([0, 0, plotter.camera_distance]) // TODO: cam pos can be focused on other planets too!
    
    // Update visible celestials
    var distances = new Object();
    var keys = Object.keys(plotter.render_markers)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = plotter.render_markers[keys[i]];
        if (obj.visible == true)
        {
            var ratio = (plotter.view_size / plotter.camera_distance);
            if (plotter.ref == keys[i]) {
                var world_position = Vector.create([0, 0, 0]);
            }
            else {
                if (globals.celestials[keys[i]]) {
                    var world_position = globals.celestials[keys[i]].position; // TODO position at time?
                }
                else {
                    console.log("SEARCH");
                    console.log(keys[i]);
                    console.log(plotter.render_markers);
                    var world_position = globals.vessels[keys[i]].position; // TODO this is a hack
                }
            }
            
            var render_position = rot.multiply(world_position.multiply(ratio)); 
            obj.render_position = render_position; // Save this 
            /*
            console.log("Rendering "+keys[i]+" to ");
            console.log("Ratio: "+ (plotter.view_size / plotter.camera_distance));
            console.log(plotter.view_size);
            console.log(plotter.camera_distance);
            console.log(render_position);
            */
            distances[cam_pos.distanceFrom(render_position)] = obj; // I know I'm doing a bit wrong here but it works for now
            obj.position = new paper.Point(render_position.e(1) + paper.view.center.x, render_position.e(2) + paper.view.center.y);
        }
    }
    
    // Update visible trajectories
    var keys = Object.keys(plotter.render_trajectories)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = plotter.render_trajectories[keys[i]];
        var celestial = globals.celestials[keys[i]] || globals.vessels[keys[i]];
        if (obj.visible == true && celestial.trajectory) // TODO: checking that object has trajectory
        {
            for (var j = 0; j < 10; j++)
            {
                var render_segment_position = rot.multiply(celestial.trajectory[j].multiply(plotter.view_size / plotter.camera_distance));
                //console.log(keys[i]);
                //console.log(globals.celestials[keys[i]].trajectory);
                //if (globals.celestials[keys[i]]) {
                //    var render_segment_position = rot.multiply(globals.celestials[keys[i]].trajectory[j].multiply(plotter.view_size / plotter.camera_distance));
                //}
                //else {
                //    console.log("SEARCH",keys[i]);
                //    var render_segment_position = rot.multiply(globals.vessels[keys[i]].trajectory[j].multiply(plotter.view_size / plotter.camera_distance));
                //}

 
                //console.log("OK");
                obj.segments[j].point = new paper.Point(render_segment_position.e(1) + paper.view.center.x, render_segment_position.e(2) + paper.view.center.y);
            }
            obj.smooth();
        }
    }

    var keys = Object.keys(distances);
    keys.sort(function(a,b){return a-b});
    for (var i = 0; i < keys.length; i++)
    {
        paper.project.activeLayer.insertChild(i, distances[keys[i]]);
    }
    
    var keys = Object.keys(plotter.render_trajectories)
    for (var i = 0; i < keys.length; i++)
    {
        paper.project.activeLayer.insertChild(0, plotter.render_trajectories[keys[i]]);
    }
    paper.view.draw();
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
	plotter.camera_rotation.setElements([plotter.camera_rotation.e(1) + delta_y/100, plotter.camera_rotation.e(2), plotter.camera_rotation.e(3) - delta_x/100])
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
    plotter.camera_distance = plotter.camera_distance - delta_y * 0.1*plotter.camera_distance;
    plotter_draw(canvas);
}

/*
* Handle clicks (selection)
*/
function onPlotterMouseMove(event)
{
    //console.log("Plotter click");
    canvas = this.id;
    var plotter = plotter_data[canvas];
    paper = plotter.scope;
    
    var keys = Object.keys(plotter.render_markers);
    var d = new Object(); // Distance object
    var click_x = event.offsetX - plotter.scope.view.center.x;
    var click_y = event.offsetY - plotter.scope.view.center.y;
    var click_position = new paper.Point(click_x, click_y);
    //console.log(click_position);
    var rot = calculate_rotation_matrix(plotter.camera_rotation) // Todo this needs not to be calculated all the time
    
    for (var i = 0; i < keys.length; i++) // Loop through visible objects
    {
        if (plotter.render_markers[keys[i]].visible == true)
        {
            var ratio = (plotter.view_size / plotter.camera_distance);
            var render_position = plotter.render_markers[keys[i]].render_position; // Precalculated by plot draw
            //rot.multiply(globals.celestials[keys[i]].position.multiply(ratio)); 
            render_position = new paper.Point(render_position.e(1), render_position.e(2))
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
        plotter.hilight_object = d[keys[0]];
        plotter.marker_hilight.visible = true;
        //plotter.marker_hilight.position = plotter.render_markers[d[keys[0]]].position;
        plotter.marker_hilight.position.x = plotter.render_markers[d[keys[0]]].position.x + plotter.marker_hilight.bounds.width/2 - 10;
        plotter.marker_hilight.position.y = plotter.render_markers[d[keys[0]]].position.y + plotter.marker_hilight.bounds.height/2 - 10;

        plotter.marker_hilight.text.content = d[keys[0]];
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
