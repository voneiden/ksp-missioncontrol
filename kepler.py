""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
"""

from numpy import sin, sinh, arcsin, cos, cosh, arccos, tan, arctan 
from numpy import sign, sqrt, cross, log, array, dot, degrees, radians, inf
from numpy.linalg import norm

class Orbit:
    ''' This class provides orbit prediction '''
    
    def __init__(self,mu,r0,v0,t0):
        ''' 
        mu - gravitational constant of the parent body
        r0 - initial position (3d array)
        v0 - initial velocity (3d array)
        t0 - initial epoch (time)
        '''
        self.mu = mu
        self.r0 = r0
        self.v0 = v0
        self.t0 = t0
        
        self.recalculate()
        
    def recalculate(self):
        ''' 
        Call this function every time the initial parameters are changed.
        It calculates some auxilary variables.
        '''
        
        print "Initializing.."
        print "mu",self.mu
        print "r0",self.r0 
        print "v0",self.v0
        print "t0",self.t0
        
        # Normalized position and velocity vectors
        self.r0l = norm(self.r0)
        self.v0l = norm(self.v0)
        
        # Auxilary variable xi
        self.xi = self.v0l**2.0 / 2.0 - self.mu / self.r0l 
        
        if self.xi == 0:
            self.a = inf
            self.alpha = 1.0
        
        else:
            # Semi major axis
            self.a  = -self.mu / (2*self.xi) 
        
            # Auxilary variable alpha
            self.alpha = 1.0 / self.a
        
        # Angular momentum vector and normalized
        self.h = cross(self.r0,self.v0)
        self.hl = norm(self.h)
        
        # Umm.. 
        self.p = self.hl**2 / self.mu
        
        # Dot product of position and velocity        
        self.rvdot = self.r0.dot(self.v0)


        
        
        
    def get(self,t):
        ''' Get position and velocity at time t '''
        
        # Delta-t
        dt = t - self.t0
        
        
        print "Semi-major",self.a
        print "alpha:",self.alpha
        
        # Create the initial X variable guess for
        # a) Elliptic or circular orbit
        if self.alpha > 1e-20:
            X0 = sqrt(self.mu) * dt * self.alpha
        
        # b) Parabolic orbit
        elif abs(self.alpha) < 1e-20:
            self.s = arctan((1)/(3*sqrt(self.mu / self.p**3)*dt)) / 2.0
            print "s:",self.s
            self.w = arctan(tan(self.s)**(1.0/3.0))
            X0 = sqrt(self.p) * 2 * (cos(2*self.w)/sin(2*self.w))
        
        # c) Hyperbolic orbit
        elif self.alpha < -1e-20:
            X0 = sign(dt) * sqrt(-self.a) * log((-2*self.mu*self.alpha*dt) / (self.rvdot * sign(dt) * sqrt(-self.mu * self.a) * (1- self.r0 * self.alpha)))
    
        else:
            print "Error, alpha is",self.alpha
            raise SyntaxError
        
        print "X0 is",X0
        Xnew = X0
        
        # Loop until we get a good value
        while True:
            psi = Xnew**2 * self.alpha
            print "psi",psi
            c2,c3 = self.FindC2C3(psi)
            print "c2",c2
            print "c3",c3
            r = Xnew**2 * c2 + self.rvdot / sqrt(self.mu) * Xnew * (1 - psi * c3) + self.r0l * (1 - psi * c2)
            r = Xnew**2 * c2 + self.rvdot / sqrt(self.mu) * Xnew * (1 - psi * c3) + self.r0l * (1 - psi * c2)

            Xold = Xnew
            Xnew = Xold + (sqrt(self.mu)*dt - Xold**3 * c3 - self.rvdot / sqrt(self.mu) * Xold**2 * c2 - self.r0l * Xold * (1 - psi * c3)) / r
            
            if abs(Xnew - Xold) < 1e-6:
                break
        
        print "X optimized at",Xnew
        
        # Calculate universal functions f, g and f-dot and g-dot
        f = 1 - Xnew**2/self.r0l * c2
        g = dt - Xnew**3 / sqrt(self.mu) * c3
        gd = 1 - Xnew**2/r * c2
        fd = sqrt(self.mu) / (r*self.r0l) * Xnew * (psi * c3 - 1)

        print "f",f
        print "g",g
        print "fd",fd
        print "gd",gd
        R = f * self.r0 + g * self.v0 
        V = fd * self.r0 + gd * self.v0 
        print
        print "r",r
        print "r0l",self.r0l
        
        print "Position:",R
        print "Velocity:",V
        print "Check:",f*gd-fd*g
        return R,V
            
    def FindC2C3(self, psi):
        if psi > 1e-20:
            c2 = (1 - cos(sqrt(psi))) / psi
            c3 = (sqrt(psi) - sin(sqrt(psi))) / sqrt(psi**3)
        else:
            if psi < -1e-20:
                c2 = (1 - cosh(sqrt(-psi))) / psi
                c3 = (sinh(sqrt(-psi)) - sqrt(-psi)) / sqrt(-psi**3)
                
            else:
                c2 = 0.5
                c3 = 1.0/6.0
        return (c2,c3)
                
    
    
    def get_ground(self,r,t):
        
        # Theta is the angular velocity (rad/s) of the planet
        theta = -0.000290888209 * t
        
        # Create a rotation matrix
        rot_matrix = array([[cos(theta), sin(theta), 0], [-sin(theta), cos(theta), 0], [0, 0, 1]])
        
        # Rotate our "position"
        rr = dot(r,rot_matrix)
        
        # Normalize rotated position vector
        ur = rr / norm(rr)
        
        # Solve declination
        declination = degrees(arcsin(ur[2]))
        
        # Solve right ascension
        if ur[1] > 0:
            rasc = degrees(arccos(ur[0] / cos(declination)))
        elif ur[1] <= 0:
            rasc = -degrees(arccos(ur[0]/ cos(declination)))
           # print "360-",np.degrees(np.arccos(ur[0]/ np.cos(declination)))
        print "Declination:",declination,"degrees, rad",radians(declination)
        print "R. ascension:",rasc,"degrees, rad",radians(rasc)
        print "Cos declination",cos(declination)
        print "ur",ur
    
        return declination,rasc