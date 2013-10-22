
// Camera distance defaults to Eeloo TODO: make it per plot
camera_distance = globals.celestials.Eeloo.position.modulus()
camera_rotation = Vector.create([0.0, 0.0, 0.0]);

// Container for plotter objects
plotters = new Object();

/*
* This function must be called if the canvas needs to be resized
* It resizes the canvas, paper and calculates view size
*/
function plotter_resize(canvas, width, height)
{
    P = plotters[canvas];
    paper = P.paper;
    paper.view.setViewSize(width, height);
    if (paper.view.center.x > paper.view.center.y) { P.view_size = paper.view.center.y; }
    else { P.view_size = paper.view.center.x; }
}

/* 
* Calculates a rotation matrix for 3D plot objects
* The matrix allows rotation through X axis and Z axis
*/
function calculate_rotation_matrix(rotation_vector) 
{
    var rot_x = Matrix.RotationX(rotation_vector.e(1))
    var rot_z = Matrix.RotationZ(rotation_vector.e(3))
    
    return rot_x.multiply(rot_z)
}

function create_celestial_circle(color)
{
    var circle = new paper.Path.Circle(new Point(0,0), 1);
    circle.fillColor = color;
    return circle;
}


/*
* Initializes (a) plotter canvas
*/ 
function plotter_initialize(canvas) {
    // Setup the environment
    plotters[canvas] = new Object();
    P = plotters[canvas];
    P.paper = new paper.PaperScope();
    P.paper.setup(canvas);
    paper = P.paper;
    
    // Create paths for all celestials
    // Todo simplify?
    P.C = new Object(); // Celestial dots
    P.T = new Object(); // Trajectory paths
    P.C.Sun = new paper.Path.Circle(paper.view.center, 7);
    P.C.Sun.fillColor = "yellow"
    P.C.Sun.visible = false;

    P.C.Moho = new paper.Path.Circle(paper.view.center, 1);
    P.C.Moho.fillColor = "red"
    P.C.Moho.visible = false;
    P.T.Moho = new paper.Path({closed: true, visible: false, strokeColor: "red"});
    for (var i = 0; i < 10; i++) {
        P.T.Moho.add(new paper.Point(0, 0));
    }

    P.C.Eve = new paper.Path.Circle(paper.view.center, 3);
    P.C.Eve.fillColor = "purple"
    P.C.Eve.visible = false;
    P.T.Eve = new paper.Path({closed: true, visible: false, strokeColor: "purple"});
    for (var i = 0; i < 10; i++) {
        P.T.Eve.add(new paper.Point(0, 0));
    }

    P.C.Kerbin = new paper.Path.Circle(paper.view.center, 2);
    P.C.Kerbin.fillColor = "SpringGreen";
    P.C.Kerbin.visible = false;
    P.T.Kerbin = new paper.Path({closed: true, visible: false, strokeColor: "SpringGreen"});
    for (var i = 0; i < 10; i++) {
        P.T.Kerbin.add(new paper.Point(0, 0));
    }

    P.C.Duna = new paper.Path.Circle(paper.view.center, 2);
    P.C.Duna.fillColor = "orange"
    P.C.Duna.visible = false;
    P.T.Duna = new paper.Path({closed: true, visible: false, strokeColor: "orange"});
    for (var i = 0; i < 10; i++) {
        P.T.Duna.add(new paper.Point(0, 0));
    }

    P.C.Dres = new paper.Path.Circle(paper.view.center, 2);
    P.C.Dres.fillColor = "grey"
    P.C.Dres.visible = false;
    P.T.Dres = new paper.Path({closed: true, visible: false, strokeColor: "grey"});
    for (var i = 0; i < 10; i++) {
        P.T.Dres.add(new paper.Point(0, 0));
    }

    P.C.Jool = new paper.Path.Circle(paper.view.center, 4);
    P.C.Jool.fillColor = "lime"
    P.C.Jool.visible = false;
    P.T.Jool = new paper.Path({closed: true, visible: false, strokeColor: "lime"});
    for (var i = 0; i < 10; i++) {
        P.T.Jool.add(new paper.Point(0, 0));
    }

    P.C.Eeloo = new paper.Path.Circle(paper.view.center, 2);
    P.C.Eeloo.fillColor = "cyan"
    P.C.Eeloo.visible = false;
    P.T.Eeloo = new paper.Path({closed: true, visible: false, strokeColor: "cyan"});
    for (var i = 0; i < 10; i++) {
        P.T.Eeloo.add(new paper.Point(0, 0));
    }


    var active_mode = null;
    paper.view.draw();
}

/*
* Change the mode of the plotter
*/
function plotter_set_mode(canvas, mode)
{
    P = plotters[canvas];
    paper = P.paper;
    
    // Disable all celestial dots
    var keys = Object.keys(P.C)
    for (var i = 0; i < keys.length; i++)
    {
        P.C[keys[i]].visible = false;
    }
    // Disable all trajectories
    var keys = Object.keys(P.T)
    for (var i = 0; i < keys.length; i++)
    {
        P.T[keys[i]].visible = false;
    }
    
    if (mode == "solar") {
        active_mode = "solar";
        P.C.Sun.visible = true;
        P.C.Sun.scale(14 / P.C.Sun.bounds.width)
        P.C.Moho.visible = true;
        P.C.Moho.scale(2 / P.C.Moho.bounds.width)
        P.T.Moho.visible = true;
        P.C.Eve.visible = true;
        P.C.Eve.scale(6 / P.C.Eve.bounds.width)
        P.T.Eve.visible = true;
        P.C.Kerbin.visible = true;
        P.C.Kerbin.scale(4 / P.C.Kerbin.bounds.width)
        P.T.Kerbin.visible = true;
        P.C.Duna.visible = true;
        P.C.Duna.scale(4 / P.C.Duna.bounds.width)
        P.T.Duna.visible = true;
        P.C.Dres.visible = true;
        P.C.Dres.scale(4 / P.C.Dres.bounds.width)
        P.T.Dres.visible = true;
        P.C.Jool.visible = true;
        P.C.Jool.scale(8 / P.C.Jool.bounds.width)
        P.T.Jool.visible = true;
        P.C.Eeloo.visible = true;
        P.C.Eeloo.scale(4 / P.C.Eeloo.bounds.width)
        P.T.Eeloo.visible = true;
    }

}

/*
* This function updates the canvas
* with correct positions taking into consideration
* camera rotation.
*/
function plotter_draw(canvas) {
    P = plotters[canvas];
    paper = P.paper;
    
    var rot = calculate_rotation_matrix(camera_rotation)
    //var cam_pos = rot.multiply(Vector.create([0, 0, camera_distance]))
    var cam_pos = Vector.create([0, 0, camera_distance]) // TODO: cam pos can be focused on other planets too!
    
    // Update visible celestials
    var distances = new Object();
    var keys = Object.keys(P.C)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = P.C[keys[i]];
        if (obj.visible == true)
        {
            var ratio = 222 / 113549694484.42453 ;
            //P.view_size / camera_distance));
            var render_position = rot.multiply(globals.celestials[keys[i]].position.multiply(ratio)); 
            /*
            console.log("Rendering "+keys[i]+" to ");
            console.log("Ratio: "+ (P.view_size / camera_distance));
            console.log(P.view_size);
            console.log(camera_distance);
            console.log(render_position);
            */
            distances[cam_pos.distanceFrom(render_position)] = obj; // I know I'm doing a bit wrong here but it works for now
            obj.position = new paper.Point(render_position.e(1) + paper.view.center.x, render_position.e(2) + paper.view.center.y);
        }
    }
    
    // Update visible trajectories
    var keys = Object.keys(P.T)
    for (var i = 0; i < keys.length; i++)
    {
        var obj = P.T[keys[i]];
        if (obj.visible == true)
        {
            for (var j = 0; j < 10; j++)
            {
 
                //console.log(keys[i]);
                //console.log(globals.celestials[keys[i]].trajectory);
                var render_segment_position = rot.multiply(globals.celestials[keys[i]].trajectory[j].multiply(P.view_size / camera_distance));
                //console.log("OK");
                obj.segments[j].point = new paper.Point(render_segment_position.e(1) + paper.view.center.x, render_segment_position.e(2) + paper.view.center.y);
            }
            obj.smooth();
        }
    }

    var keys = Object.keys(distances);
    keys.sort();
    for (var i = 0; i < keys.length; i++)
    {
        paper.project.activeLayer.insertChild(i, distances[keys[i]]);
    }
    
    var keys = Object.keys(P.T)
    for (var i = 0; i < keys.length; i++)
    {
        paper.project.activeLayer.insertChild(0, P.T[keys[i]]);
    }
    paper.view.draw();
}

/*
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
*/
