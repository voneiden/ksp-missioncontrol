# -*- coding: utf-8 -*-
"""
Created on Sat Aug 17 14:36:10 2013

@author: voneiden
"""
import numpy as np
cimport numpy as np

DTYPE = np.float64
ctypedef np.float64_t DTYPE_t


def GetPositionAtT(float t, float t0, np.ndarray[DTYPE_t, ndim=1] r0, 
                   float r0l,
                   np.ndarray[DTYPE_t, ndim=1] v0,
                   float v0l, float mu, float alpha,
                   float a, float p, float rvdot):
    cdef float X0, s, w, var1, var2, var3, Xnew, Xold, c2, c3, psi, r, f, g, gd, fd
    cdef int std
    cdef np.ndarray[DTYPE_t, ndim=1] R
    cdef np.ndarray[DTYPE_t, ndim=1] V
    
    cdef float dt = t - t0
    
    if dt == 0:
        return [r0,v0]
        
    
    # Elliptic orbit
    if alpha > 1e-20:
            X0 = np.sqrt(mu) * dt * alpha
        
    # Parabolic orbit
    elif np.abs(alpha) < 1e-20:
        s = np.arctan(1.0 / (3.0 * np.sqrt(mu / p**3) * dt)) / 2.0
        w = np.arctan(np.tan(s)**(1.0 / 3.0))
        X0 = np.sqrt(p) * 2 * (np.cos(2 * w) / np.sin(2 * w))
    
    # Hyperbolic orbit
    elif alpha < -1e-20:
        sdt = np.sign(dt)
        if sdt == 0:
            sdt = 1
            
        var1 =  sdt * np.sqrt(-a)
        var2 = -2 * mu * alpha *dt
        var3 = rvdot * sdt * np.sqrt(-mu * a) * (1 - r0l * alpha)
        
        X0 = sdt * np.sqrt(a) * np.log((-2 * mu * alpha * dt) / (rvdot * sdt * np.sqrt(-mu * a) * (1 - r0l * alpha)))

    else:
        raise ValueError("Unable to handle alpha value")
    
    Xnew = X0
    
    while True:
        psi = Xnew**2 * alpha
        c2,c3 = FindC2C3(psi)
        
  
        
        r = Xnew**2 * c2 + rvdot / np.sqrt(mu) * Xnew * (1 - psi * c3) + r0l * (1 - psi * c2)
    
        Xold = Xnew
        Xnew = Xold + (np.sqrt(mu)*dt - Xold**3 * c3 - rvdot / np.sqrt(mu) * Xold**2 * c2 - r0l * Xold * (1 - psi * c3)) / r
        
        if abs(Xnew - Xold) < 1e-6:
            break
        
        
    f = 1 - Xnew**2 / r0l * c2
    g = dt - Xnew**3 / np.sqrt(mu) * c3
    gd = 1 - Xnew**2 / r * c2
    fd = np.sqrt(mu) / (r * r0l) * Xnew * (psi * c3 - 1)

    R = f * r0 + g * v0 
    V = fd * r0 + gd * v0 
    
    return R, V
    
def FindC2C3(float psi):
    #
    #Finds the helper variables c2 and c3 when given psi
    #
    cdef float sqrtpsi, c2, c3
    if psi > 1e-20:
        sqrtpsi = np.sqrt(psi)
        c2 = (1 - np.cos(sqrtpsi)) / psi
        c3 = (sqrtpsi - np.sin(sqrtpsi)) / np.sqrt(psi**3)
    else:
        if psi < -1e-20:
            sqrtpsi = np.sqrt(-psi)
            c2 = (1 - np.cosh(sqrtpsi)) / psi
            c3 = (np.sinh(sqrtpsi) - sqrtpsi) / np.sqrt(-psi**3)
            
        else:
            c2 = 0.5
            c3 = 1.0/6.0
            
    return c2, c3
def test():
    print("OK")