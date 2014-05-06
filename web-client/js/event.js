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
}
