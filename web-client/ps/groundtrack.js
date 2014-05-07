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
    //groundtrack.mousemove(onPlotterMouseMove);
    globals.groundtracks.push(groundtrack); // Save it
    
    return groundtrack;
}

function groundtrack_resize(canvas, width, height) {
    console.log("Groundtrack resize" + canvas);
    groundtrack = groundtrack_data[canvas];
    paper = groundtrack.paper;
    paper.view.setViewSize(width, height);
    
    
    
    
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
    //console.log("Target width: " + width);
    //console.log("Target height: " + height);
    //console.log("Map width    : " + groundtrack.map.width);
    //console.log("Map height   : " + groundtrack.map.height);
	groundtrack.map.scale(new_scale_factor);
    groundtrack.map_scale = scale_factor;
    groundtrack.map.position = paper.view.center;
}

function groundtrack_draw(canvas) {
    console.log("Groundtrack draw");
    groundtrack = groundtrack_data[canvas];
    paper = groundtrack.paper;
    
    for (var i=0; i<globals.vessels.length; i++) 
    {
        var vessel = globals.vessels[i];
        if (vessel.ref != "Kerbin") { continue; }
        
        if (!groundtrack[vessel.uid])
        {
            render = new Object();
            groundtrack[vessel.uid] = render;
            render.marker = new paper.Path.Circle(paper.view.center, 5)
            render.marker.fillColor = "yellow";
            render.trajectory = [];
        }
        
        render = groundtrack[vessel.uid];
        LatLon = LatLonAtUT(vessel, globals.ut);
        
        render.marker.position = LatLonToPaperPoint(LatLon[0], LatLon[1], groundtrack);
        
        if (vessel.period) {
            // Render trajectory
        
        }
        
    }
    
    paper.view.draw();
}
function update_trajectory(vessel) {

}
function LatLonToPaperPoint(lat, lon, groundtrack) {
    render_lat = lat / Math.PI * groundtrack.map.width * groundtrack.map_scale;
    render_lon = lon / Math.PI * groundtrack.map.width * groundtrack.map_scale * 0.5;
    return new paper.Point(groundtrack.paper.view.center.x + render_lon, groundtrack.paper.view.center.y - render_lat)
}
function groundtrack_initialize(canvas)
{
	console.log("Setup groundtrack");
	groundtrack =  new Object();
    groundtrack_data[canvas] = groundtrack;
    groundtrack.zoom = 1;
	groundtrack.paper = new paper.PaperScope();
	paper = groundtrack.paper;
	paper.setup(canvas);
	
	
	groundtrack.map = new paper.Raster("img/kerbin.png");
    groundtrack.map.onLoad = function () {
        console.log("map loaded");
        console.log(groundtrack);
        groundtrack_resize(canvas, paper.view.size.width, paper.view.size.height);
        groundtrack_draw(canvas);
    }
    groundtrack.map.position = paper.view.center;
    groundtrack.map_scale = 1.0
    groundtrack_map = groundtrack.map;
    console.log(groundtrack.map.width);
    console.log(groundtrack.map.height);
    
}

//$( document ).ready(setup_groundtrack);
