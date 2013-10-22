// Declaring some helper variables

Vector = globals.Vector;
Matrix = globals.Matrix;
globals.project = project;
camera_distance = globals.celestials.Eeloo.position.modulus()
camera_rotation = Vector.create([0.0, 0.0, 0.0]);

function onResize()
{
    console.log("Resize!")
    if (view.center.x > view.center.y) { view_size = view.center.y; }
    else { view_size = view.center.x; }
    draw_plot();
}

function calculate_rotation_matrix(rotation_vector) 
{
    /*
    var rot_x = Matrix.create([[1, 0, 0],
                               [0, Math.cos(-c_r_x), -Math.sin(-c_r_x)],
                               [0, Math.sin(-c_r_x), Math.cos(-c_r_x)]])
                           
    var rot_z = Matrix.create([[Math.cos(-c_r_z), -Math.sin(-c_r_z), 0],
                               [Math.sin(-c_r_z), Math.cos(-c_r_z), 0],
                               [0, 0, 1]])
    */
    var rot_x = Matrix.RotationX(rotation_vector.e(1))
    var rot_z = Matrix.RotationZ(rotation_vector.e(3))
    
    return rot_x.multiply(rot_z)
}

function create_celestial_circle(color)
{
    var circle = new Path.Circle(new Point(0,0), 1);
    circle.fillColor = color;
    return circle;
}


/*
* Initializes the plotter canvas
*/ 

// Create paths for all celestials
var C = new Object(); // Celestial dots
var T = new Object(); // Trajectory paths
C.Sun = new Path.Circle(view.center, 7);
C.Sun.fillColor = "yellow"
C.Sun.visible = false;

C.Moho = new Path.Circle(view.center, 1);
C.Moho.fillColor = "red"
C.Moho.visible = false;
T.Moho = new Path({closed: true, visible: false, strokeColor: "red"});
for (var i = 0; i < 10; i++) {
    T.Moho.add(new Point(0, 0));
}

C.Eve = new Path.Circle(view.center, 3);
C.Eve.fillColor = "purple"
C.Eve.visible = false;
T.Eve = new Path({closed: true, visible: false, strokeColor: "purple"});
for (var i = 0; i < 10; i++) {
    T.Eve.add(new Point(0, 0));
}

C.Kerbin = new Path.Circle(view.center, 2);
C.Kerbin.fillColor = "SpringGreen";
C.Kerbin.visible = false;
T.Kerbin = new Path({closed: true, visible: false, strokeColor: "SpringGreen"});
for (var i = 0; i < 10; i++) {
    T.Kerbin.add(new Point(0, 0));
}

C.Duna = new Path.Circle(view.center, 2);
C.Duna.fillColor = "orange"
C.Duna.visible = false;
T.Duna = new Path({closed: true, visible: false, strokeColor: "orange"});
for (var i = 0; i < 10; i++) {
    T.Duna.add(new Point(0, 0));
}

C.Dres = new Path.Circle(view.center, 2);
C.Dres.fillColor = "grey"
C.Dres.visible = false;
T.Dres = new Path({closed: true, visible: false, strokeColor: "grey"});
for (var i = 0; i < 10; i++) {
    T.Dres.add(new Point(0, 0));
}

C.Jool = new Path.Circle(view.center, 4);
C.Jool.fillColor = "lime"
C.Jool.visible = false;
T.Jool = new Path({closed: true, visible: false, strokeColor: "lime"});
for (var i = 0; i < 10; i++) {
    T.Jool.add(new Point(0, 0));
}

C.Eeloo = new Path.Circle(view.center, 2);
C.Eeloo.fillColor = "cyan"
C.Eeloo.visible = false;
T.Eeloo = new Path({closed: true, visible: false, strokeColor: "cyan"});
for (var i = 0; i < 10; i++) {
    T.Eeloo.add(new Point(0, 0));
}


var active_mode = null;

function set_mode(mode)
{
    // Disable all celestial dots
    var keys = Object.keys(C)
    for (var i = 0; i < keys.length; i++)
    {
        C[keys[i]].visible = false;
    }
    // Disable all trajectories
    var keys = Object.keys(T)
    for (var i = 0; i < keys.length; i++)
    {
        T[keys[i]].visible = false;
    }
    
    if (mode == "solar") {
        active_mode = "solar";
        C.Sun.visible = true;
        C.Sun.scale(14 / C.Sun.bounds.width)
        C.Moho.visible = true;
        C.Moho.scale(2 / C.Moho.bounds.width)
        T.Moho.visible = true;
        C.Eve.visible = true;
        C.Eve.scale(6 / C.Eve.bounds.width)
        T.Eve.visible = true;
        C.Kerbin.visible = true;
        C.Kerbin.scale(4 / C.Kerbin.bounds.width)
        T.Kerbin.visible = true;
        C.Duna.visible = true;
        C.Duna.scale(4 / C.Duna.bounds.width)
        T.Duna.visible = true;
        C.Dres.visible = true;
        C.Dres.scale(4 / C.Dres.bounds.width)
        T.Dres.visible = true;
        C.Jool.visible = true;
        C.Jool.scale(8 / C.Jool.bounds.width)
        T.Jool.visible = true;
        C.Eeloo.visible = true;
        C.Eeloo.scale(4 / C.Eeloo.bounds.width)
        T.Eeloo.visible = true;
    }

}

function draw_plot() {
    var rot = calculate_rotation_matrix(camera_rotation)
    //var cam_pos = rot.multiply(Vector.create([0, 0, camera_distance]))
    var cam_pos = Vector.create([0, 0, camera_distance]) // TODO: cam pos can be focused on other planets too!
    
    // Update visible celestials
    var distances = new Object();
    var keys = Object.keys(C)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = C[keys[i]];
        if (obj.visible == true)
        {
            var render_position = rot.multiply(globals.celestials[keys[i]].position.multiply(view_size / camera_distance));
            distances[cam_pos.distanceFrom(render_position)] = obj; // I know I'm doing a bit wrong here but it works for now
            obj.position = new Point(render_position.e(1) + view.center.x, render_position.e(2) + view.center.y);
        }
    }
    
    // Update visible trajectories
    var keys = Object.keys(T)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = T[keys[i]];
        if (obj.visible == true)
        {
            for (var j = 0; j < 10; j++)
            {
 
                //console.log(keys[i]);
                //console.log(globals.celestials[keys[i]].trajectory);
                var render_segment_position = rot.multiply(globals.celestials[keys[i]].trajectory[j].multiply(view_size / camera_distance));
                //console.log("OK");
                obj.segments[j].point = new Point(render_segment_position.e(1) + view.center.x, render_segment_position.e(2) + view.center.y);
            }
            obj.smooth();
        }
    }
    /*
    var pos = rot.multiply(Vector.create([0,0,0]).multiply(150 / camera_distance))
    var sun_d = cam_pos.distanceFrom(pos)
    Sun.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    
    pos = rot.multiply(globals.celestials.Moho.position.multiply(150 / camera_distance))
    var moho_d = cam_pos.distanceFrom(pos);
    console.log(moho_d)
    Moho.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    //project.activeLayer.insertChild(0, Moho);
    
    
    pos = rot.multiply(globals.celestials.Eve.position.multiply(150 / camera_distance))
    var eve_d = cam_pos.distanceFrom(pos);
    Eve.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    
    
    pos = rot.multiply(globals.celestials.Kerbin.position.multiply(150 / camera_distance))
    var kerbin_d = cam_pos.distanceFrom(pos);
    Kerbin.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    
    pos = rot.multiply(globals.celestials.Duna.position.multiply(150 / camera_distance))
    var duna_d = cam_pos.distanceFrom(pos);
    Duna.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    
    pos = rot.multiply(globals.celestials.Dres.position.multiply(150 / camera_distance))
    var dres_d = cam_pos.distanceFrom(pos);
    Dres.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    
    pos = rot.multiply(globals.celestials.Jool.position.multiply(150 / camera_distance))
    var jool_d = cam_pos.distanceFrom(pos)
    Jool.position = new Point(pos.e(1) + 150, pos.e(2) + 150)
    
    pos = rot.multiply(globals.celestials.Eeloo.position.multiply(150 / camera_distance))
    var eeloo_d = cam_pos.distanceFrom(pos)
    Eeloo.position = new Point(pos.e(1) + 150, pos.e(2) + 150)

    
    distances[sun_d] = Sun;
    distances[moho_d] = Moho;
    distances[eve_d] = Eve;
    distances[kerbin_d] = Kerbin;
    distances[duna_d] = Duna;
    distances[dres_d] = Dres;
    distances[jool_d] = Jool;
    distances[eeloo_d] = Eeloo;
    */
    var keys = Object.keys(distances);
    keys.sort();
    //console.log(keys);
    //console.log(distances);
    for (var i = 0; i < keys.length; i++)
    {
        project.activeLayer.insertChild(i, distances[keys[i]]);
    }
    
    var keys = Object.keys(T)
    for (var i = 0; i < keys.length; i++)
    {
        project.activeLayer.insertChild(0, T[keys[i]]);
    }
}
/*
var text = new PointText({
	point: view.center,
	content: 'Click here to focus and then press some keys.',
	justification: 'center',
	fontSize: 15,
    fillColor: "white"
});
*/
function onKeyDown(event) {
	// When a key is pressed, set the content of the text item:
	//text.content = 'The ' + event.key + ' key was pressed!';
    //globals.event = event;
    if (event.key == "right") 
    {
        camera_rotation.setElements([camera_rotation.e(1), camera_rotation.e(2), camera_rotation.e(3) - 0.1]);
        draw_plot();
    }
    else if (event.key == "left") 
    {
        camera_rotation.setElements([camera_rotation.e(1), camera_rotation.e(2), camera_rotation.e(3) + 0.1])
        draw_plot();
    }
    else if (event.key == "up")
    { 
        camera_rotation.setElements([camera_rotation.e(1) - 0.1, camera_rotation.e(2), camera_rotation.e(3)])
        draw_plot();
    }
    
    else if (event.key == "down")
    { 
        camera_rotation.setElements([camera_rotation.e(1) + 0.1, camera_rotation.e(2), camera_rotation.e(3)])
        draw_plot();
    }
    //console.log(camera_rotation.e(3))
}

function onKeyUp(event) {
	// When a key is released, set the content of the text item:
	//text.content = 'The ' + event.key + ' key was released!';
}
function onMouseDrag(event) {
	// Add a point to the path every time the mouse is dragged
	camera_rotation.setElements([camera_rotation.e(1) + event.delta.y/100, camera_rotation.e(2), camera_rotation.e(3) - event.delta.x/100])
    draw_plot();
}

set_mode("solar");
//draw_plot();