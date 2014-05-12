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
    //console.log("Groundtrack resize" + canvas);
    var groundtrack = groundtrack_data[canvas];
    var scope = groundtrack.scope;
    if (scope.view.viewSize.width == width && scope.view.viewSize.height == height) { return; }
    scope.view.setViewSize(width, height);
    
    
    
    
    var width_scale_factor = width / groundtrack.map.width;
    var height_scale_factor = height / groundtrack.map.height;
    
    if (width_scale_factor > height_scale_factor) {
        var scale_factor = height_scale_factor;
    }
    else {
        var scale_factor = width_scale_factor;
    }
    var new_scale_factor = scale_factor / groundtrack.map_scale;
    //console.log("Required scale: " + scale_factor);
    //console.log("Current scale : " + groundtrack.map_scale);
    //console.log("Apply scale   : " + new_scale_factor);
    //console.log("Target width: " + width);
    //console.log("Target height: " + height);
    //console.log("Map width    : " + groundtrack.map.width);
    //console.log("Map height   : " + groundtrack.map.height);
	groundtrack.map.scale(new_scale_factor);
    groundtrack.map_scale = scale_factor;
    groundtrack.map.position = scope.view.center;
}

function groundtrack_draw(canvas) {
    // TODO: we have a memory leak here
    var groundtrack = groundtrack_data[canvas];
    var scope = groundtrack.scope;
    scope.activate();

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
function groundtrack_update_trajectory(groundtrack, vessel, render) {
    groundtrack.scope.activate();
    
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
    var render_lat = lat / Math.PI * groundtrack.map.width * groundtrack.map_scale * 0.5; // TODO: Check if this is working
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
	
	
	groundtrack.map = new scope.Raster("img/kerbin.png");
    groundtrack.map.onLoad = function () {
        console.log("map loaded");
        console.log(groundtrack);
        groundtrack_resize(canvas, scope.view.size.width, scope.view.size.height);
        groundtrack_draw(canvas);
    }
    groundtrack.map.position = scope.view.center;
    groundtrack.map_scale = 1.0
    groundtrack_map = groundtrack.map;
    
    var base_layer = scope.project.activeLayer;
    var marker_layer = new scope.Layer();
    groundtrack.marker_hilight = create_target_marker(scope, "lime");
    base_layer.activate();
    
    console.log(groundtrack.map.width);
    console.log(groundtrack.map.height);
    
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