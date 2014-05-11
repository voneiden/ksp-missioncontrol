/*
 * physics.js - Provides functions for two-body problem
 * For a license, see: https://github.com/voneiden/ksp-missioncontrol/blob/master/LICENSE.md
 *
 * Javascript math function expansions
 */
 
function rotZ(degrees) {
    return Matrix.RotationZ(deg2rad(degrees));
}

function rotY(degrees) {
    return Matrix.RotationY(deg2rad(degrees));
}

function rotX(degrees) {
    return Matrix.RotationX(deg2rad(degrees));
}

function deg2rad(degrees) {
    return degrees * (Math.PI / 180);
}

function rad2deg(radians) {
    return radians * (180 / Math.PI);
}

// Todo, implement theta
function LatLonAtUT(vessel, ut) {
    if (vessel.state != "orbiting") {
        //console.log("Vessel not orbiting")
        ut = vessel.t0; // If the vessel is landed, then the position is fixed at t0
        var cur_position = vessel.position;
    }
    else {
        //console.log("Vessel is orbiting");
        var cur_position = determine_rv_at_t(vessel, ut)[0];
    }
    
    var ref = globals.celestials[vessel.ref]
    
    //if (ref.rotrix_timestamp != ut) {
    //    ref.rotrix_timestamp = ut;
    //    ref.rotrix = rotZ(ref.rotation_angle);
    //}
    
    var theta = ref.rotation_angle + ref.ang_v * (ut - ref.rotation_t0);
    //console.log("Theta: " + theta);
    var rotrix = rotZ(theta);
    
    //console.log(rotrix);
    //console.log(cur_position);
    var rot_position = rotrix.multiply(cur_position);
    var uni_position = rot_position.toUnitVector();
    
    var lat = Math.asin(uni_position.e(3));
    var lon = Math.atan2(uni_position.e(1), uni_position.e(2));

    if (ut == globals.ut) { // TODO: make net call LatLonAtUT when vessel data is received
        vessel.lat = lat;
        vessel.lon = lon;
    }
    return [lat, lon];
}

function sign(number) 
{
    var s = number?number<0?-1:1:0;
    if (s == 0) { s = 1;}
    return s;
}
function sinh (arg) {
  // http://kevin.vanzonneveld.net
  // +   original by: Onno Marsman
  // *     example 1: sinh(-0.9834330348825909);
  // *     returns 1: -1.1497971402636502
  return (Math.exp(arg) - Math.exp(-arg)) / 2;
}
function cosh (arg) {
  // http://kevin.vanzonneveld.net
  // +   original by: Onno Marsman
  // *     example 1: cosh(-0.18127180117607017);
  // *     returns 1: 1.0164747716114113
  return (Math.exp(arg) + Math.exp(-arg)) / 2;
}
function cot(aValue)
{
   return 1/Math.tan(aValue);
}

function acot(aValue)
{
   return Math.atan(1 / aValue);
}

/* 
 * Does orbit precalculations for an object
 * Always call after initializing a new object or if orbital parameters
 * have changed!
 */

function determine_orbit_constants(object) 
{
    
    if (object.name == "Sun") {
        return;
    }
    var mu = globals.celestials[object.ref].mu
    
    object.position_norm = object.position.modulus();
    object.velocity_norm = object.velocity.modulus();
    
    
    // Universal param helper variable xi
    object.xi = Math.pow(object.velocity_norm, 2) / 2.0 - mu / object.position_norm;
    if (object.xi == 0) {
        object.a = NaN;
        object.alpha = NaN;
    }
    else {
        object.a = -mu / (2*object.xi);
        object.alpha = 1.0 / object.a; 
    }
    
    // Angular something
    object.h = object.position.cross(object.velocity);
    object.h_norm = object.h.modulus();
    
    // Semi-parameter
    object.p = Math.pow(object.h_norm, 2) / mu;

    // Eccentricity
    if (Math.abs(object.p - object.a) < 1E-5)
    {
        object.e = 0;
    }
    else { // TODO, deal with hyperbolics
        object.e = Math.sqrt(1 -object.p / object.a);
        //console.log("Orbit eccentricity: "+object.e + "(" + object.name + ")");
        //console.log(object.p + "/" +  object.a)
        //console.log(mu)
        //console.log(object.h_norm);
    }
    // Determine apoapsis and periapsis
    if (object.a > 0) {
        object.periapsis = (1 - object.e) * object.a;
        object.apoapsis = (1 + object.e) * object.a;
    }
    else {
        object.periapsis = Math.pow(object.h_norm, 2) / mu;
        object.apoapsis = NaN;
    }
    object.rvdot = object.position.dot(object.velocity);
    
    // Orbit period
    if (object.a > 0)
    {
        object.period = Math.PI*2*Math.sqrt(Math.pow(object.a, 3) / mu);
    }
    else 
    {
        object.period = NaN;
    }
    
    create_trajectory(object);
}
function FindC2C3(psi) 
{
    if (psi > 1E-20)
    {
        var sqrtpsi = Math.sqrt(psi);
        c2 = (1 - Math.cos(sqrtpsi)) / psi;
        c3 = (sqrtpsi - Math.sin(sqrtpsi)) / Math.sqrt(Math.pow(psi, 3));
    }
    else 
    {
        if (psi < -1E-20) 
        {
            sqrtpsi = Math.sqrt(-psi);
            c2 = (1 - cosh(sqrtpsi)) / psi
            c3 = (sinh(sqrtpsi) - sqrtpsi) / Math.sqrt(Math.pow(-psi, 3))
        }
        else
        {
            c2 = 0.5;
            c3 = 1.0 / 6.0;
        }
    
    }
    return [c2, c3]

}
function determine_rv_at_t(object, t, depth)
{
    /*
    * This function calculates 3D position of an object at time T
    * Call determine_orbit_constants first!
    */
    
    //console.log("DETERMINE CALLED")
    //console.log(object)
    //console.log(t)
    //console.log("OK")
    
    /*
    if(typeof depth == 'undefined')
    {
        depth = 0;
    }
    */
    depth = depth || 1;
    
    if (object.name == "Sun") {
        return;
    }
    var mu = globals.celestials[object.ref].mu
    
    var dt = t - object.t0;
    if (dt == 0) {
        return [object.position, object.velocity]
    }
    
    var X0;
    // Circular and elliptic orbits
    if (object.e < 1) {
        X0 = Math.sqrt(mu) * dt * object.alpha;
    }
    // Parabolic orbits
    else if (object.e == 1) {
        console.log("Parabolic orbit");
        var s = Math.atan((1.0) / (3 * Math.sqrt(mu / Math.pow(object.p, 3)) * dt)) / 2.0 % Math.PI
        var w = Math.atan(Math.pow(Math.tan(s), 1/3))
        console.log("p:"+object.p);
        console.log("s:"+s);
        console.log("w:"+w);
        var s = 0.5 * acot(3 * dt * Math.sqrt(mu / Math.pow(object.p, 3)));
        console.log("s2:"+s);
        X0 = Math.sqrt(object.p) * 2 * (Math.cos(2*w) / Math.sin(2*w))
        console.log("First guess: "+X0);
    }
    // Hyperbolic orbits
    else {
        var sdt = sign(dt);
        X0 = sdt * Math.sqrt(-object.a) * Math.log((-2 * mu * object.alpha * dt) / (object.rvdot + sdt * Math.sqrt(-mu * object.a) * (1 - object.position_norm * object.alpha)))
    }
    
    var Xnew = X0;
    var Xold;
    var maxiter = 100;
    var psi;
    var C;
    var c2;
    var c3;
    var r;
    for (var i = 0; i < maxiter; i++)
    {
        psi = Math.pow(Xnew, 2) * object.alpha
        C = FindC2C3(psi);
        c2 = C[0];
        c3 = C[1];
        //r = Xnew**2 * c2 + self.rvdot / sqrt(self.mu) * Xnew * (1 - psi * c3) + self.r0l * (1 - psi * c2)
        r = Math.pow(Xnew, 2) * c2 + object.rvdot / Math.sqrt(mu) * Xnew * (1 - psi * c3) + object.position_norm * (1 - psi * c2);
        Xold = Xnew;
        // Xnew = Xold + (sqrt(self.mu)*dt - Xold**3 * c3 - self.rvdot / sqrt(self.mu) * Xold**2 * c2 - self.r0l * Xold * (1 - psi * c3)) / r
        Xnew = Xold + (Math.sqrt(mu) * dt - Math.pow(Xold, 3) * c3 - object.rvdot / Math.sqrt(mu) * Math.pow(Xold, 2) * c2 - object.position_norm * Xold * (1 - psi * c3)) / r;
        if (Math.abs(Xnew - Xold) < 1E-6) {
            break;
        }
    }
    if (i == maxiter) {
        console.log("Was unable to find solution (depth "+depth+")");
        console.log(object.name);
        console.log(X0);
        console.log(dt);
        console.log(t);
        if (depth < 2)
        {
            return determine_rv_at_t(object, t+0.0000001, depth+1);
        }
        return false;
    }
    
    var f = 1 - Math.pow(Xnew, 2) / object.position_norm * c2;
    var g = dt - Math.pow(Xnew, 3) / Math.sqrt(mu) * c3;
    var gd = 1 - Math.pow(Xnew, 2) / r * c2;
    var fd = Math.sqrt(mu) / (r*object.position_norm) * Xnew * (psi * c3 - 1);

    var R = object.position.multiply(f).add(object.velocity.multiply(g));
    var V = object.position.multiply(fd).add(object.velocity.multiply(gd));
    
    return [R, V];
}
// TODO deal with hyperbolic orbits
// One way to do this could be to solve
// encounters and escapes and determine the
// period from there.
// still a problematic situation if attempting to escape Sun
function create_trajectory(object) 
{
    if (object.name == "Sun") {
        return;
    }
    var steps = 10;
    if (object.e < 1) // Elliptic orbits have periods
    {
        var step = object.period / steps;
        if (step == NaN) 
        {
            object.trajectory = NaN;
            return;
        }
        
        object.trajectory = [];
        for (var i = 0; i < steps; i++) 
        {
            // TODO test for undefined
            // Is that required?
            var RV = determine_rv_at_t(object, i*step);
            if (RV == false)
            {
                return
            }
            object.trajectory.push(RV[0])
        }
    }
    else // Hyperbolic orbits
    {
    
    }
}

function find_t_at_distance(obj1, obj2, d, x0)
{
    /*
     * obj1 & obj2 celestial objects
     * d - desired distance
     * x0 - current time or initial guess of d(t)
     */
    
    

}


function find_encounter(object, t, periods)
{
    /*
     * Encounters can happen at both elliptic and hyperbolic orbits
     * Loop through all parent ref planetary children
     */
    
    // Determine t2 - for hyperbolic orbits use escape
    if (object.e < 1)
    {
        periods = periods || 1;
        var t2 = periods * object.period;
    }
    else
    {
        var t2 = find_escape(object, t);
        if (t2 == false)
        {
            // I suppose this could happen on a solar orbit
            console.log("Warning: this ship is too damn fast");
            t2 = t + 1e10;
        }
    }
    var parent = globals.celestials[object.ref];
    for (var i = 0; i < parent.childs.length; i++)
    {
        object2 = globals.celestials[parent.childs[i]];
        console.log("Testing encounter against " + object2.name);
        var f1 = function(x) { return determine_rv_at_t(object, x)[0].distanceFrom(determine_rv_at_t(object2, x)[0]) - object2.soi; }
        var encounter = uniroot(f1, t, t2);
        if (encounter == false)
        {
            return false
        }
        else if (f1(encounter) > 1)
        {
            console.log("closest approach: "+f1(encounter));
            return false
        }
        else
        {
            return [object2.name, encounter];
        }
    }
}

function find_escape(object, t)
{
    /*
     * Escapes can only happen at hyperbolic orbits
     * And hyperbolic orbits always escape 
     * All that needs to be figured first is the upper limit for the search.
     * Current altitude and speed is estimated and compared to sphere of influence
     */
    if (object.e < 1) { return false; } // Ignore elliptic orbits
    if (object.ref == "Sun") { return false; } // Ignore Sun orbits (no escape in KSP)
    
    var parent = globals.celestials[object.ref];
    var RV = determine_rv_at_t(object, t);
    
    if (RV == false)
    {
        console.log("Unable to find escape, RV false");
        return false;
    }
    
    var rl = RV[0].modulus(); // Current position
    var vl = RV[1].modulus(); // Current velocity
    var guess_step = (parent.soi - rl) / vl;
    
    for (var i = 1; i < 10; i++)
    {
        var t2 = t + guess_step*i;
        RV = determine_rv_at_t(object, t2);
        
        if (RV == false)
        {
            console.log("Unable to find escape, RV false");
            return false;
        }
        
        rl = RV[0].modulus();
        
        if (rl > parent.soi) // Okay!
        {
            return uniroot(function(x) { return determine_rv_at_t(object, x)[0].modulus() - parent.soi; }, t, t2);
            
        }
    }
}
function sanity_test()
{
    console.log("Performing physics engine sanity test");
    var tests  = new Array();
    
    tests.push({position:Vector.create([11985669.5927997-2439559.11656, -586280.14825446, 0]), velocity:Vector.create([300.5042220205518, -541.84640463427, 0]), t0:0, ref:"Kerbin", name:"test_mun_encounter"});
    tests.push({position:Vector.create([800000, 0, 0]), velocity:Vector.create([0,2500,0]), t0:0, ref:"Kerbin",name:"test_normal_orbit"});
    tests.push({position:Vector.create([800000, 0, 0]), velocity:Vector.create([0,10000,0]), t0:0, ref:"Kerbin", name:"test_hyperbolic_orbit"});
    tests.push({position:Vector.create([700000, 800000, 800000]), velocity:Vector.create([2000,2000,2000]), t0:0, ref:"Kerbin", name:"test_weird_orbit"});
    //tests.push({position:Vector.create([4000000, 0, 0]), velocity:Vector.create([0, 1150.80406673, 0]), t0:0, ref:"Kerbin", name:"test_mun_encounter"});
    var i = 0;
    while (tests.length > 0)
    {
        i++;
        var object = tests.pop(0);
        determine_orbit_constants(object);
        console.log("Test #"+i+" "+object.name);
        console.log("Position    : " + object.position.e(1) + ", " + object.position.e(2) + ", " + object.position.e(3))
        console.log("Velocity    : " + object.velocity.e(1) + ", " + object.velocity.e(2) + ", " + object.velocity.e(3))
        console.log("t0          : "+ object.t0);
        console.log("Eccentricity: " + object.e);
        console.log("Determining rv..")
        var RV = determine_rv_at_t(object, object.t0+0.00001);
        console.log("DONE");
        if (RV == false)
        {
            console.log("Was unable to solve!");
        }
        else
        {
            console.log("Position    : " + RV[0].e(1) + ", " + RV[0].e(2) + ", " + RV[0].e(3))
            console.log("Velocity    : " + RV[1].e(1) + ", " + RV[1].e(2) + ", " + RV[1].e(3))
        }
        console.log("Encounter at t: "  + find_encounter(object, object.t0));
        console.log("Escape at t: "  + find_escape(object, object.t0));
    }
}
determine_orbit_constants(globals.celestials.Moho);
determine_orbit_constants(globals.celestials.Eve);
determine_orbit_constants(globals.celestials.Kerbin);
determine_orbit_constants(globals.celestials.Mun);
determine_orbit_constants(globals.celestials.Minmus);
determine_orbit_constants(globals.celestials.Duna);
determine_orbit_constants(globals.celestials.Dres);
determine_orbit_constants(globals.celestials.Jool);
determine_orbit_constants(globals.celestials.Eeloo);

globals.determine_orbit_constants = determine_orbit_constants;
globals.determine_rv_at_t = determine_rv_at_t;

sanity_test();
