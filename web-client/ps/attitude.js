// Container for attitude objects
attitudes = new Object();

/*
 * Returns an attitude plot object or creates a new one if necessary
 */
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

function Pitch(canvas, degrees)
{
	P = plotters[canvas];
	var rads = degrees / 57.2957795;
	var right_axis = Line.create([0,0,0], P.forward.cross(P.up));
	console.log("right:"+strvec(P.forward.cross(P.up)));
	P.forward = P.forward.rotate(rads, right_axis);
	P.up = P.up.rotate(rads, right_axis);
	attitude_draw(canvas);
}

function Yaw(canvas, degrees)
{
	P = plotters[canvas];
	var rads = degrees / 57.2957795;
	var up_axis = Line.create([0,0,0], P.up);
	P.forward = P.forward.rotate(rads, up_axis);
	attitude_draw(canvas);
}

function Roll(canvas, degrees)
{
	
	P = plotters[canvas];
	console.log("UP1: " + strvec(P.up));
	var rads = degrees / 57.2957795;
	var fwd_axis = Line.create([0,0,0], P.forward);
	P.up = P.up.rotate(-rads, fwd_axis);
	console.log("UP2: " + strvec(P.up));
	attitude_draw(canvas);
}

function attitude_create_pitchmarker(canvas)
{
	P = plotters[canvas];
	paper = P.paper;
	P.marker_pitch = new paper.Group({visible: false});
	P.marker_pitch.addChild(new paper.Path.Line({ from: [-100,100], to: [100, 100], strokeColor: "yellow"})) // Horizontal centering
	P.marker_pitch.addChild(new paper.Path.Line({ from: [-100,-100], to: [-100, 100], strokeColor: "yellow"})) // Vertical centering
	P.marker_pitch.step_pixels = 40;
	
	P.marker_pitch.horizon = new paper.Path.Rectangle({ from: [-100, 0], to: [100, 100], strokeColor: "brown", fillColor: "brown"});
	
	P.marker_pitch.nose = new paper.Path.Line({from: [-5, 5], to: [0,0], strokeColor: "lime"})
	P.marker_pitch.nose.add([5, 5]);
	
	
	
	P.marker_pitch.addChild(P.marker_pitch.horizon);
	P.marker_pitch.addChild(P.marker_pitch.nose);
	// CCreate pitch lines
	P.marker_pitch.z = attitude_create_pitchmarker_line(canvas);
	P.marker_pitch.zp1 = attitude_create_pitchmarker_line(canvas);
	P.marker_pitch.zp2 = attitude_create_pitchmarker_line(canvas);
	P.marker_pitch.zm1 = attitude_create_pitchmarker_line(canvas);
	P.marker_pitch.zm2 = attitude_create_pitchmarker_line(canvas);

	P.marker_pitch.zp1.position = [P.marker_pitch.zp1.position.x, P.marker_pitch.step_pixels*-1];
	P.marker_pitch.zp2.position = [P.marker_pitch.zp2.position.x, P.marker_pitch.step_pixels*-2];
	
	P.marker_pitch.zm1.position = [P.marker_pitch.zp1.position.x, P.marker_pitch.step_pixels*1];
	P.marker_pitch.zm2.position = [P.marker_pitch.zp2.position.x, P.marker_pitch.step_pixels*2];
	

	P.marker_pitch.addChild(P.marker_pitch.z);
	P.marker_pitch.addChild(P.marker_pitch.zp1);
	P.marker_pitch.addChild(P.marker_pitch.zp2);
	P.marker_pitch.addChild(P.marker_pitch.zm1);
	P.marker_pitch.addChild(P.marker_pitch.zm2);
	
	P.marker_pitch_visible = false;
	/*
		children: [
			new paper.Path.Line({ from: [-100,100], to: [100, 100]}), // Horizontal centering
			new paper.Path.Line({ from: [-100,-100], to: [-100, 100]}), // Vertical centering
			new paper.Path.Line({ from: [-width_long, 0], to: [width_long, 0]}),
			new paper.PointText({point: [-width_long-7, 0], content: "0"}),
			new paper.PointText({point: [width_long, 0], content: "0"})],
		strokeColor: "lime"});
	*/
}

function attitude_create_pitchmarker_line(canvas)
{
	P = plotters[canvas];
	paper = P.paper;
	
	// Left line marker
	var outer = 50;
	var inner = 10;
	var left_line = new paper.Path.Line({ from: [-outer, 0], to: [-inner, 0], strokeColor:"lime"})
	left_line.add([-inner, 2]);
	
	// Right line marker
	var right_line = new paper.Path.Line({ from: [outer, 0], to: [inner, 0], strokeColor:"lime"})
	right_line.add([inner, 2]);
	
	// Numbers
	var left_n  = new paper.PointText({point: [-outer-12, 4], content: "0", fillColor:"lime"});
	var right_n = new paper.PointText({point: [outer+2, 4], content: "0", fillColor:"lime"});

	
	var group =  new paper.Group({
		children: [left_line, right_line, left_n, right_n]
	});
	
	group.ln = left_n;
	group.rn = right_n;
	
	return group;
}

/*
* Initializes (a) plotter canvas
*/ 
function attitude_initialize(canvas) {
    // Setup the environment
	console.log("INIT:"+canvas);
	// Keyboard events don't seem to work for canvas
	canvas_element = $("#"+canvas);
	canvas_element.keydown(attitude_keydown)
	canvas_element.keyup(attitude_keyup)
	canvas_element[0].setAttribute('tabindex','-1');
	canvas_element[0].focus();
	//$("#display").keydown(attitude_keydown);
	//$("#display").keyup(attitude_keyup);

	console.log("TEST:"+"#"+canvas);
    plotters[canvas] = new Object();
    P = plotters[canvas];
    P.paper = new paper.PaperScope();
    P.paper.setup(canvas);
    paper = P.paper;
    
	
	P.forward = Vector.create([1,0,0]);
	P.up = Vector.create([0,1,0]);
	P.position = Vector.create([0,1,0]);
	
	
	
	P.pch = new paper.PointText({point: [20, 20], fillColor: "lime"});
	P.yaw = new paper.PointText({point: [20, 40], fillColor: "lime"});
	P.rol = new paper.PointText({point: [20, 60], fillColor: "lime"});
	
	
		
	// Create the horizon
	var width_long = 50;
	var width_short = 25;
	
	
	// Create the nose marker
	attitude_create_pitchmarker(canvas);
	
	
		
    paper.view.draw();
}


/*
 * This function must be called if the canvas needs to be resized
 * It resizes the canvas, paper and calculates view size
 */
function attitude_resize(canvas, width, height)
{
    P = plotters[canvas];
    paper = P.paper;
    paper.view.setViewSize(width, height);
    if (paper.view.center.x > paper.view.center.y) { P.view_size = paper.view.center.y; }
    else { P.view_size = paper.view.center.x; }
}


function strvec(vector)
{
	return vector.e(1) + ", " + vector.e(2) + ", " + vector.e(3);
}
/*

*/

function project_to_plane(vector, normal)
{
	return vector.subtract(normal.multiply(normal.dot(vector)));
}

function attitude_draw(canvas) {
	console.log("DRAW:"+canvas);
    P = plotters[canvas];
    paper = P.paper;
    console.log(P);
	console.log("fwd:"+strvec(P.forward));
	var rd = 57.2957795;
	
	// Define global UP vector
	var up = Vector.create([0,0,1]);
	
	// Position to unit vector
	var pos = P.position.toUnitVector();
	
	// Calculate EAST from position and up
	var east = pos.cross(up);
	
	// Calculate NORTH from east and pos
	var north = east.cross(pos);
	
	// Project forward on north-east plane
	var project_forward = project_to_plane(P.forward, pos);
	var forward = P.forward.toUnitVector();
	
	var pitch = project_forward.angleFrom(P.forward);
	
	// To determine the pitch sign we need two cross products
	var pitch_posfwd = pos.cross(forward).e(3);
	var pitch_profwd = project_forward.cross(forward).e(3);
	/*
	 * PITCH | POSFWD | PROFWD
	 *  POS  |   -    |   +  
	 *  POS  |   +    |   -
	 *  NEG  |   +    |   +
	 *  NEG  |   -    |   -
	*/
	 
	if ((pitch_posfwd >= 0 && pitch_profwd >= 0) || (pitch_posfwd < 0 && pitch_profwd < 0) )
	{
		pitch = -pitch;
	}

	var yaw = project_forward.angleFrom(north);
	
	// To determine yaw properly we need to take this cross product
	yaw_fwdnor = project_forward.cross(north).e(2);
	if (yaw_fwdnor >= 0) { yaw = 2*Math.PI - yaw };

	// Determine roll from right
	var right = P.up.cross(P.forward);
	var project_right = project_to_plane(right, pos);
	var roll = project_right.angleFrom(right);
	
	// Similar to pitch we need to adjust the roll
	/*
	 * ROLL   | POSRGT | PRORGT
	 *  POS   |   -    |   -  
	 * POS+90 |   +    |   +
	 * NEG+90 |   +    |   -
	 *  NEG   |   -    |   +
	*/
	var posrgt = pos.cross(right).e(1);
	var prorgt = project_right.cross(right).e(1);
	
	if (posrgt >= 0) { roll = Math.PI - roll };
	if ((posrgt >= 0 && prorgt < 0) || (posrgt < 0 && prorgt >= 0)) { roll = -roll };

	P.pch.content = "Pitch: " + Math.round(pitch*rd) + " degrees";
	P.yaw.content = "Yaw: " + Math.round(yaw*rd) + " degrees";
	P.rol.content = "Roll: " + Math.round(roll*rd) + " degrees";
	
	
	// Deal with the pitch marker
	// Center it
	P.marker_pitch.position = paper.view.center;
	
	// Choose correct numbers for pitch lines
	var zeronumber = Math.floor(pitch*rd / 5)*5
	P.marker_pitch.z.ln.content = P.marker_pitch.z.rn.content = zeronumber;
	P.marker_pitch.zp1.ln.content = P.marker_pitch.zp1.rn.content = zeronumber + 5;
	P.marker_pitch.zp2.ln.content = P.marker_pitch.zp2.rn.content = zeronumber + 10;
	P.marker_pitch.zm1.ln.content = P.marker_pitch.zm1.rn.content = zeronumber - 5;
	P.marker_pitch.zm2.ln.content = P.marker_pitch.zm2.rn.content = zeronumber - 10;
	
	
	if (P.marker_pitch_visible != false) { P.marker_pitch_visible.remove() }
	P.marker_pitch_visible = P.marker_pitch.clone();
	P.marker_pitch_visible.visible = true;
	
	// Move the pitch marker depending on pitch
	var horizontal = P.marker_pitch_visible.children[0];
	var vertical = P.marker_pitch_visible.children[1];
	var horizon = P.marker_pitch_visible.children[2];
	var nose = P.marker_pitch_visible.children[3];
	
	var zero_y = P.marker_pitch_visible.position.y;
	var horizon_y = horizon.position.y + pitch*rd/5*P.marker_pitch.step_pixels;
	var ypos = zero_y + (pitch*rd/5*P.marker_pitch.step_pixels)%P.marker_pitch.step_pixels
	P.marker_pitch_visible.position = [P.marker_pitch_visible.position.x, ypos];
	
	// Move the spacers
	horizontal.position = P.marker_pitch.children[0].position;
	vertical.position = P.marker_pitch.children[1].position;
	// Move the horizon
	P.marker_pitch_visible.children[2].position = [P.marker_pitch.children[2].position.x, horizon_y]
	P.marker_pitch_visible.children[3].position = [P.marker_pitch.children[3].position.x , zero_y+2.5]
	P.marker_pitch_visible.rotate(roll*rd);
    paper.view.draw();
}

function attitude_mousedown(event)
{
	console.log("mouse down");
}
function attitude_keydown(event)
{
	console.log("Key down");
	console.log(event);
	console.log(this.id);
	if (event.keyCode == 38) 
	{ // UP
		Pitch(this.id, -1);
	}
	
	if (event.keyCode == 40)
	{ // DOWN
		Pitch(this.id, 1);
	}
	
	if (event.keyCode == 39)
	{ // OIKEE
		Roll(this.id, 5);
	}
	
	if (event.keyCode == 37)
	{ // VASEN
		Roll(this.id, -5);
	}
}

function attitude_keyup(event)
{
	console.log("Key up")
}
