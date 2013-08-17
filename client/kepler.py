""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
"""

from numpy import sin, sinh, arcsin, cos, cosh, arccos, tan, arctan , pi, nan
from numpy import sign, sqrt, cross, log, array, dot, degrees, radians, inf
from numpy.linalg import norm
import logging
import math # For debugging sqrt

PI2 = pi * 2

class Orbit:
    ''' This class provides orbit prediction '''
    
    def __init__(self,parent,**kwargs):
        ''' 
        kwargs needs to contain currently trv (time, pos, vel)
        Calculating from elements is not available yet
        '''
        self.parent = parent
        self.mu = parent.mu
        print "parent",self.parent
        if not self.parent:
            pass
        elif "elements" in kwargs:
            self.recalculateFromElements(kwargs["elements"])
        elif "trv" in kwargs:
            print "recalc"
            self.recalculateFromTRV(kwargs["trv"])
        else:
            raise AttributeError
        
        
        
        
    def recalculateFromElements(self,elements):
        ''' 
        Based on Vallado, calculates an orbit from orbital elements
        Not ready to be used yet!
        '''
        
        """
        if not isinstance(vec_r,array) or isinstance(vec_v,array):
            raise AttributeError("Needs array")
        
        # Define initial variables
        mu = self.mu
        
        nrm_r = norm(vec_r)
        nrm_v = norm(vec_v)        
        
        # (1) Calculate angular momentum
        vec_h = cross(vec_r, vec_v)
        nrm_h = norm(vec_h)
        
        # (2) Calculate node vector
        vec_n = cross(array([0,0,1]), vec_h)
        
        # (3) Calculate eccentricity vector
        
        vec_e = ( (nrm_v**2 - mu/nrm_r)*vec_r - (vec_r.dot(vec_r))*vec_v ) / mu
        nrm_e = norm(vec_e)
        
        if round(nrm_e,6) == 1.0:
            periapsis = nrm_h**2 / mu
            a = inf
        else:
            xi = nrm_v**2 / 2 - mu/nrm_r
            a = -mu/(2*xi)
            periapsis = a (1-nrm_e)
            
        
        i = arccos(vec_h[2] / nrm_h)
        if vec_n[1] < 0:
            i = PI2 - i
        """
        
    def recalculateFromTRV(self,trv):
        ''' 
        Based on Vallado. This function calculates orbit parameters from given
        trv = [t0,r0,v0] where
        t0 - Time of observation (float)
        r0 - Position vector (numpy.array) of observation
        v0 - Velocity vector (numpy.array) of observation
        
        Call this function every time the initial parameters are changed.
        '''
        
        self.t0 = trv[0]
        self.r0 = trv[1]
        self.v0 = trv[2]
        
        logging.debug("Initializing..")
        logging.debug("mu %f"%self.mu)
        logging.debug("r0 %s"%str(self.r0))
        logging.debug("v0 %s"%str(self.v0))
        logging.debug("t0 %s"%str(self.t0))
        
        # Normalized position and velocity vectors
        self.r0l = norm(self.r0)
        self.v0l = norm(self.v0)
        
        # Eccentricity vector
        #self.ecc = ((self.v0l**2 - self.mu / self.r0l)*self.r0 - (self.r0.dot(self.r0))*self.v0 ) / self.mu
        #self.ecc_l = norm(self.ecc)
        
        
        #self.eccl = norm(self.e)
        
        # Auxilary variable xi
        print "r0l",self.r0l
        print "mu",self.mu
        print "v0l",self.v0l
        self.xi = self.v0l**2.0 / 2.0 - self.mu / self.r0l 
        print("xi %f"%self.xi)
        
        if self.xi == 0:
            self.a = inf
            self.alpha = 1.0
        
        else:
            # Semi major axis
            self.a  = -self.mu / (2*self.xi) 
            
            if self.a == nan:
                print "There's a problem with semi-major axis. Problem details:"
                print "Position:",self.r0
                print "Velocity:",self.v0
            # Auxilary variable alpha
            self.alpha = 1.0 / self.a
        
        # Angular momentum vector and normalized
        self.h = cross(self.r0,self.v0)
        self.hl = norm(self.h)
        
        # p is the semi-parameter
        self.p = self.hl**2 / self.mu
        
        print "p",self.p
        print "a",self.a
        self.e = math.sqrt(1 - self.p / self.a)        
        
        # Apses
        if self.a:
            self.periapsis = (1 - self.e) * self.a
            self.apoapsis = (1 + self.e) * self.a
        else:
            self.periapsis = self.hl**2 / self.mu
            self.apoapsis = nan
        
        print "Semi-major",self.a
        print "Eccentricity",self.e
        print "Apoapsis",self.apoapsis
        print "Periapsis",self.periapsis
        
        
        # Dot product of position and velocity        
        self.rvdot = self.r0.dot(self.v0)


        
        
        
    def get(self,t):
        ''' 
        Get 3D position and velocity at time t 
        Returns [r (numpy.array), v (numpy.array)]
        '''
        
        # (1) Delta-t
        dt = t - self.t0
        
        if dt == 0:
            return [self.r0,self.v0]
        
        #print("Semi-major: %f"%self.a)
        #print("alpha: %f"%self.alpha)
        #print("mu: %f"%self.mu)
        
        # (2) Create the initial X variable guess for
        #  2a) Elliptic or circular orbit
        if self.alpha > 1e-20:
            X0 = sqrt(self.mu) * dt * self.alpha
        
        #  2b) Parabolic orbit
        elif abs(self.alpha) < 1e-20:
            self.s = arctan((1)/(3*sqrt(self.mu / self.p**3)*dt)) / 2.0
            self.w = arctan(tan(self.s)**(1.0/3.0))
            X0 = sqrt(self.p) * 2 * (cos(2*self.w)/sin(2*self.w))
            logging.debug("s: %f"%self.s)
        
        #  2c) Hyperbolic orbit
        elif self.alpha < -1e-20:
            sdt = sign(dt)
            if sdt == 0:
                sdt = 1
            print "dt",dt
            print "a",self.a
            var1 =  sdt * sqrt(-self.a)
            var2 = -2*self.mu*self.alpha*dt
            var3 = self.rvdot * sdt * sqrt(-self.mu * self.a) * (1- self.r0l * self.alpha)
            print "var1",var1
            print "var2",var2
            print "var3",var3
            print "rvdot",self.rvdot
            print "r0l",self.r0l
            
            X0 = sdt * sqrt(-self.a) * log((-2*self.mu*self.alpha*dt) / (self.rvdot * sdt * sqrt(-self.mu * self.a) * (1- self.r0l * self.alpha)))
    
        else:
            logging.error("Error, ALPHA")
            raise AttributeError
        
        logging.debug("X0: %f"%X0)
        Xnew = X0
        
        # (3) Loop until we get an accurate (tolerance 1e-6) value for X
        while True:
            psi = Xnew**2 * self.alpha
            c2,c3 = self.FindC2C3(psi)
            
            logging.debug("psi: %f"%psi)
            logging.debug("c2: %f"%c2)
            logging.debug("c3: %f"%c3)
            
            r = Xnew**2 * c2 + self.rvdot / sqrt(self.mu) * Xnew * (1 - psi * c3) + self.r0l * (1 - psi * c2)

            Xold = Xnew
            Xnew = Xold + (sqrt(self.mu)*dt - Xold**3 * c3 - self.rvdot / sqrt(self.mu) * Xold**2 * c2 - self.r0l * Xold * (1 - psi * c3)) / r
            
            if abs(Xnew - Xold) < 1e-6:
                break
        
        logging.debug("X optimized at %f"%Xnew)
        
        # (4) Calculate universal functions f, g and f-dot and g-dot
        f = 1 - Xnew**2/self.r0l * c2
        g = dt - Xnew**3 / sqrt(self.mu) * c3
        gd = 1 - Xnew**2/r * c2
        fd = sqrt(self.mu) / (r*self.r0l) * Xnew * (psi * c3 - 1)

        logging.debug("f: %f"%f)
        logging.debug("g: %f"%g)
        logging.debug("fd: %f"%fd)
        logging.debug("gd: %f"%gd)
        
        # 
        R = f * self.r0 + g * self.v0 
        V = fd * self.r0 + gd * self.v0 
        
        logging.debug( "r: %f"%r)
        logging.debug( "r0l: %f"%self.r0l)
        logging.debug( "Position: %s"%str(R))
        logging.debug( "Velocity: %s"%str(V))
        logging.debug( "Check: %f"%(f*gd-fd*g))
        
        return [R,V]
            
    def FindC2C3(self, psi):
        '''
        Finds the helper variables c2 and c3 when given psi
        '''
        if psi > 1e-20:
            sqrtpsi = sqrt(psi)
            c2 = (1 - cos(sqrtpsi)) / psi
            c3 = (sqrtpsi - sin(sqrtpsi)) / sqrt(psi**3)
        else:
            if psi < -1e-20:
                sqrtpsi = sqrt(-psi)
                c2 = (1 - cosh(sqrtpsi)) / psi
                c3 = (sinh(sqrtpsi) - sqrtpsi) / sqrt(-psi**3)
                
            else:
                c2 = 0.5
                c3 = 1.0/6.0
                
        return (c2,c3)
                
    def RotateZ(self,vector,angle):
        rot_matrix = array([[cos(angle), sin(angle), 0], [-sin(angle), cos(angle), 0], [0, 0, 1]])
        return dot(vector,rot_matrix)
    
    def getGround(self,t):
        ''' 
        Get ground position given t
        Currently supports only Kerbin
        
                 float            float
        returns [right ascension, declination]
                 longitude        latitude
        '''
        
        # (1) Get current 3D position
        r = self.get(t)[0]
        
        # (2) Calculate theta (planet rotation)
        # -0.00029.. Kerbins angular velocity rad(/s)
        #  1.57079.. 90 degrees, initial t=0 rotation (depends on map?)
        #          0.000290888208665722
        #theta =  -0.0002908882086657216 * t #- 1.5707963267948966
        # 22.0827470297 degree diff
        theta = -self.parent.angular_velocity * (t) + self.parent.system.frame_rotation - self.parent.initial_rotation #+ self.parent.planet_rotation_adjustment #radians( 64.9449644128)#- self.parent.initial_rotation
        
        #print "rotation with time:",degrees(self.parent.angular_velocity * t)%360
        #print "+90"
        #print "Theta",degrees(theta)%360
        # (3) Create a rotation matrix and rotate the current position
        rot_matrix = array([[cos(theta), sin(theta), 0], [-sin(theta), cos(theta), 0], [0, 0, 1]])
        #rot_matrix = array([[cos(theta), -sin(theta), 0], [sin(theta), cos(theta), 0], [0, 0, 1]])
        rr = dot(r,rot_matrix)
        ur = rr / norm(rr)
        
        # (4) Solve declination (latitude)
        declination = arcsin(ur[2])
        
        # (5) Solve right ascension (longitude)
        if ur[1] > 0:
            rasc = degrees(arccos(ur[0] / cos(declination)))
        elif ur[1] <= 0:
            rasc = -degrees(arccos(ur[0]/ cos(declination)))
        
        # (6) Data to degrees, NOTE the order of return
        declination = degrees(declination)
        
        logging.debug("Theta: %f degrees, rad %f"%(degrees(theta),theta))
        logging.debug("Declination: %f degrees, rad %f"%(declination,radians(declination)))
        logging.debug("R. ascension: %f degrees, rad %f"%(rasc,radians(rasc)))
        logging.debug("ur: %s"%str(ur))
        
        xy = array([ur[0],ur[1],0.0])
        
        #trasc1 = degrees(arccos(xy.dot(array([1,0,0]))))
        #trasc2 = degrees(arccos(xy.dot(array([1,0,0]))))
        """
        logging.info("Test right ascension 1a:" + str(trasc1))
        logging.info("Test right ascension 1b:" + str((trasc1+degrees(theta))%360))
        logging.info("Test right ascension 1c:" + str((trasc1-degrees(theta))%360))
        logging.info("Test right ascension 2a:" + str(trasc2))
        logging.info("Test right ascension 2b:" + str((trasc2+degrees(theta))%360))
        logging.info("Test right ascension 2c:" + str((trasc2-degrees(theta))%360))
        """
        rl = norm(r)
        if rl < self.parent.radius:
            below_radius = True
        else:
            below_radius = False
        return [rasc,declination,below_radius]
        
    def getPeriod(self):
        ''' 
        Gets the period of orbit.
        Note! Currently works only on e<1 orbits!
        '''
        if self.a > 0:
            return PI2*sqrt(self.a**3/self.mu)
        else:
            return 0

def RotationMatrix(axis, angle):
    # We are not going to check if the axis is a unit vector.
    # Whats going on here?
    # http://en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle
    
    cos_angle = cos(angle)
    cos_angle_one = 1 - cos_angle
    sin_angle = sin(angle)
    x = axis[0]
    y = axis[1]
    z = axis[2]
    
    ri1 = cos_angle + x**2 * cos_angle_one
    ri2 = x * y * cos_angle_one - z * sin_angle
    ri3 = x * z * cos_angle_one + y * sin_angle

    rj1 = y * x * cos_angle_one + z * sin_angle
    rj2 = cos_angle + y**2 * cos_angle_one
    rj3 = y * z * cos_angle_one - x * sin_angle

    rk1 = z * x * cos_angle_one - y * sin_angle
    rk2 = z * y * cos_angle_one + x * sin_angle
    rk3 = cos_angle + z**2 * cos_angle_one

    return array([[ri1, ri2, ri3], [rj1, rj2, rj3], [rk1, rk2, rk3]])
    

    
