/*
 Name       : Dr. Dario Izzo
 E-mail     : dario.izzo@esa.int
 Affiliation: ESA / Advanced Concepts Team (ACT)

 Made readible and optimized for speed by Rody P.S. Oldenhuis
 Code available in MGA.M on   http://www.esa.int/gsp/ACT/inf/op/globopt.htm
*/
function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

function lambert_izzo(mu, r0, r1, tof, m)
{
    /*
    * This function attempts the izzo algorithm to solve a lambert problem
    * r0, r1, positions
    * mu - gravitational standard parameter
    * tof - time of flight (seconds)
    * m - number of revolutions
    *
    * returns false if failed to converge, otherwise object with attritbutes v1 and v2
    */
    
        
    // initial values    
    var tol = 1e-12;  // error tolerance
    var bad = false;  
    var days = 86400; // ?

    // Original code works with non dimensional units
    var r0l = r0.modulus();  
    r0 = r0.multiply(1 / r0l); // Turn r0 vector into unit vector
    r1 = r1.multiply(1 / r0l); // Turn r1 into relative to r0 unit vector
    var V = Math.sqrt(mu/r0l); // what's this?
    var T = r0l/V;                  
    tof   = tof/T; 
    
    
    var r1l = r1.modulus(); // length of relative vector
    // make 100% sure it's in (-1 <= dth <= +1)
    var dth = Math.acos( Math.max(-1, Math.min(1, (r0.dot(r1)/r1l))));  
        
    // decide whether to use the left or right branch (for multi-revolution
    // problems), and the long- or short way    
    var leftbranch = sign(m);   
    var longway = sign(tof);     
    m = Math.abs(m);
    
    var m2pi = 2*Math.PI*m;
    
    tof = Math.abs(tof);
    if (longway < 0)
    {
        dth = 2*Math.PI - dth;
    }

    // derived quantities        
    var c      = Math.sqrt(1 + Math.pow(r1l, 2) - 2*r1l*Math.cos(dth)); // non-dimensional chord
    var s      = (1 + r1l + c)/2;                                       // non-dimensional semi-perimeter
    var a_min  = s/2;                                                   // minimum energy ellipse semi major axis
    var Lambda = Math.sqrt(r1l)*Math.cos(dth/2)/s;                             // lambda parameter (from BATTIN's book)
    /*
    crossprd = [r0(2)*r1(3) - r0(3)*r1(2),... 
                r0(3)*r1(1) - r0(1)*r1(3),...
                r0(1)*r1(2) - r0(2)*r1(1)];
    */
    var crossprd = r0.cross(r1);           // non-dimensional normal vectors
    var mcr       = crossprd.modulus();    // magnitues thereof
    var nrmunit   = crossprd.toUnitVector();          // unit vector thereof
    
    
    var logt = Math.log(tof); // avoid re-computing the same value
    
    // single revolution (1 solution)
    if (m == 0)
    {
        // initial values        
        var inn1 = -0.5233;      // first initial guess
        var inn2 = +0.5233;      // second initial guess
        var x1   = Math.log(1 + inn1);// transformed first initial guess
        var x2   = Math.log(1 + inn2);// transformed first second guess

        // multiple revolutions (0, 1 or 2 solutions)
        // the returned soltuion depends on the sign of [m]
    }
    else
    {
        // select initial values
        if (leftbranch < 0)
        {
            var inn1 = -0.5234; // first initial guess, left branch
            var inn2 = -0.2234; // second initial guess, left branch
        }
        else
        {
            var inn1 = +0.7234; // first initial guess, right branch
            var inn2 = +0.5234; // second initial guess, right branch
        }
        var x1 = Math.tan(inn1*Math.PI/2);// transformed first initial guess
        var x2 = Math.tan(inn2*Math.PI/2);// transformed first second guess
    }
    
    // since (inn1, inn2) < 0, initial estimate is always ellipse
    //var xx1 = inn1;
    //var xx2 = inn2:
    //var xx = Vector.create([inn1, inn2]);
    var aa1 = a_min / (1 - Math.pow(inn1, 2));
    var aa2 = a_min / (1 - Math.pow(inn2, 2));
    //var aa = a_min / ( 1 - xx.multiply(xx));
    //var bbeta = longway * 2 * Math.asin(Math.sqrt((s-c)/2/aa));
    var bbeta1 = longway * 2 * Math.asin(Math.sqrt((s-c)/2/aa1));
    var bbeta2 = longway * 2 * Math.asin(Math.sqrt((s-c)/2/aa2));
    // make 100.4% sure it's in (-1 <= xx <= +1)
    //aalfa = 2*acos(  max(-1, min(1, xx)) );
    var aalfa1 = 2*Math.acos( Math.max(-1, Math.min(1, inn1)));
    var aalfa2 = 2*Math.acos( Math.max(-1, Math.min(1, inn2)));

    // evaluate the time of flight via Lagrange expression
    //y12  = aa.*sqrt(aa).*((aalfa - sin(aalfa)) - (bbeta-sin(bbeta)) + 2*pi*m);
    var y1 = aa1 * Math.sqrt(aa1) * ((aalfa1 - Math.sin(aalfa1)) - (bbeta1 - Math.sin(bbeta1)) + m2pi);
    var y2 = aa1 * Math.sqrt(aa2) * ((aalfa2 - Math.sin(aalfa2)) - (bbeta2 - Math.sin(bbeta2)) + m2pi);

    // initial estimates for y
    if (m == 0)
    {
        y1 = Math.log(y1) - logt;
        y2 = Math.log(y2) - logt;
    }
    else
    {
        y1 = y1 - tf;
        y2 = y2 - tf;
    }

    // Solve for x
    // ·························································
    
    // Newton-Raphson iterations
    // NOTE - the number of iterations will go to infinity in case
    // m > 0  and there is no solution. Start the other routine in 
    // that case

    err = 999999999;  
    var iterations = 0; 
    var xnew;    
    var a;
    var beta;
    var alfa;
    var tof2;
    var ynew;
    
    while (err > tol)
    {
        // increment number of iterations
        iterations = iterations + 1;
        // new x
        xnew = (x1*y2 - y1*x2) / (y2-y1);
        // copy-pasted code (for performance)
        if (m == 0)
        {
            x = Math.exp(xnew) - 1; 
        }
        else 
        {
            x = Math.atan(xnew)*2/Math.PI; 
        }
        
        a = a_min/(1 - Math.pow(x,2));
        if (x < 1) // ellipse
        {
            beta = longway * 2*Math.asin(Math.sqrt((s-c)/2/a));
            // make 100.4% sure it's in (-1 <= xx <= +1)
            alfa = 2*Math.acos( Math.max(-1, Math.min(1, x)) );
        }
        else //hyperbola
        {
            console.log("Not supported yet!");
            console.log("Semi-major: " + a);
            //alfa = 2*acosh(x);
            //beta = longway * 2*asinh(sqrt((s-c)/(-2*a)));
            alfa = 0;
            beta = 0;
            bad = true;
            break;
        }
        // evaluate the time of flight via Lagrange expression
        if (a > 0)
        {
            tof2 = a*Math.sqrt(a)*((alfa - Math.sin(alfa)) - (beta-Math.sin(beta)) + m2pi); // Optimize
        }
        else
        {
            console.log("UNSUPPORTED!");
            //tof2 = -a*Math.sqrt(-a)*((sinh(alfa) - alfa) - (sinh(beta) - beta));
            tof2 = 0;
            bad = true;
            break;
        }
        // new value of y
        if (m ==0)
        {
            ynew = Math.log(tof2) - logt; 
        }
        else
        {
            ynew = tof - tf;
        }
        // save previous and current values for the next iterarion
        // (prevents getting stuck between two values)
        x1 = x2;  
        x2 = xnew;
        y1 = y2;  
        y2 = ynew;
        // update error
        err = Math.abs(x1 - xnew);
        // escape clause
        if (iterations > 15)
        {
            bad = true; 
            break;
        }
    }

    // If the Newton-Raphson scheme failed, try to solve the problem
    // with the other Lambert targeter. 
    if (bad)
    {
        return false
    }
    
    
    // convert converged value of x
    if (m==0)
    {
        x = Math.exp(xnew) - 1; 
    }
    else 
    {
        x = Math.atan(xnew)*2/Math.PI;
    }
    
    /*
          The solution has been evaluated in terms of log(x+1) or tan(x*pi/2), we
          now need the conic. As for transfer angles near to pi the Lagrange-
          coefficients technique goes singular (dg approaches a zero/zero that is
          numerically bad) we here use a different technique for those cases. When
          the transfer angle is exactly equal to pi, then the ih unit vector is not
          determined. The remaining equations, though, are still valid.
    */

    // Solution for the semi-major axis
    a = a_min/(1-Math.pow(x,2));

    // Calculate psi
    var psi;
    var eta2;
    var eta;
    if (x < 1) // ellipse
    {
        beta = longway * 2*Math.asin(Math.sqrt((s-c)/2/a));
        // make 100.4% sure it's in (-1 <= xx <= +1)
        alfa = 2*Math.acos( Math.max(-1, Math.min(1, x)) );
        psi  = (alfa-beta)/2;
        eta2 = 2*a*Math.pow(Math.sin(psi),2)/s;
        eta  = Math.sqrt(eta2);
    }
    else       // hyperbola
    {
        console.log("Not supported yet!");
        return false
        /*
        beta = longway * 2*asinh(sqrt((c-s)/2/a));
        alfa = 2*acosh(x);
        psi  = (alfa-beta)/2;
        eta2 = -2*a*sinh(psi)^2/s;
        eta  = sqrt(eta2);
        */
    }

    // unit of the normalized normal vector
    var ih = nrmunit.multiply(longway);
    // unit vector for normalized [r2vec]
    var r1n = r1.multiply(1/r1l);
    // cross-products
    // don't use cross() (emlmex() would try to compile it, and this way it
    // also does not create any additional overhead)
    /*
    crsprd1 = [ih(2)*r1vec(3)-ih(3)*r1vec(2),...
               ih(3)*r1vec(1)-ih(1)*r1vec(3),...
               ih(1)*r1vec(2)-ih(2)*r1vec(1)];    
    crsprd2 = [ih(2)*r2n(3)-ih(3)*r2n(2),...
               ih(3)*r2n(1)-ih(1)*r2n(3),...
               ih(1)*r2n(2)-ih(2)*r2n(1)];
    */
    var crsprd1 = ih.cross(r0);
    var crsprd2 = ih.cross(r1n);
    
    // radial and tangential directions for departure velocity
    var Vr1 = 1/eta/Math.sqrt(a_min) * (2*Lambda*a_min - Lambda - x*eta);
    var Vt1 = Math.sqrt(r1l/a_min/eta2 * Math.pow(Math.sin(dth/2),2));

    // radial and tangential directions for arrival velocity
    var Vt2 = Vt1/r1l; // Houston we got a problem here
    var Vr2 = (Vt1 - Vt2)/Math.tan(dth/2) - Vr1;

    // terminal velocities
    var V1 = (r0.multiply(Vr1).add(  crsprd1.multiply(Vt1))).multiply(V);
    var V2 = (r1n.multiply(Vr2).add( crsprd2.multiply(Vt2))).multiply(V);
    
    // exitflag
    //exitflag = 1; % (success)
    
    // also compute minimum distance to central body
    // NOTE: use un-transformed vectors again!
    /*
    extremal_distances = ...
        minmax_distances(r1vec*r1, r1, r2vec*r1, mr2vec*r1, dth, a*r1, V1, V2, m, muC);
    */
    console.log("Success");
    console.log("V1:");
    console.log(V1)
    console.log("V2:");
    console.log(V2)
}

var mu = 398600.4418 // earth
var r0 = Vector.create([15945.34, 0, 0]);
var r1 = Vector.create([12214.83899, 10249.46731, 0]);
var tof = 76*60;

lambert_izzo(mu, r0, r1, tof, 0);