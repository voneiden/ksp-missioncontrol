
/* returns a free plotter, if it does not exist, creates a new one */
function get_plotter()
{
    var plotter;
    for (var i = globals.plotters.length; i>0; i--)
    {
        plotter = globals.plotters[i-1];
        if (jQuery.contains(document.documentElement, plotter[0])) { continue }
        else { return plotter };
    }
    
    // Was unable to find a plotter, create a new one!
    var id = "plotter-" + (globals.plotters.length + 1);
    $('<canvas id="' + id + '">').appendTo("#hidden");
    plotter = $("#"+id);
    plotter_initialize(id);         // TODO: use object
    plotter_set_mode(id, "solar");  // TODO: use object
    plotter.mousedown(onPlotterMouseDown);
    plotter.bind("contextmenu", function() { return false; }); // Disable right click context menu
    plotter.mousewheel(onPlotterMouseWheel);
    plotter.mousemove(onPlotterMouseMove);
    globals.plotters.push(plotter); // Save it
    
    return plotter;
}

/* This function initializes the user interface. Call only once during session */
function setup_mainmenu()
{
    // Todo clean here
    active_menu = $("#menu-main");
    active_menu_background = active_menu.css("background-color");
    inactive_menu_background = $("#menu").css("background-color");
    active_display = $("#display-menu");
    
    // Add plotter to main menu view
    var plotter = get_plotter();
    plotter.appendTo("#display-menu-bottom");
    
    // Event handlers
    $(document).mousemove(onMouseMove);
    $(document).mouseup(onMouseUp);
    $(window).resize(onResize); // Set custom window resize event handler
    onResize(); // Call resize
}
function close_mainmenu()
{
    // Hide the main menu items
    //active_menu.hide(200);
    //active_menu.css("background-color", inactive_menu_background);
    //active_display.hide(200, "swing", close_mainmenu_2);
    
    // Detach the main menu plotter
    $("#plotter-1").detach();

    // Remove all the main menu stuff
    $("#menu-main").detach().appendTo("#hidden");
    $("#display-menu").detach().appendTo("#hidden");
    
    // Add all the menu items
    $("#menu-workspace1").detach().appendTo("#ulmenu");
    
    // Fill views
    get_plotter().appendTo("#view1");
    get_plotter().appendTo("#view2");
    setup_workspace1();
    
    // 
}
/* Event handlers */
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
        plotter = globals.plotters[i-1];
        if (jQuery.contains($("#display")[0], plotter[0])) { 
            var width = plotter.parent().width();
            var height = plotter.parent().height();
            plotter_resize(plotter.attr("id"), width, height);      // TODO: use object
            plotter_draw(plotter.attr("id"));                       // TODO: use object
        }
    }
    /*
    console.log("REEEESIZING");
    
    if ($("#display-main").css("display") != "none")
    { 
        // Scale plotter 1 to fit the page
        var available_height = $(window).height() - 10;
        var available_width = $(window).width();
        var height = available_height - $("#display-main").outerHeight(true);
        var width = available_width - $("#menu").outerWidth(true)
        console.log("Available height:" + available_height);
        console.log("Setting canvas height:"+ (available_height - $("#display-main").outerHeight(true)))
        //plotter_1.attr("width", width);
        //plotter_1.attr("height", height);
        //plotter_1.width(width);
        //plotter_1.height(height);
        plotter_resize("plotter-1", width, height);
        plotter_draw("plotter-1");
        
        console.log("Set plot size");
        return;
    }
    
    if ( $("#plotter-1").length != 0 )
    {
        var width = plotter_1.parent().width();
        var height = plotter_1.parent().height();
        
        console.log("Plotter 1 width:" + width);
        console.log("Plotter 1 height:" + height);
        
        //plotter_1.attr("width", width);
        //plotter_1.attr("height", height);
        //plotter_1.width(width);
        //plotter_1.height(height);
        
        plotter_resize("plotter-1", width, height);
        plotter_draw("plotter-1");
        
        console.log("OK");
        console.log(plotter_1.parent().width());
        console.log(plotter_1.parent().height());
    }
    else {
        console.log("plotter-1 not found");
    }
    
    if ( $("#plotter-2").length != 0 )
    {
        var width = plotter_2.parent().width();
        var height = plotter_2.parent().height();

        plotter_resize("plotter-2", width, height);
        plotter_draw("plotter-2");
    }
    else {
        console.log("plotter-1 not found");
    }
    */
    
}
function setup_workspace1()
{
    // Set active variables
    active_display = $("#workspace1");
    active_menu = $("#menu-workspace1");
    
    // Detach and move stuff
    $("#workspace1").detach().appendTo("#display");
    $("#view1").detach().appendTo("#workspace1-top-left");
    $("#view2").detach().appendTo("#workspace1-top-right");
    $("#view3").detach().appendTo("#workspace1-top-bottom");
    
    // Set active workspace menu bcolor
    active_menu.css("background-color", active_menu_background);
    
    //active_display.css("display", "inline-block");
    // Finally scale everything to right size
    onResize();
}
/*
function setup_workspace1()
{
    $("#display-overview-top-left").append(plotter_1);
    $( "#plotter-1" ).mousedown(onPlotterMouseDown);
    $( "#plotter-1" ).bind("contextmenu", function() { return false; });
    $( "#plotter-1" ).mousewheel(onPlotterMouseWheel);
    $( "#plotter-1" ).mousemove(onPlotterMouseMove)
    
    
    $("#display-overview-top-right").append(plotter_2);
    $( "#plotter-2" ).mousedown(onPlotterMouseDown);
    $( "#plotter-2" ).bind("contextmenu", function() { return false; });
    $( "#plotter-2" ).mousewheel(onPlotterMouseWheel);
    $( "#plotter-2" ).mousemove(onPlotterMouseMove)
    
    onResize();
}
*/
/* For testing purposes, no KSP connection required */
function run_test_environment()
{
    // Create a test vessel
    globals.vessels = {test_vessel: {
                        name: "Test  Vessel",
                        ref: "Kerbin",
                        position: Vector.create([800000, 0, 0]),
                        velocity: Vector.create([0, 2400, 0]),
                        t0: 0}
                       };
                       
    // Set active vessel
    globals.active_vessel = globals.vessels.test_vessel;
    
    // Setup clock
    globals.UT = 0;
    globals.UT_t = new Date().getTime() / 1000;
    
    
    // Close main menu
    close_mainmenu();
}

$( document ).ready(setup_mainmenu);