/*
 * ui.js - Provides user interface manipulation functions
 * For a license, see: https://github.com/voneiden/ksp-missioncontrol/blob/master/LICENSE.md
 *
 * Initializing and closing of different workspaces
 */
 
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

function get_attitude()
{
    var attitude;
    for (var i = globals.attitudes.length; i>0; i--)
    {
        plotter = globals.attitudes[i-1];
        if (jQuery.contains(document.documentElement, plotter[0])) { continue }
        else { return plotter };
    }
    
    // Was unable to find a plotter, create a new one!
    var id = "attitude-" + (globals.plotters.length + 1);
    $('<canvas id="' + id + '">').appendTo("#hidden");
    attitude = $("#"+id);
    attitude_initialize(id);        
    //plotter.mousedown(onPlotterMouseDown);
    //plotter.bind("contextmenu", function() { return false; }); // Disable right click context menu
    //plotter.mousewheel(onPlotterMouseWheel);
    //plotter.mousemove(onPlotterMouseMove);
    globals.attitudes.push(attitude); // Save it
    
    return attitude;
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
    //var plotter = get_plotter();
    var groundtrack = get_groundtrack();
    groundtrack.appendTo("#display-menu-bottom");
	//get_attitude().appendTo("#display-menu-bottom");
    
    // Event handlers
    $(document).mousemove(onMouseMove);
    $(document).mouseup(onMouseUp);
    $(window).resize(onResize); // Set custom window resize event handler
    onResize(); // Call resize
}
function close_mainmenu()
{
    // Detach the main menu plotter
    $("#plotter-1").detach();
    $("#groundtrack-1").detach();
    
    // Remove all the main menu stuff
    $("#menu-main").detach().appendTo("#hidden");
    $("#display-menu").detach().appendTo("#hidden");
    
    // Add all the menu items
    $("#menu-workspace1").detach().appendTo("#ulmenu");
    $("#menu-workspace2").detach().appendTo("#ulmenu");
    
    // Fill views and enable workspace 1
    get_plotter().appendTo("#view1");
    get_status().appendTo("#view2");
    get_groundtrack().appendTo("#view3");
    get_plotter().appendTo("#view4");
    setup_workspace1();
    
}

function setup_workspace1()
{
    if (active_display == "#workspace1") { return; }
    close_workspace();
    
    // Set active variables
    active_display = $("#workspace1");
    active_menu = $("#menu-workspace1");
    
    // Detach stuff from hidden and move them
    $("#workspace1").detach().appendTo("#display");
    $("#view1").detach().appendTo("#workspace1-top-left");
    $("#view2").detach().appendTo("#workspace1-top-right");
    $("#view3").detach().appendTo("#workspace1-bottom");
    
    // Set active workspace menu bcolor
    active_menu.css("background-color", active_menu_background);
    
    // Finally scale everything to right size
    onResize();
}
function close_workspace()
{
    // Set menu color
    active_menu.css("background-color", inactive_menu_background);
    console.log(active_display.attr("id"))
    // Detach views and workspace
    if (active_display.attr("id") == "workspace1")
    {   
        console.log("Detaching ws1");
        $("#view1").detach().appendTo("#hidden");
        $("#view2").detach().appendTo("#hidden");
        $("#view3").detach().appendTo("#hidden");
        $("#workspace1").detach().appendTo("#hidden");
    }
    else if (active_display.attr("id") == "workspace2")
    {
        console.log("Detaching ws2");
        $("#view1").detach().appendTo("#hidden");
        $("#view2").detach().appendTo("#hidden");
        $("#view3").detach().appendTo("#hidden");
        $("#view4").detach().appendTo("#hidden");
        $("#workspace2").detach().appendTo("#hidden");
    }
    else { console.log(active_display);}
}
function setup_workspace2()
{   
    if (active_display == "#workspace2") { return; }
    close_workspace();
    
    // Set active variables
    active_display = $("#workspace2");
    active_menu = $("#menu-workspace2");
    
    // Detach and move stuff
    $("#workspace2").detach().appendTo("#display");
    $("#view1").detach().appendTo("#workspace2-top-left");
    $("#view2").detach().appendTo("#workspace2-top-right");
    $("#view3").detach().appendTo("#workspace2-bottom-left");
    $("#view4").detach().appendTo("#workspace2-bottom-right");
    
    // Set active workspace menu bcolor
    active_menu.css("background-color", active_menu_background);
    
    // Finally scale everything to right size
    onResize();
}



/*Test environment, as the name implies, is for testing
 * various features without the need to run KSP
 * It setups a few test cases for offline testing
 */
function run_test_environment()
{
    // Create a test vessel
    var vessel = {
                        name: "Test  Vessel",
                        uid: "xxxx",
                        ref: "Kerbin",
                        position: Vector.create([800000, 0, 0]),
                        velocity: Vector.create([0, -1200, 1000]),
                        state: "orbiting",
                        t0: 0};
    determine_orbit_constants(vessel);
    
    globals.vessels["xxxx"] = vessel;
    globals.vessels.push(vessel);
                       
    // Set active vessel
    globals.active_vessel = vessel;
    
    // Setup clock
    globals.ut = 0;
    //globals.UT_t = new Date().getTime() / 1000;
    
    
    // Close main menu
    close_mainmenu();
}

$( document ).ready(setup_mainmenu);
//$("body").load(setup_mainmenu);
//$("body").load(function () {setup_mainmenu()});
