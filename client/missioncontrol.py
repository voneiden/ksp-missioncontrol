# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
"""

import celestialdata
import elements
import json
import kepler
import logging
import monitor
import pygame
import socket
import sys
import time
import views

from numpy import array, degrees, radians, cos, sin, dot
from numpy.linalg import norm

FONT = None

#soh = logging.StreamHandler(sys.stdout)
#soh.setLevel(logging.DEBUG)
logger = logging.getLogger()
#logger.addHandler(soh)
logger.setLevel(logging.INFO)
print("TESTING")
class System(object):
    ''' 
    Core class

    Links together the network, display and available KSP data
    '''
    def __init__(self):
        self.network = Network(self)
        self.display = None
        self.celestials = {}
        self.vessels = {}
        self.UT = 0
        self.temp = []
        self.active_vessel = None
        self.frame_rotating = 0
        self.frame_rotation = 0
        
        self.celestial_data = [] # Used for saving fresh celestial data updates
        
        #['c8b4cfeb-d7e8-4364-805f-703470710b3a', 'add4a8ae-187c-4ed6-b263-8a5353366ffe', 'db99cf0d-5436-47f2-9183-1a860e08beb3', '91fd5018-61a9-4c68-a1b2-0dda247c5c61']
        try:
            f = open("celestials.txt","r")
        
        except IOError:
            print "Unable to load celestials"
        
        else:
            for line in f.readlines():
                self.parse(line.strip())
                f.close()
        
        
    # TODO: parse should be moved to the network class
    def parse(self,data):
        ''' 
        Parse incoming TCP data
        The data should consist of a single valid json string'''
        # TODO: tempfix
        
        if data == "SYNCOK":
            f = open("celestials.txt",'w')
            f.write("\n".join(self.celestial_data))
            f.close()
            return
            
        try:
            msg = json.loads(data, parse_int=float)
        except ValueError:
            print "Parser failed to read data: No JSON object could be decoded"
            print data
            return

        try:
            t = msg["type"]
        except KeyError:
            print "Parser failed to parse data: JSON object lacks packet type"
            return
            
        
        
        
        # Planetarium data
        if t == "update":
            self.UT = msg["ut"] # Universal time
            self.frame_rotating = msg["rotating"] # Is frame rotating at the moment? 
            self.frame_rotation = radians(msg["frame_angle"]) # Current frame rotation
        
        # Object type (V)essel
        elif t == "vessel":
            uid = msg["uid"]
            ref = msg["ref"]
            name = msg["name"]
            state = msg["state"]
            ut = msg["ut"]
            rv = msg["rv"]
            r = array(rv[0:3])
            v = array(rv[3:6])

            trv = [ut, r, v]

            
                        
            print "Vessel data received"
            
            print "Adjusting frame rotation"
            trv[1] = self.RotateZ(trv[1], -self.frame_rotation)
            trv[2] = self.RotateZ(trv[2], -self.frame_rotation)
                    
            if uid in self.vessels:
                vessel = self.vessels[uid]
                vessel.update(state=state, trv=trv)
                self.active_vessel = vessel #TODO: This could be done better
                
            else:
                vessel = celestialdata.Vessel(self,self.celestials["Kerbin"], uid, name, state=state, trv=trv)
                self.vessels[uid] = vessel
            
            
            vessel.altimeter = msg["alt"]
            vessel.altitude_terrain = msg["alt_ter"]
            vessel.altitude_surface = msg["alt_srf"]
            vessel.mission_time = msg["mt"]
            vessel.geeforce            = msg["geeforce"]
            vessel.orbital_velocity    = msg["obt_v"]
            vessel.surface_velocity    = msg["srf_v"]
            vessel.vertical_velocity   = msg["vrt_v"]
            
            if self.active_vessel and self.display:
                self.display.monitor.settings["plotter_target_vessel"] = self.active_vessel
                self.display.monitor.settings["plotter_reference_body"] = self.active_vessel.parent
                
                #self.display.monitor.viewGroundTrack.draw()
                #self.display.monitor.viewPlot.draw()
                #self.display.monitor.viewData.draw()
            
        
        # Object type (C)elestial body
        elif t == "celestial":

            # DEBUG: saving celestial stuff into a text file
            
            
            name = msg["name"]
            ref = msg["ref"]
            if "rv" in msg:
                rv = msg["rv"]
                
            else:
                rv = None
                
            mu = msg["mu"]
            radius = msg["radius"]
            SoI = msg["soi"]
            atm = msg["alt_atm"]
            
            angular_velocity = msg["ang_v"]
            initial_rotation = msg["initial_rotation"]
            rot_angle = msg["rotation_angle"]
            
            rotation = [angular_velocity,initial_rotation]
            print "Parsing celestial"
            print "name:",name
            print "vang1",angular_velocity
            print "initr",initial_rotation
            print "rotation angle:",rot_angle
            print "SOI",SoI
            print "mU",type(mu)
            # Sun is a special case, since it doesn't have coordinates. CENTER OF THE UNIVERSE!
            if name == "Sun":
                self.celestials[name] = celestialdata.Sun(self,mu=float(mu),radius=float(radius),SoI=SoI)
                self.celestial_data = []    
            else:
                if atm == "None":
                    atm = False
                else:
                    atm = float(atm)
                
                r = array(rv[0:3]) # Position
                v = array(rv[3:6]) # Velocity
            
                trv = [0.0, r, v]
                print "Init with trv",trv
                self.celestials[name] = celestialdata.Planet(self,self.celestials[ref],name,mu=mu,radius=radius,SoI=SoI,trv=trv,atm=atm, rotation=rotation)
                
            self.celestial_data.append(data)
                
            
    def RotateZ(self,vector,angle):
        ''' For debugging purposes '''
        rot_matrix = array([[cos(angle), sin(angle), 0], [-sin(angle), cos(angle), 0], [0, 0, 1]])
        return dot(vector,rot_matrix)

class Display:
    ''' The display class handles events, window resizing and maintains correct aspect ratio '''
    def __init__(self,system):
        
        pygame.init()
        
        self.system = system
        self.system.display = self
        
        self.font = pygame.font.Font("unispace.ttf",12)
        views.FONT = self.font
        elements.FONT = self.font
        
        global FONT
        FONT = self.font
        
        display_info = pygame.display.Info()
        aspect = round(float(display_info.current_w) / float(display_info.current_h),2)
        print "Resolution",display_info.current_w,display_info.current_h
        print "Current aspect ratio",aspect
            
        # Support for 16:9 monitors
        if aspect == 1.78:
            self.window = pygame.display.set_mode((1280,720),
                                              pygame.RESIZABLE)
            self.monitor = monitor.Monitor169(self)
            
            
        # Support for 16:10 monitors
        elif aspect == 1.6:
            self.window = pygame.display.set_mode((1280,800),
                                              pygame.RESIZABLE)
            self.monitor = monitor.Monitor1610(self)
            
        # Default to 4:3
        else:
            self.window = pygame.display.set_mode((1024,768),
                                              pygame.RESIZABLE)
            self.monitor = monitor.Monitor43(self)

        self.focus = None
        
        self.lastTick = time.time()
        
        self.x = 30
        
        self.icon = pygame.image.load("icon.png")
        pygame.display.set_icon(self.icon)
        pygame.display.set_caption("KSP Mission Control")
        
        #self.map_kerbin = pygame.image.load("maps/kerbin.png")
        #self.viewGroundTrack.blit(self.map_kerbin,(0,0))
        
    def mainloop(self):
        ''' 
        Mainloop. Attempts to stay at 20fps 
        
        Probably it doesn't.
        '''
        self.ticker = 0
        
        while True:
            self.monitor.fill()
            
            # Event categories that should be post-processed
            postprocess_clicks = []
            postprocess_motion = []
            
            
            for event in pygame.event.get():
                
                if event.type == pygame.MOUSEMOTION:
                    postprocess_motion.append(event)
                    
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    postprocess_clicks.append(event)
                
                # In case of window resize, check for the best aspect ratio
                elif event.type == pygame.VIDEORESIZE:
                    self.window = pygame.display.set_mode(event.size, pygame.RESIZABLE)
                    
                    aspect = round(float(event.size[0]) / float(event.size[1]),2)
                    dasp43   = abs(aspect - 1.33)
                    dasp169  = abs(aspect - 1.78)
                    dasp1610 = abs(aspect - 1.6)
                    
                    choices = {dasp43:monitor.Monitor43, dasp169:monitor.Monitor169, dasp1610:monitor.Monitor1610}
                    keys = choices.keys()
                    keys.sort()
                    best_monitor = choices[keys[0]]
                    
                    print "Best monitor aspect res",event.size,":",keys[0],best_monitor
                    
                    # If optimum is not current monitor aspect ratio, change it
                    if not isinstance(self.monitor,best_monitor):
                        settings = self.monitor.settings # Backup settings
                        self.monitor = best_monitor(self)# Initialize new monitor
                        self.monitor.settings = settings # Restore settings
                        self.monitor.setupViews()        # setup the default views
                        self.monitor.transform()         # calculate new transforms
                    
                    else:                    
                        self.monitor.transform()
                    
                elif event.type == pygame.KEYDOWN:
                    if self.focus.focusElement:
                        self.focus.focusElement.keydown(event)
                
                elif event.type == pygame.KEYUP:
                    if self.focus.focusElement:
                        self.focus.focusElement.keyup(event)
                        
                # Button click hilight event (used to dehilight) OBSOLETE
                #elif event.type == pygame.USEREVENT+1:
                #    event.button.defocus()
                elif event.type == pygame.QUIT:
                    sys.exit()
            # TODO, more flexilibty for custom canvas layout
            for view in self.monitor.scenes[self.monitor.settings["monitor_scene"]]:
                if view.focusElement:
                    view.focusElement.tick()
            
            
            for event in postprocess_motion:
                #TODO localize this
                view = self.monitor.getView(self.monitor.getRelativePosition(event.pos))
                if view:
                    view[0].motion(view[1])
                
                # Defocus old canvas
                    if view[0] != self.focus:
                        if self.focus:
                            self.focus.defocus()
                        self.focus = view[0]
                    
            for event in postprocess_clicks:
                if event.type == pygame.MOUSEBUTTONDOWN:
                    # TODO localize this
                    view = self.monitor.getView(self.monitor.getRelativePosition(event.pos))
                    if view:
                        view[0].click(view[1])
                    
            scene = self.monitor.settings["monitor_scene"]
            
            if self.system.network.socket:
                if scene == "mainmenu":
                    self.monitor.settings["monitor_scene"] = "overview"
                    
                self.system.network.recv()
                
                if not self.ticker % self.monitor.settings["update_ticks"]:
                    if scene == "overview":
                        self.monitor.viewGroundTrack.draw()
                        self.monitor.viewPlotter.draw()
                        self.monitor.viewData.draw()
                    
            else:
                self.system.UT += 100000
                self.monitor.view_mm_plotter.draw()
            
            self.window.fill((255,0,0))

            pygame.transform.scale(self.monitor.virtualSurface,
                                   (self.monitor.transformWidth,self.monitor.transformHeight),
                                   self.monitor.scaledSurface)
            
            self.window.blit(self.monitor.scaledSurface, (self.monitor.transformBlankWidth, self.monitor.transformBlankHeight))
            
            pygame.display.flip()
            
            
            newtick = time.time() 
            sleep = 0.05-(newtick-self.lastTick)
            #print "SLeep",sleep
            if sleep>0:    
                time.sleep(sleep)
            else:
                print "Warning: lagging"
            self.lastTick = time.time()
            self.ticker += 1
    
class Network:
    def __init__(self,system):
        self.socket = None
        self.buffer = ''
        self.system = system
        
    def connect(self,ip):
        # TODO: IP should include port
        if self.socket:
            self.socket.close()
            
        print "Connecting to",ip
        self.socket = socket.socket()
        try:
            self.socket.connect((ip,11211))
        except socket.error:
            self.socket = None
        print "Done"
            
    def recv(self):
        if self.socket:
            self.socket.setblocking(False)
            while True:
                try:
                    buf = self.socket.recv(1024)
                except socket.error:
                    break
                
                if len(buf) == 0:
                    break
                else:
                    tok  = (self.buffer + buf).split('\n')
                    self.buffer = ''
                    if len(tok) == 1:
                        self.buffer = tok[0]
                        continue
                    else:
                        if len(tok[-1]) != 0:
                            self.buffer = tok.pop()
                        else:
                            tok.pop()
                    for t in tok:
                        self.system.parse(t)

            self.socket.setblocking(True)

                
                
        
if __name__ == '__main__':
    s = System()
    d = Display(s)
    d.mainloop()