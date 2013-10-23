function setup_ui()
{
    active_menu = $("#menu-main");
    active_menu_background = active_menu.css("background-color");
    inactive_menu_background = $("#menu").css("background-color");
    active_display = $("#display-main");
    
    // Event handlers
    $(document).mousemove(onMouseMove);
    $(document).mouseup(onMouseUp);
    // Handle the plotters and create their scopes
    
    // Plotter 1
    plotter_1 = $("#plotter-1");
    plotter_initialize("plotter-1");
    plotter_set_mode("plotter-1", "solar");
    plotter_resize("plotter-1");
    plotter_draw("plotter-1");
    
    $( "#plotter-1" ).mousedown(onPlotterMouseDown);
    $( "#plotter-1" ).bind("contextmenu", function() { return false; });
    console.log(active_menu_background);
    console.log(inactive_menu_background);
    
    $(window).resize(onResize);
    onResize();
}
function onMouseMove(event)
{
    if (globals.mouse_left != false)
    {
        var delta_x = event.pageX - globals.mouse_left_x;
        var delta_y = event.pageY - globals.mouse_left_y;
        onPlotterMouseDrag(globals.mouse_left, delta_x, delta_y);
        globals.mouse_left_x = event.pageX;
        globals.mouse_left_y = event.pageY;
    }
}
function onMouseUp(event)
{
    if (globals.mouse_left != false)
    {
        globals.mouse_left = false;
    }
}

function onResize()
{
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
        console.log("plotter not found");
    }
    
}
function show_overview()
{
    active_display = $("#display-overview");
    active_menu = $("#menu-overview");
    
    active_menu.show(200);
    active_menu.css("background-color", active_menu_background);
    active_display.show(200, "swing", setup_overview);
}
function setup_overview()
{
    $("#display-overview-top-left").append(plotter_1);
    $( "#plotter-1" ).mousedown(onPlotterMouseDown);
    $( "#plotter-1" ).bind("contextmenu", function() { return false; });
    
    onResize();
}

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
    
    
    
    active_menu.hide(200);
    active_menu.css("background-color", inactive_menu_background);
    active_display.hide(200, "swing", show_overview);
    plotter_1.remove();
    console.log("SHOW");
    console.log(active_display);
}

$( document ).ready(setup_ui);