/*
 * event.js - Global mouse and keyboard events
 * For a license, see: https://github.com/voneiden/ksp-missioncontrol/blob/master/LICENSE.md
 */

function onMouseMove(event)
{
    if (globals.mouse_left != false)
    {
        var delta_x = event.pageX - globals.mouse_left_x;
        var delta_y = event.pageY - globals.mouse_left_y;
        onPlotterLeftMouseDrag(globals.mouse_left, delta_x, delta_y);
        globals.mouse_left_x = event.pageX;
        globals.mouse_left_y = event.pageY;
        globals.mouse_left_dragging = true;
    }
    if (globals.mouse_right != false)
    {
        var delta_y = event.pageY - globals.mouse_right_y;
        onPlotterRightMouseDrag(globals.mouse_right, delta_y);
        globals.mouse_right_y = event.pageY;
    }
}
function onMouseUp(event)
{
    if (event.button == 0 && globals.mouse_left != false)
    {
        if (globals.mouse_left_dragging == false) // Handle as click
        {
            onPlotterClick(globals.mouse_left, event);
        }
        globals.mouse_left = false;
        globals.mouse_left_dragging = false;
    }
    else if (event.button == 2 && globals.mouse_right != false)
    {
        globals.mouse_right = false;
    }
}

function onResize()
{
    for (var i = globals.plotters.length; i>0; i--)
    {
        var plotter = globals.plotters[i-1];
        if (jQuery.contains($("#display")[0], plotter[0])) { 
            var width = plotter.parent().width();
            var height = plotter.parent().height();
            plotter_resize(plotter.attr("id"), width, height);
            console.log("calling from onResize")
            plotter_draw(plotter.attr("id"));                      
        }
    }
	for (var i = globals.attitudes.length; i>0; i--)
    {
        var attitude = globals.attitudes[i-1];
        if (jQuery.contains($("#display")[0], attitude[0])) { 
            var width = attitude.parent().width();
            var height = attitude.parent().height();
            attitude_resize(attitude.attr("id"), width, height);      
            attitude_draw(attitude.attr("id"));                       
        }
    }

    refreshGroundtracks();
    refreshState();
}
function refreshGroundtracks() {
    for (var i = globals.groundtracks.length; i>0; i--)
    {
        var groundtrack = globals.groundtracks[i-1];
        if (jQuery.contains($("#display")[0], groundtrack[0])) {
            var width = groundtrack.parent().width();
            var height = groundtrack.parent().height();

            // This resize function checks if resize is required and does it
            groundtrack_resize(groundtrack.attr("id"), width, height);

            // Update the groundtrack
            groundtrack_draw(groundtrack.attr("id"));
        }
    }
}

function refreshState() {
    for (var i = globals.status.length; i>0; i--)
    {
        var status = globals.status[i-1];
        if (jQuery.contains($("#display")[0], status[0])) {
            var width = status.parent().width();
            var height = status.parent().height();
            status_update(status.attr("id"), width, height);
        }
    }
}

function refreshPlotters(reload) {
    for (var i = globals.plotters.length; i>0; i--)
    {
        var plotter = globals.plotters[i-1];
        if (jQuery.contains($("#display")[0], plotter[0])) {
            var width = plotter.parent().width();
            var height = plotter.parent().height();
            var canvas = plotter.attr("id");
            plotter_resize(canvas, width, height);
            if (reload) {
                //plotter_setup(canvas);
            }
            console.log("calling from refresh plotters")
            console.log(canvas)
            plotter_draw(canvas);
        }
    }
}