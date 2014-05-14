// Container for groundtrack objects
groundtrack_data = new Object();

/*
 * Returns a free groundtrack object or creates a new one if necessary
 */
function get_groundtrack()
{
    var groundtrack;
    for (var i = globals.groundtracks.length; i>0; i--)
    {
        groundtrack = globals.groundtracks[i-1];
        if (jQuery.contains(document.documentElement, groundtrack[0])) { continue }
        else { return groundtrack };
    }
    
    // A new plot needs to be created
    var id = "groundtrack-" + (globals.groundtracks.length + 1);
    $('<canvas id="' + id + '">').appendTo("#hidden");
    groundtrack = $("#"+id);
    console.log(groundtrack);
    groundtrack_initialize(id);         
    //groundtrack_set_mode(id, "solar");  
    //groundtrack.mousedown(onPlotterMouseDown);
    //groundtrack.bind("contextmenu", function() { return false; }); // Disable right click context menu
    //groundtrack.mousewheel(onPlotterMouseWheel);
    groundtrack.mousemove(onGroundtrackMouseMove);
    globals.groundtracks.push(groundtrack); // Save it
    
    return groundtrack;
}

/* 
 * Resize event, updates the canvas and rescales the raster
 */
function groundtrack_resize(canvas, width, height) {
    console.log("Groundtrack resize" + canvas);
    var groundtrack = groundtrack_data[canvas];
    var scope = groundtrack.scope;
    //if (scope.view.viewSize.width == width && scope.view.viewSize.height == height) { return; }
    scope.view.setViewSize(width, height);
    
    
    console.log("gs",groundtrack.map_scale);
    // Map scaling
    if (!isNaN(groundtrack.map_scale)) {
        var width_scale_factor = width / groundtrack.map.width;
        var height_scale_factor = height / groundtrack.map.height;

        if (width_scale_factor > height_scale_factor) {
            var scale_factor = height_scale_factor;
        }
        else {
            var scale_factor = width_scale_factor;
        }
        var new_scale_factor = scale_factor / groundtrack.map_scale;
        console.log("Required scale: " + scale_factor);
        console.log("Current scale : " + groundtrack.map_scale);
        console.log("Apply scale   : " + new_scale_factor);
        console.log("Target width: " + width);
        console.log("Target height: " + height);
        console.log("Map width    : " + groundtrack.map.width);
        console.log("Map height   : " + groundtrack.map.height);
        groundtrack.map.scale(new_scale_factor);
        groundtrack.map_scale = scale_factor;
        groundtrack.map.position = scope.view.center;
    }
}

function groundtrack_draw(canvas) {
    var groundtrack = groundtrack_data[canvas];
    if (isNaN(groundtrack.map_scale)) { return; };
    var scope = groundtrack.scope;
    scope.activate();

    // Create daynight delimiter
    groundtrack_update_daynight(groundtrack);

    // Check ref
    if (globals.active_vessel) {
        if (globals.active_vessel.ref != groundtrack.ref) {
            groundtrack_load_map(canvas, globals.active_vessel.ref);
        }
    }
    // TODO use Object.keys()?
    for (var i=0; i<globals.vessels.length; i++) 
    {
        var vessel = globals.vessels[i];
        //console.log("Checking",vessel.name);
        if (vessel.ref != "Kerbin") { continue; }
        //console.log("Drawing vessel: " + vessel.name);
        
        if (!groundtrack.vessels[vessel.uid])
        {
            console.log("New vessel");
            var render = new Object();
            groundtrack.vessels[vessel.uid] = render;
            
            groundtrack_update_trajectory(groundtrack, vessel, render); // Create trajectory
            console.log("New marker in scope", scope);

            groundtrack.layer_markers.activate();
            render.marker = new scope.Path.Circle(scope.view.center, 5)
            render.marker.fillColor = "yellow";
            
            
        }
        
        render = groundtrack.vessels[vessel.uid];
        var LatLon = LatLonAtUT(vessel, globals.ut);
        //console.log(LatLon);
        //groundtrack_update_trajectory(groundtrack, vessel, render); // TODO duplicate

        // Memory leak test, remove the marker position from project
        //if (render.marker.position) {
        //    console.log(render.marker.position);
        //    render.marker.position.remove();
        //}
        render.marker.position = LatLonToPaperPoint(LatLon[0], LatLon[1], groundtrack);
        //console.log(groundtrack);
        //console.log("MARKER",render.marker);
        if (vessel.period) {
            // Render trajectory
            
        }
        
    }
    
    scope.view.draw();
}
function groundtrack_update_daynight(groundtrack) {
    groundtrack.scope.activate();
    groundtrack.layer_daynight.activate();

    // Solve the sun position relative to reference celestial
    var celestial = globals.celestials[groundtrack.ref];
    var sun_position;
    if (celestial.ref == "Sun") {
        var celestial_position = determine_rv_at_t(celestial, globals.ut)[0];
        sun_position = celestial_position.multiply(-1).toUnitVector();
    }
    else {
        var celestial_position = determine_rv_at_t(celestial, globals.ut)[0];
        var ref_position = determine_rv_at_t(globals.celestials[celestial.ref], globals.ut)[0];
        console.log("cp", celestial_position);
        console.log("rp", ref_position);
        sun_position = celestial_position.add(ref_position).multiply(-1).toUnitVector();
        console.log("sp",sun_position);
    }

    var theta = celestial.rotation_angle + celestial.ang_v * (globals.ut - celestial.rotation_t0);
    var rotrix = rotZ(theta);
    var sun_position = rotrix.multiply(sun_position);

    // Create required rotation axes
    var up = Vector.create([0,0,1]);
    var rotation_axis_up = up.cross(sun_position).toUnitVector();
    var rotation_axis_sun = sun_position.toUnitVector();

    var steps = 100;
    var step_size = 2*Math.PI / steps;

    var start = Matrix.Rotation(Math.PI / 2, rotation_axis_up).multiply(sun_position);

    // Clear the old layer
    if (groundtrack.layer_daynight && groundtrack.layer_daynight.removeChildren) {
        groundtrack.layer_daynight.removeChildren();
    }


    // Create a path for darkness
    var north = Math.PI/2;
    var south = -Math.PI/2;
    var west = -Math.PI;
    var east = Math.PI;

    var northwest = LatLonToPaperPoint(north, west, groundtrack);
    var southeast = LatLonToPaperPoint(south, east, groundtrack);

    northwest.x -= 100; // TODO something breaks this down still
    northwest.y -= 100;
    southeast.x += 100;
    southeast.y += 100;

     var night_path = new groundtrack.scope.Path.Rectangle(northwest, southeast);

    night_path.fillColor = "red";
    night_path.opacity = 0.5;

    // Create a path for the sunshine
    var day_path = new groundtrack.scope.Path();
    day_path.strokeColor = "blue";
    day_path.closed = true;
    //day_path.fillColor   = "red";

    //globals.debug_rect_topleft = LatLonToPaperPoint(north+0.1, west, groundtrack);
    //globals.debug_rect_topleft = [globals.debug_rect_topleft.x, globals.debug_rect_topleft.y]
    //globals.debug_rect_bottomright = LatLonToPaperPoint(south-0.1, 0, groundtrack);
    //globals.debug_rect_bottomright = [globals.debug_rect_bottomright.x, globals.debug_rect_bottomright.y]

    //globals.debug_path = new Array();

    // Rotate around the sun axis to get a LatLon array
    var sun_LatLon = LatLonAtPos(sun_position);
    console.log("sun latlon",sun_LatLon);
    var sun_marker = new groundtrack.scope.Path.Circle(LatLonToPaperPoint(sun_LatLon[0], sun_LatLon[1], groundtrack), 5)
    sun_marker.fillColor = "yellow";
    sun_marker.opacity = 0.5;

    for (var i=0; i < steps; i++) {
        // TODO handle longitude and latitude crossing somehow..
        var rotrix = Matrix.Rotation(step_size * i, sun_position);
        var LatLon = LatLonAtPos(rotrix.multiply(start));
        //var marker = new groundtrack.scope.Path.Circle(groundtrack.scope.view.center, 5)
        //marker.fillColor = "cyan";
        //if (LatLon[0] >  north) { LatLon[0] =  north; }
        //if (LatLon[0] < south) { LatLon[0] = south; }
        //if (LatLon[1] >  Math.PI-0.01) {   LatLon[1] =  Math.PI-0.01; }
        //if (LatLon[1] <  -Math.PI+0.01) {  LatLon[1] =  Math.PI+0.01; }

        // TODO Here's the idea:
        // if i<steps/2 Longitude should be bigger than
        if (i < steps/2 && LatLon[1] > sun_LatLon[1]+Math.PI/1.8) {
            LatLon[1] = LatLon[1] - Math.PI*2;
            var marker = new groundtrack.scope.Path.Circle(LatLonToPaperPoint(LatLon[0], LatLon[1], groundtrack), 5)
            marker.fillColor = "red";
        }
        else if (i >= steps/2 && LatLon[1] < sun_LatLon[1]-Math.PI/1.8) {
            LatLon[1] = LatLon[1] + Math.PI*2;
            var marker = new groundtrack.scope.Path.Circle(LatLonToPaperPoint(LatLon[0], LatLon[1], groundtrack), 5)
            marker.fillColor = "blue";
        }
        var position = LatLonToPaperPoint(LatLon[0], LatLon[1], groundtrack);
        if (i==0) { first = position; }
        //globals.debug_path.push([position.x, position.y]);
        day_path.add(position);
    }
    //day_path.add(first);

    //night_path_west.subtract(day_path);
    //night_path_east.subtract(day_path);
    //day_path.remove();
    var daynight = night_path.subtract(day_path);

    var translate_x = (-Math.PI) / Math.PI * groundtrack.map.width * groundtrack.map_scale;
    if (sun_LatLon[1] > Math.PI/2) {
        day_path.translate(translate_x, 0);
    }
    else {
        day_path.translate(-translate_x, 0);
    }
    day_path.strokeColor ="purple"

    var daynight = daynight.subtract(day_path);
    //groundtrack.layer_map.removeChildren();
    //night_path_west.remove();
    //daynight.strokeColor="yellow";
    daynight.fillColor = "black";
    daynight.opacity = 0.35;
    night_path.remove();
}
function groundtrack_update_trajectory(groundtrack, vessel, render) {
    groundtrack.scope.activate();
    groundtrack.layer_trajectory.activate();
    
    if (render.trajectory) {
        render.trajectory.removeChildren();
    }
    else {
        render.trajectory = new groundtrack.scope.Group();
    }
    
    
    //console.log("New group");
    //console.log(render.trajectory);
    var start = globals.ut - vessel.period;
    var end = globals.ut + vessel.period;
    var steps = 100;
    var step_size = Math.round((end-start) / steps);
    
    var last_lon = NaN;
    var last_lat = NaN
    var current_path = new groundtrack.scope.Path();
    current_path.strokeColor = "red";
    render.trajectory.addChild(current_path);
    
    for (var i=0; i<steps; i++) {
        var t = start + i*step_size;
        var LatLon = LatLonAtUT(vessel, t);
        
        // Check if passed longitude border 
        if (last_lon && last_lon - LatLon[1] > Math.PI || last_lon - LatLon[1] < -Math.PI) {
            
            
            if (last_lon > LatLon[1]) {
                // The vessel has crossed east to west
                var cross_lon = Math.PI;
                var slope = ( LatLon[0] - last_lat) / (LatLon[1] - last_lon + Math.PI*2);
                var cross_lat = last_lat - slope*(last_lon-cross_lon);
            }
            else {
                // The vessel has crossed west to east 
                var cross_lon = -Math.PI;
                slope = (last_lat - LatLon[0]) / (last_lon + Math.PI*2 - LatLon[1]);
                var cross_lat = last_lat + slope*(cross_lon-last_lon); 
            }
            
            
            //var cross_lat = LatLon[0] + slope*(cross_lon - LatLon[1]);
            //console.log("Slope: " + slope);
            //console.log("cross_lat:     ", cross_lat);
            //console.log("last_lat/lon:  ", last_lat, last_lon);
            //console.log("new_lat/lon:   ", LatLon[0], LatLon[1]);
            // Draw 1st crosspoint
            current_path.add(LatLonToPaperPoint(cross_lat, cross_lon, groundtrack));
            
            // Start a new path
            current_path = new groundtrack.scope.Path();
            current_path.strokeColor = "red";
            render.trajectory.addChild(current_path);
            
            // Draw 2nd crosspoint
            current_path.add(LatLonToPaperPoint(cross_lat, -cross_lon, groundtrack));
        }
        last_lon = LatLon[1];
        last_lat = LatLon[0];
        current_path.add(LatLonToPaperPoint(LatLon[0], LatLon[1], groundtrack));
        
    }
    
    
}
function LatLonToPaperPoint(lat, lon, groundtrack) {
    var render_lat = lat / Math.PI * groundtrack.map.height * groundtrack.map_scale; // TODO: Check if this is working
    var render_lon = lon / Math.PI * groundtrack.map.width * groundtrack.map_scale * 0.5;
    return new groundtrack.scope.Point(groundtrack.scope.view.center.x + render_lon, groundtrack.scope.view.center.y - render_lat)
}


function groundtrack_initialize(canvas)
{
	console.log("Setup groundtrack");
	groundtrack =  new Object();
    groundtrack_data[canvas] = groundtrack;
    groundtrack.zoom = 1;
    groundtrack.vessels = new Object();
	groundtrack.scope = new paper.PaperScope();
	var scope = groundtrack.scope;
	scope.setup(canvas);


    // Create layers
    groundtrack.layer_map = new scope.Layer();
    groundtrack.layer_daynight = new scope.Layer();
    groundtrack.layer_trajectory = new scope.Layer();
    groundtrack.layer_markers = new scope.Layer();
    groundtrack.layer_highlight = new scope.Layer();

    // Load the default map
	groundtrack_load_map(canvas, "Minmus");

    // Create highlight markers as required
    groundtrack.layer_highlight.activate();
    groundtrack.marker_hilight = create_target_marker(scope, "lime");



    console.log(groundtrack.map.width);
    console.log(groundtrack.map.height);
    
}

function groundtrack_load_map(canvas, ref) {
    var groundtrack = groundtrack_data[canvas];
    var scope = groundtrack.scope;

    // Solve the reference celestial for the map
    if (ref && globals.celestials[ref]){
        groundtrack.ref = ref;
    }
    else if (globals.active_vessel && globals.celestials[globals.active_vessel.ref]) {
        groundtrack.ref = globals.active_vessel.ref;
    }
    else {
        groundtrack.ref = "Kerbin";
    }

    if (groundtrack.ref == "Sun") {
        return;
    }

    // Activate map layer and remove old map, if any
    groundtrack.layer_map.activate();
    if (groundtrack.map && groundtrack.map.remove) {
        groundtrack.map.remove();
    }

    // Load new map
    groundtrack.map = new scope.Raster("img/" + groundtrack.ref + ".png");
    groundtrack.map.onLoad = function () {
        console.log("map loaded");
        // Reset map scale
        groundtrack.map_scale = 1.0;
        console.log(groundtrack);
        console.log("Calling resize");
        groundtrack_resize(canvas, scope.view.size.width, scope.view.size.height);
        groundtrack_draw(canvas);
    }

    // Position the map object and set scale to NaN
    // This ensures no scaling is attempted before
    // the map has actually loaded.

    groundtrack.map.position = scope.view.center;
    groundtrack.map_scale = NaN;
    groundtrack_map = groundtrack.map;

}
/*
 * Events
 */
 
 function onGroundtrackMouseMove(event)
{
    //console.log("Plotter click");
    var canvas = this.id;
    var groundtrack = groundtrack_data[canvas];
    var scope = groundtrack.scope;
    
    var keys = Object.keys(groundtrack.vessels);
    var d = new Object(); // Distance object
    //console.log(scope);
    var mouse_position = new scope.Point(event.offsetX, event.offsetY);
    
    for (var i = 0; i < keys.length; i++) // Loop through visible objects
    {
        if (true) //(P.C[keys[i]].visible == true)
        {
            var distance = mouse_position.getDistance(groundtrack.vessels[keys[i]].marker.position);
            if (isNaN(distance))
            {

                //console.log("Vessel",keys[i],"has NaN");
                continue;
            }
            d[distance] = keys[i];
        }
    }
    
    var d_keys = Object.keys(d);
    d_keys.sort(function(a,b){return a- b});
    //console.log(d);
    //console.log(keys);
    var min = d_keys[0];
    
    if (min < 10)
    {
        //P.hilight_object = d[d_keys[0]];
        console.log("vessel", d[min])
        var vessel = globals.vessels[d[min]];
        console.log(vessel);
        // TODO velocity should be calculated unless KSP relays data for all active vessels.
        groundtrack.marker_hilight.visible = true;
        groundtrack.marker_hilight.position = groundtrack.vessels[d[min]].marker.position;
        groundtrack.marker_hilight.text.content = vessel.name + "\n";
        groundtrack.marker_hilight.text.content += "Vel: " + Math.round(vessel.velocity_norm * 100) / 100 + "m/s\n";
        groundtrack.marker_hilight.text.content += "Alt: " + Math.round(vessel.alt) + "m";
        //console.log(P.marker_hilight.position);
        //console.log(P.C[d[d_keys[0]]]);
        //groundtrack_draw(canvas);
    }
    else
    {
        groundtrack.marker_hilight.visible = false;
        //P.hilight_object = false;
    }
    
    //console.log("Closest", d[d_keys[0]]);
    
}
function create_target_marker(scope, color)
{
    var marker = new scope.Group({visible: false});
    marker.addChild(new scope.Path.Line(new scope.Point(0, -10), new scope.Point(0, -5)));
    marker.addChild(new scope.Path.Line(new scope.Point(0, 10),  new scope.Point(0, 5)));
    marker.addChild(new scope.Path.Line(new scope.Point(-10, 0), new scope.Point(-5, 0)));
    marker.addChild(new scope.Path.Line(new scope.Point(10, 0),  new scope.Point(5, 0)));
    var text = new scope.PointText(new scope.Point(20, 0));
    marker.addChild(text);
    marker.text = text;
    marker.strokeColor = "lime";
    return marker;
}