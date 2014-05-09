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
    console.log("Status update:", id)
    var root = $("#"+id);
    var launch = root.children("div[id$=launch]");

    // If we are in prelaunch or suborbital, display launch window
    // TODO IF
    launch.show();

    // If prelaunch, hide orbital information
    var launch_orbit = launch.children(".status-launch-current");
    launch_orbit.hide(0);
}