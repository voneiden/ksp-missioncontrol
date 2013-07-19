# -*- coding: utf-8 -*-
"""
Created on Wed Jul 17 21:49:42 2013

@author: snaipperi
"""
from numpy import array, cross, norm, inf, pi, arccos

PI2 = 2*pi
#Define constants
class Celestial(object):
    def __init__(self,parent,**kwargs):
        self.parent = parent
        
        if "elements" in kwargs:
            pass
        elif "rv" in kwargs:
            r = kwargs["rv"][0]
            v = kwargs["rv"][1]
            
            self.orbitFromVectors(r,v)
        else:
            raise AttributeError
            
        
        if "mu" in kwargs:
            self.mu = kwargs["mu"]
        else:
            self.mu = None
    
    def orbitFromVectors(self,vec_r,vec_v):
        ''' Based on Vallado '''
        if not isinstance(vec_r,array) or isinstance(vec_v,array):
            raise AttributeError("Needs array")
        
        mu = self.parent.mu
        
        nrm_r = norm(vec_r)
        nrm_v = norm(vec_v)        
        
        # (1) Calculate angular momentum
        vec_h = cross(vec_r, vec_v)
        nrm_h = norm(vec_h)
        
        # (2) Calculate node vector
        vec_n = cross(array([0,0,1]), vec_h)
        
        # (3) Calculate eccentricity vector
        
        vec_e = ( (nrm_v**2 - mu/nrm_r)*vec_r - (vec_r.dot(vec_r))*vec_v ) / mu
        nrm_e = norm(e)
        
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
        
        
        
class Sun(Celestial):
    def __init__(self):
        Celestial.__init__(self)
        
class Planet(Celestial):
    def __init__(self):
        Celestial.__init__(self)
        
        
Kerbol = Sun("Kerbol",mu=1.1723328e18,radius=261600000)

Kerbin = Planet("Kerbin", Kerbol,
                elements=[0,13599840256,0,0,0,0,3.14000010490417],
                mu=3531600000000,
                radius=600000,
                SoI=84159286)
                
Mun = Moon("Mun",Kerbin,
           elements=[0,12000000,0,0,0,0,1.70000004768372], 
           mu=65138398000,
           radius=200000,
           SoI=2429559.1)

Minmus = Moon("Minmus",Kerbin,
              elements=[0,47000000,0,6,78,38,0.899999976158142],
              mu=1765800000 ,
              radius=60000,
              SoI=2247428.4 )               
                
            

Duna = Planet("Duna",Kerbol,
              elements=[0,20726155264,
                        0.0509999990463257,
                        0.0599999986588955,
                        135.5,
                        0,
                        3.14000010490417],
               mu=301363210000.0,
               radius=320000.0,
               SoI=47921949.0)
 
 
 
Dres = Planet("Dres",Kerbol,
              elements=[0,40839348203,
                        0.144999995827675,
                        5,
                        280,
                        90,
                        3.14000010490417],
                    mu=21484489000 ,
                    radius=138000,
                    SoI=32832840)
 
Jool = Planet("Jool",Kerbol,
              elements=[0,68773560320,
                        0.0500000007450581,
                        1.30400002002716,
                        52,
                        0,
                        0.100000001490116],
                    mu=2.82528e14,
                    radius=6000000 ,
                    SoI=2455985200 )
 
Eve = Planet("Eve",Kerbol,
             elements=[0,9832684544,
                       0.00999999977648258,
                       2.09999990463257,
                       15,
                       0,
                       3.14000010490417],
                   mu=8.1717302e12 ,
                   radius=700000,
                   SoI=85109365 )
 
Moho = Planet("Moho",Kerbol,
              elements=[0,5263138304,
                       0.200000002980232,
                       7,
                       70,
                       15,
                       3.14000010490417],
                   mu=245250000000 ,
                   radius=250000,
                   SoI=11206449)
 
Eeloo = Planet("Eeloo",Kerbol,
               elements=[0,90118820000,
                       0.26,
                       6.15,
                       50,
                       260,
                       3.14000010490417],
                   mu=74410815000 ,
                   radius=210000,
                   SoI=119082940) 