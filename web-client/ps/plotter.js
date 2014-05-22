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
    plotter_set_mode(id, "solar");  
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

    if (!globals.celestials[ref]) { console.error("Reference undefined"); return; }
    plotter.ref = ref;                  // Reference object
    plotter.camera = NaN;                     // Camera position

    // Check what objects to render
    plotter.visible_objects = new Object();
    plotter_find_visible_objects(plotter);
    plotter_draw(canvas);

}

function plotter_find_visible_objects(plotter) {

    var visible_objects = new Array();

    // Check celestials
    var keys = Object.keys(globals.celestials);

    for (var i=0; i < keys.length; i++) {
        var celestial = globals.celestials[keys[i]];

        // Skip objects that we've found already
        if (visible_objects.indexOf(celestial) != -1) { continue; }

        // Child objects
        if (celestial.ref) { visible_objects.push(celestial); }

        // Parent object
        else if (plotter.ref == celestial.name) { visible_objects.push(celestial); }

        // Parent of parent object
        else if (celestial.ref && plotter.ref == globals.celestials[celestial.ref].name) {visible_objects.push(celestial); }
    }

    // Create graphics for new objects
    for (var i=0; i < visible_objects.length; i++) {
        var object = visible_objects[i];

        // Define unique identifier for the object (vessels have uid, planets have names)
        var uid;
        if (object.uid) { uid = object.uid; }
        else { uid = object.name; }

        if (!plotter.visible_objects[uid]) {

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
            render_object.marker = new plotter.scope.Path.Circle(plotter.scope.view.center, size);
            render_object.marker.fillColor = color;

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
}   /*
    // Default camera setup
    if (ref == "Sun") {
        plotter.camera_distance = globals.celestials.Eeloo.position.modulus()
        plotter.camera_rotation = Vector.create([0.0, 0.0, 0.0]);
        
        // Create paths for all celestials
        // Todo simplify?
        plotter.C = new Object(); // Celestial dots
        plotter.T = new Object(); // Trajectory paths
        plotter.C.Sun = new scope.Path.Circle(scope.view.center, 7);
        plotter.C.Sun.fillColor = "yellow"
        plotter.C.Sun.visible = false;
        
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
        plotter.C.Kerbin = new scope.Path.Circle(scope.view.center, 7);
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
    }
    plotter.marker_hilight = create_plot_marker(plotter, "yellow");
    plotter.marker_focus = create_plot_marker(plotter, "cyan");
    plotter.marker_select = create_plot_marker(plotter, "red");

    var active_mode = null;
    scope.view.draw();
}
*/
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
    P = plotter_data[canvas];
    var scope = P.scope;
    scope.view.setViewSize(width, height);
    if (scope.view.center.x > scope.view.center.y) { P.view_size = scope.view.center.y; }
    else { P.view_size = scope.view.center.x; }
}

/*
* Change the mode of the plotter
*/
function plotter_set_mode(canvas, mode)
{
    P = plotter_data[canvas];
    var scope = P.scope;
    return;
    // Disable all celestial dots
    var keys = Object.keys(P.C)
    for (var i = 0; i < keys.length; i++)
    {
        P.C[keys[i]].visible = false;
    }
    // Disable all trajectories
    var keys = Object.keys(P.T)
    for (var i = 0; i < keys.length; i++)
    {
        P.T[keys[i]].visible = false;
    }
    
    if (mode == "solar") {
        active_mode = "solar";
        // todo allow dynamic scaling
        P.C.Sun.visible = true;
        P.C.Sun.scale(14 / P.C.Sun.bounds.width)
        P.C.Moho.visible = true;
        P.C.Moho.scale(2 / P.C.Moho.bounds.width)
        P.T.Moho.visible = true;
        P.C.Eve.visible = true;
        P.C.Eve.scale(6 / P.C.Eve.bounds.width)
        P.T.Eve.visible = true;
        P.C.Kerbin.visible = true;
        P.C.Kerbin.scale(4 / P.C.Kerbin.bounds.width)
        P.T.Kerbin.visible = true;
        P.C.Duna.visible = true;
        P.C.Duna.scale(4 / P.C.Duna.bounds.width)
        P.T.Duna.visible = true;
        P.C.Dres.visible = true;
        P.C.Dres.scale(4 / P.C.Dres.bounds.width)
        P.T.Dres.visible = true;
        P.C.Jool.visible = true;
        P.C.Jool.scale(8 / P.C.Jool.bounds.width)
        P.T.Jool.visible = true;
        P.C.Eeloo.visible = true;
        P.C.Eeloo.scale(4 / P.C.Eeloo.bounds.width)
        P.T.Eeloo.visible = true;
    }

}

/*
* This function updates the canvas
* with correct positions taking into consideration
* camera rotation.
*/
function plotter_draw(canvas) {
    P = plotter_data[canvas];
    var scope = P.scope;
    
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
            /*
            console.log("Rendering "+keys[i]+" to ");
            console.log("Ratio: "+ (P.view_size / P.camera_distance));
            console.log(P.view_size);
            console.log(P.camera_distance);
            console.log(render_position);
            */
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
    P = plotter_data[canvas];
	P.camera_rotation.setElements([P.camera_rotation.e(1) + delta_y/100, P.camera_rotation.e(2), P.camera_rotation.e(3) - delta_x/100])
    plotter_draw(canvas);
}

function onPlotterRightMouseDrag(canvas, delta_y) {
	// Add a point to the path every time the mouse is dragged
    P = plotter_data[canvas];
	P.camera_distance = P.camera_distance + delta_y * 100000000;
    plotter_draw(canvas);
}

function onPlotterMouseWheel(event, delta, delta_x, delta_y) {
    var canvas = this.id;
    P = plotter_data[canvas]
    P.camera_distance = P.camera_distance - delta_y * 0.1*P.camera_distance;
    plotter_draw(canvas);
}

/*
* Handle clicks (selection)
*/
function onPlotterMouseMove(event)
{
    //console.log("Plotter click");
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
