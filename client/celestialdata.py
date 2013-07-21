# -*- coding: utf-8 -*-
"""
Created on Wed Jul 17 21:49:42 2013

@author: snaipperi
"""
from numpy import array, cross, inf, pi, arccos
from numpy.linalg import norm

import kepler

PI2 = 2*pi
#Define constants
class Celestial(object):
    def __init__(self,parent,name,**kwargs):
        self.parent = parent
        self.name = name
        
        if "trv" in kwargs and self.parent:
            self.orbit = kepler.Orbit(self.parent,**kwargs)
        #elif "elements" in kwargs:
        #    pass
        elif not self.parent:
            self.orbit = None
        else:
            raise AttributeError
            
        
        if "mu" in kwargs:
            self.mu = kwargs["mu"]
        else:
            self.mu = None
    

        
        
        
class Sun(Celestial):
    def __init__(self,**kwargs):
        Celestial.__init__(self,None,"Sun",**kwargs)
        
class Planet(Celestial):
    def __init__(self,parent,name,**kwargs):
        Celestial.__init__(self,parent,name,**kwargs)

class Vessel(Celestial):
    def __init__(self,parent,name,**kwargs):
        Celestial.__init__(self,parent,name,**kwargs)
        
        '''
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
                   '''