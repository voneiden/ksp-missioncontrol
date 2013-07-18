from numpy import sin, sinh, cos, cosh, tan, sign, sqrt, cross, arctan, log, norm

class Orbit:
    def __init__(self,mu,r0,v0,t0):
        self.mu = mu
        self.r0 = r0
        self.v0 = v0
        self.t0 = t0
        
        self.recalculate()
        
    def recalculate(self):
        self.r0l = norm(self.r0)
        self.xi = self.v0**2.0 / 2.0 - self.mu / self.r0 
        self.a  = -self.mu / (2*self.xi) 
        self.alpha = 1.0 / self.a
        self.h = cross(self.r0,self.v0)
        self.p = self.h**2 / self.mu
        self.rvdot = self.r0.dot(self.v0)
        # Helper variable for parabolic orbits
        
        
        
    def get(self,t):
        dt = t - self.t0
        
        # Elliptic        
        if self.alpha > 1e-6:
            X0 = sqrt(self.mu) * dt * self.alpha
        
        elif abs(self.alpha) < 1e-6:
            self.s = arctan((1)/(3*sqrt(self.mu / self.p**3)*dt)) / 2.0
            self.w = arctan(tan(self.s)**(1.0/3.0))
            X0 = sqrt(self.p) * 2 * (cos(2*self.w)/sin(2*self.w))
            
        elif self.alpha < -1e-6:
            X0 = sign(dt) * sqrt(-self.a) * log((-2*self.mu*self.alpha*dt) / (self.rvdot * sign(dt) * sqrt(-self.mu * self.a) * (1- self.r0 * self.alpha)))
    
        else:
            print "Error, alpha is",self.alpha
            raise SyntaxError
            
        Xnew = X0
        while True:
            psi = Xnew**2 * self.alpha
            c2,c3 = self.FindC2C3(psi)
            r = Xnew**2 * c2 + self.rvdot / sqrt(self.mu) * Xnew * (1 - psi * c3) + self.r0l * (1 - psi * c2)
            
            Xold = Xnew
            Xnew = Xold + (sqrt(self.mu)*dt - Xold**3 * c3 - self.rvdot / sqrt(self.mu) * Xold**2 * c2 - self.r0l * Xold (1 - psi * c3)) / r
            
            if abs(Xnew - Xold) < 1e-6:
                break
        
        print "X optimized at",Xnew
        
        f = 1 - Xnew**2/self.r0 * c2
        g = dt - Xnew**3 / sqrt(self.mu) * c3
        gd = 1 - Xnew**2/r * c2
        fd = dt - sqrt(self.mu) / (r*self.r0l) * Xnew * (psi * c3 - 1)
        
        R = f * self.r0 + g * self.v0 
        V = fd * self.r0 + gd * self.v0 
        
        print "Position:",R
        print "Velocity:",V
        print "Check:",f*gd-fd*g
        
            
    def FindC2C3(self, psi):
        if psi > 1e-6:
            c2 = (1 - cos(sqrt(psi))) / psi
            c3 = (sqrt(psi) - sin(sqrt(psi))) / sqrt(psi**3)
        else:
            if psi < -1e-6:
                c2 = (1 - cosh(sqrt(-psi))) / psi
                c3 = (sinh(sqrt(-psi)) - sqrt(-psi)) / sqrt(-psi**3)
                
            else:
                c2 = 0.5
                c3 = 1.0/6.0
        return (c2,c3)
                
    