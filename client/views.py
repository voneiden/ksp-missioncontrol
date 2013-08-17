# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain 
 * this notice you can do whatever you want with this stuff. If we meet some 
 * day, and you think this stuff is worth it, you can buy me a beer in return.
"""
import celestialdata
import kepler
import pygame
from elements import Button, Input

from numpy import array, cross, arccos
from numpy.linalg import norm

FONT = None
            
class Canvas(pygame.Surface):
    def __init__(self, monitor, resolution, position):
        pygame.Surface.__init__(self, resolution)
        
        self.monitor = monitor
        self.display = monitor.display
        self.system  = monitor.system
        
        self.resolution = resolution
        self.position = position
        
        # This list contains all the canvas elements
        self.elements = []
        
        self.hilightElement = None
        self.focusElement = None
        

        
        
    def motion(self,pos):
        #print ("motion",self,pos)
        rect = pygame.Rect(pos,(1,1))

        if self.hilightElement and not self.hilightElement.shape.contains(rect):
            self.hilightElement.dehilight()
            self.hilightElement = None
            
        for element in self.elements:
            if element.shape.contains(rect):
                if self.hilightElement:
                    self.hilightElement.dehilight()
                element.hilight()
                self.hilightElement = element
                    
                
                
    def click(self,pos):
        print ("click",self,pos)
        rect = pygame.Rect(pos,(1,1))
        
        if self.focusElement and \
                isinstance(self.focusElement,Input) and \
                not self.focusElement.shape.contains(rect):
            self.focusElement.defocus()
            self.focusElement = None
        
        for element in self.elements:
            if element.shape.contains(rect):
                self.focusElement = element
                element.focus()
                element.click()
                
                #if isinstance(element,Button):
                #    pygame.event.post(pygame.event.Event(pygame.USEREVENT+1,{'button':element}))
            
                
        print "Done"

        
    def defocus(self):
        #print "DEFOCUS"
        if self.hilightElement:
            self.hilightElement.dehilight()
            self.hilightElement = None
        
        # Somebody is gonna complain about this sooner or later defocusing input when moving mouse..
        if self.focusElement:
            self.focusElement.defocus()
            self.focusElement = None

    def draw(self):
        self.fill(0,0,0)
        


class MainMenu(Canvas):
    def __init__(self, monitor, resolution, position):
        Canvas.__init__(self, monitor, resolution, position)
        
        self.btn_connect = Button(self,pygame.Rect(5,25,60,20),"Connect")
        self.elements.append(self.btn_connect)
        self.btn_connect.click = self.doConnect
        
        self.inp_ip = Input(self,pygame.Rect(70,25,200,20),"192.168.1.13")
        self.elements.append(self.inp_ip)
        
        
        
        self.draw()
        
    def draw(self):
        self.fill((0,0,0))
        
        if self.monitor.system.network.socket:
            cstr1 = FONT.render("Connected: Yes",False,(255,255,255))
        else:
            cstr1 = FONT.render("Connected: No",False,(255,255,255))
        self.blit(cstr1,(5,5))
        
        for element in self.elements:
            element.render()
        
        
        
    def doConnect(self):
        ip = self.inp_ip.text 
        self.monitor.system.network.connect(ip)
        self.draw()
        if self.monitor.system.network.socket:
            self.monitor.system.network.socket.send("FULLSYNC;")
    
    
class FlightLogger(Canvas):
    def __init__(self, monitor, resolution, position):
        Canvas.__init__(self, monitor, resolution, position)
        
        #self.btn_connect = Button(self,pygame.Rect(5,25,60,20),"Connect")
        #self.elements.append(self.btn_connect)
        #self.btn_connect.click = self.doConnect
        
        #self.inp_ip = Input(self,pygame.Rect(70,25,200,20),"192.168.1.13")
        #self.elements.append(self.inp_ip)
        
        
        
        self.draw()
        
    def draw(self):
        self.fill((0,0,0))
        if self.monitor.system.active_vessel:
            vessel = self.monitor.system.active_vessel
            
            name = FONT.render(vessel.name, False, (0, 255, 0))
            self.blit(name, (5, 5))
            
            surface_velocity = FONT.render("Surface velocity: %i"%(vessel.surface_velocity), False, (0, 255, 0))
            self.blit(surface_velocity, (5, 20))
            
            vertical_velocity = FONT.render("Vertical velocity: %i"%(vessel.vertical_velocity), False, (0, 255, 0))
            self.blit(vertical_velocity, (5, 35))
            

            
        for element in self.elements:
            element.render()
        
        
        
    def doConnect(self):
        ip = self.inp_ip.text 
        self.monitor.system.network.connect(ip)
        self.draw()
        if self.monitor.system.network.socket:
            self.monitor.system.network.socket.send("FULLSYNC;")
    
            

class GroundTrack(Canvas):
    def __init__(self, monitor, resolution, position):
        Canvas.__init__(self, monitor, resolution, position)
        
        #self.map_kerbin = pygame.image.load("maps/kerbin.png")
        self.maps = {}
        self.maps["kerbin"] = pygame.image.load("maps/kerbin.png")
        self.map = self.maps["kerbin"]
        
        # TMP is used to render ground tracks of non-active vessels
        self.tmp = pygame.Surface(resolution)
        
        self.longitude = 180
        self.latitude  = 180
        
        #self.thetas 
    def cc(self,pos):
        ''' Ground track 0,0 is top left corner of the map image '''
        #pos[0] %= 360.0
        x = pos[0]
        y = pos[1]
        x *= 1.6666666666666667
        y *= -1.6666666666666667
        x += 100+300
        y += 150
        
        return [int(x), int(y)]
        
    def draw_tmp(self):
        ''' Draws the tmp ground track for non active vessels '''
        self.tmp.fill((0,0,0))
        
    def draw(self):
        self.fill((0,0,0))
        self.blit(self.map,(0,0))
        
        #for vessel in self.monitor.system.vessels.values():
        vessel = self.system.active_vessel
        
        if vessel:
            print "orbit",vessel.orbit
            print "DRAW",vessel,vessel.name
        else:
            return
        
        if vessel and vessel.orbit:
            lonlat = vessel.orbit.getGround(self.monitor.system.UT)
            #logging.info("clat: %f"%lonlat[1])
            #logging.info("clon: %f"%lonlat[0])
            r,v = vessel.orbit.get(self.monitor.system.UT)
            #logging.info("r: %s"%str(r))
            #logging.info("v: %s"%str(v))
            curpos = self.cc(lonlat)
            
            #print "DRAWING INTO",curpos
            #print "!"*50
            #print "UT",self.monitor.system.UT
            pygame.draw.circle(self,[255,255,255],curpos,3)
            period = vessel.orbit.getPeriod()
            step = period / 30
            #points = []
            lp = np = None
            
            
            for i in xrange(60):
                if np:
                    lp = [np[0],np[1]]
                i -= 30
                np = vessel.orbit.getGround(self.monitor.system.UT + i*step)
                if not lp:
                    continue
                if np[2]:
                    np = None
                    lp = None
                    continue
                # TODO: this is just for showcasing
               # print "###",i,np,"<",lp
                
                # Check if new point has wrapped. What's a smart way to do this, I DUNNO?
                if lp[0] - np[0] > 180:
                    # East-West warp
                    tp = [np[0]+360.0, np[1]]
                    slope = (tp[1]-lp[1]) / (tp[0]-lp[0])
                    
                    Y = (180.0-lp[0])*slope+lp[1]

                    pygame.draw.line(self,[255,255,0],self.cc(lp),self.cc([180.0,Y]))

                    pygame.draw.line(self,[255,255,0],self.cc([-180.0,Y]),self.cc(np))

                    
                elif lp[0] - np[0] < -180:
                    # West-East warp
                    tp = [np[0]-360.0, np[1]]
                    slope = (tp[1]-lp[1]) / (tp[0]-lp[0])
                    
                    Y = (-180.0-lp[0])*slope+lp[1]

                    pygame.draw.line(self,[255,0,255],self.cc(lp),self.cc([-180.0,Y]))

                    pygame.draw.line(self,[255,0,255],self.cc([180.0,Y]),self.cc(np))
                    
                
                else:
                    pygame.draw.line(self,[255,255,255],self.cc(lp),self.cc(np))
            #pygame.draw.lines(self,[255,255,255],True,points)
            
                #print "lp",lp
                #print "np",np
        elif vessel:
            curpos = self.cc(vessel.coordinates)
            pygame.draw.circle(self,[255,255,255],curpos,3)
            
        else:
            return

class Plotter(Canvas):
    SHIP_PROJECTION_MODE = "plotter_ship_projection_mode" # Defines projection for the view. Either REF or SHP
    REFERENCE_BODY = "plotter_reference_body" # Reference body
    TARGET_VESSEL = "plotter_target_vessel"
    PLOT_VESSELS = "plotter_plot_ships" # List of ships to plot (non-active)
    PLOT_CHILDREN = "plotter_plot_children" # Plot children objects (moons etc)
    ORBIT_CACHE = "plotter_orbit_cache"
    
    PLOT_COLORS = {
                    "Sun":[pygame.Color("yellow"),4],
                    "Moho":[pygame.Color("brown"),1],
                    "Eve":[pygame.Color("purple"),2],
                    "Kerbin":[pygame.Color("blue"),2],
                    "Duna":[pygame.Color("orange"),2],
                    "Dres":[pygame.Color("gray"),2],
                    "Jool":[pygame.Color("green"),3],
                    "Eeloo":[pygame.Color("cyan"),2],
                    "Mun":[pygame.Color("grey"),0],
                    "Minmus":[pygame.Color("cyan"),0]}
    

    def __init__(self, monitor, resolution, position):
        Canvas.__init__(self, monitor, resolution, position)

        # Define default settings
        
        if not self.SHIP_PROJECTION_MODE in self.monitor.settings:
            self.monitor.settings[self.SHIP_PROJECTION_MODE] = False
            
        if not self.REFERENCE_BODY in self.monitor.settings:
            if "Sun" in self.monitor.system.celestials:
                self.monitor.settings[self.REFERENCE_BODY] = self.monitor.system.celestials["Sun"]
            else:
                self.monitor.settings[self.REFERENCE_BODY] = None
            
        if not self.TARGET_VESSEL in self.monitor.settings:
            self.monitor.settings[self.TARGET_VESSEL] = self.system.active_vessel
            
        if not self.PLOT_VESSELS in self.monitor.settings:
            self.monitor.settings[self.PLOT_VESSELS] = []
          
        if not self.PLOT_CHILDREN in self.monitor.settings:
            self.monitor.settings[self.PLOT_CHILDREN] = True
            
        if not self.ORBIT_CACHE in self.monitor.settings:
            self.monitor.settings[self.ORBIT_CACHE] = {}
            self.precalculate_orbits()
            
        self.draw()
    
    def cc(self, px, py):
        px += self.resolution[0]/2.0
        py += self.resolution[1]/2.0
        return [int(px), int(py)]
        
    def precalculate_orbits(self):
        for celestial in self.monitor.system.celestials.values():
            if celestial.name == "Sun":
                continue
            else:
                period = celestial.orbit.getPeriod()
                step = period / 40
                points = []
                
                for i in xrange(40):
                    points.append(celestial.orbit.get(i*step)[0])
                    
                self.monitor.settings[self.ORBIT_CACHE][celestial.name] = points
                
        
    def draw(self):
        #print "Redraw"
        self.fill([0,0,0])
        
        if not self.monitor.settings[self.REFERENCE_BODY]:
            error = FONT.render("NO REF",False,(255,255,255))
            self.blit(error, self.cc([-10,-5]))
            return
            
        target_vessel = self.monitor.settings[self.TARGET_VESSEL]
        reference_body = self.monitor.settings[self.REFERENCE_BODY]
        # First determine everything we need to plot
        
        plot = []
        
        plot.append(reference_body)
        
        if self.monitor.settings[self.PLOT_CHILDREN]:
            for child in reference_body.children:
                plot.append(child)
                
        if target_vessel and target_vessel.parent == reference_body:
            plot.append(target_vessel)
            
        for vessel in self.monitor.settings[self.PLOT_VESSELS]:
            if vessel != target_vessel and vessel.parent == reference_body:
                plot.append(vessel)
                
        #print "Plotting the following:",plot
        
        # Then determine if we need to rotate plots
        
        if target_vessel and self.monitor.settings[self.SHIP_PROJECTION_MODE]:
               
            # Calculate rotation axis
            frame_up = array([0, 0, 1])
            
            r,v = vessel.get(self.monitor.system.UT)

            orbit_up = cross(r,v)
            
            rotation_axis = cross(orbit_up, frame_up)
            rotation_axis_u = rotation_axis / norm(rotation_axis)
            
            angle = arccos(orbit_up.dot(frame_up))

            rotation_matrix = kepler.RotationMatrix(rotation_axis_u, angle)
            
        else:
            rotation_matrix = False
            
        
        # Determine the furthest apoapsis
        # TODO: No need to recalculate this every time
        max_distance = 0
        for celestial in plot:
            if celestial == reference_body:
                max_distance = celestial.radius
            else:
                if celestial.orbit.apoapsis > celestial.parent.SoI:
                    max_distance = celestial.parent.SoI
                else:
                    if celestial.orbit.apoapsis > max_distance:
                        max_distance = celestial.orbit.apoapsis
                        #print "Max distance set for",celestial.name,celestial.orbit.apoapsis
        # Determine scale factor
        
        if self.resolution [0] < self.resolution[1]:
            max_virtual_distance = self.resolution[0] / 2.0
        else:
            max_virtual_distance = self.resolution[1] / 2.0
            
        scale_factor = max_virtual_distance / max_distance
        #print "scale factor:",scale_factor
        # Render
        # TODO solar plot requires custom radius scaling..
        if reference_body.name == "Sun":
            for celestial in plot:
                if celestial == reference_body:
                    color = self.PLOT_COLORS[celestial.name][0]
                    radius = self.PLOT_COLORS[celestial.name][1]
                    pygame.draw.circle(self, color, self.cc(0, 0), radius)
                
                elif isinstance(celestial, celestialdata.Planet):
                    color = self.PLOT_COLORS[celestial.name][0]
                    radius = self.PLOT_COLORS[celestial.name][1]
                    self.draw_celestial(celestial,color,radius, scale_factor)
                    
                elif celestial == self.TARGET_VESSEL:
                    color = pygame.Color("green")
                    radius = 1
                    self.draw_celestial(celestial,color,radius, scale_factor)
                    
                else:
                    color = pygame.Color("yellow")
                    radius = 1
                    self.draw_celestial(celestial,color,radius, scale_factor)
        else:
            for celestial in plot:
                if celestial == reference_body:
                    print "PLOTTING REF BODY"
                    color = self.PLOT_COLORS[celestial.name][0]
                    radius = int(celestial.radius * scale_factor)
                    pygame.draw.circle(self, color, self.cc(0, 0), radius)
                
                elif isinstance(celestial, celestialdata.Planet):
                    print "PLOTTING PLANET"
                    color = self.PLOT_COLORS[celestial.name][0]
                    radius = int(celestial.radius * scale_factor)
                    self.draw_celestial(celestial, color, radius, scale_factor)
                    
                elif celestial == target_vessel:
                    print "PLOTTING TARGET VESSEL"
                    color = pygame.Color("green")
                    radius = 2
                    self.draw_celestial(celestial, color, radius, scale_factor)
                    
                else:
                    print "ELSE DRAWING"
                    print celestial
                    print celestial.name
                    print self.TARGET_
                    color = pygame.Color("yellow")
                    radius = 2
                    self.draw_celestial(celestial,color,radius, scale_factor)
                  
    def draw_celestial(self,celestial,color,radius, scale_factor):
        if radius < 1:
            radius = 1
        else:
            radius = int(radius)
            
        r,v = celestial.orbit.get(self.monitor.system.UT)
        #print r[0] * scale_factor
        x = int(r[0] * scale_factor)
        y = int(r[1] * scale_factor)
    
        #print "DRAWING AT",x,y
        pygame.draw.circle(self, color, self.cc(x, y), radius)
        
        # Draw orbit from cache
        points = []
        if celestial.name in self.monitor.settings[self.ORBIT_CACHE]:
            for point in self.monitor.settings[self.ORBIT_CACHE][celestial.name]:
                points.append(self.cc(point[0]*scale_factor, point[1]*scale_factor))
        else:
            period = celestial.orbit.getPeriod()
            step = period / 40
            
            for i in xrange(40):
                point = celestial.orbit.get(i*step)[0]
                points.append(self.cc(point[0]*scale_factor, point[1]*scale_factor))
        
        pygame.draw.lines(self,color,True,points)
           
class HorizontalMenu(Canvas):
    '''
    Horizontal top menu for changing view modes and gods know what
    '''
    def __init__(self,monitor,resolution,position):
        Canvas.__init__(self,monitor,resolution,position)
        self.draw()
        
    def draw(self):
        self.fill((0,255,0))


class VerticalMenu(Canvas):
    '''
    Horizontal top menu for changing view modes and gods know what
    '''
    def __init__(self,monitor,resolution,position):
        Canvas.__init__(self,monitor,resolution,position)
        self.draw()
        
    def draw(self):
        self.fill((0,255,0))


class MainMenuLogo(Canvas):
    def __init__(self,monitor,resolution,position):
        Canvas.__init__(self,monitor,resolution,position)
        self.logofont = pygame.font.Font("unispace.ttf",56)
        self.logotext1 = self.logofont.render("KERBAL", False, [0, 255, 0])
        self.logotext2 = self.logofont.render("MISSION CONTROL", False, [0, 255, 0])
        
        self.logopos1 = [int(self.resolution[0]/2 - self.logotext1.get_width()/2), 10]
        self.logopos2 = [int(self.resolution[0]/2 - self.logotext2.get_width()/2), 60]
        
        self.draw()
        
    def draw(self):
        self.fill((0,0,0))
        self.blit(self.logotext1, self.logopos1)
        self.blit(self.logotext2, self.logopos2)
        
