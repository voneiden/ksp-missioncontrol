# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
"""
import pygame, sys, time, socket, logging
import celestialdata, kepler, views, monitor
from numpy import array, degrees, radians, cos, sin, dot

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
        self.frame_rotating = None
        self.frame_rotation = None
        
        
        #['c8b4cfeb-d7e8-4364-805f-703470710b3a', 'add4a8ae-187c-4ed6-b263-8a5353366ffe', 'db99cf0d-5436-47f2-9183-1a860e08beb3', '91fd5018-61a9-4c68-a1b2-0dda247c5c61']
        f = open("celestial.txt","w")
        f.close()

    def parse(self,data):
        ''' Parse incoming TCP data '''

        tok = data.split('\t')
        header = tok[0] # Object type
        
        # Planetarium data
        if header == "P":
            self.UT = float(tok[1]) # Universal time
            self.frame_rotating = int(tok[2]) # Is frame rotating at the moment? 
            self.frame_rotation = radians(float(tok[3])) # Current frame rotation
        
        # Object type (V)essel
        elif header == "V":
            vessel_state   = tok[1] # Status (flying, etc.)
            vessel_PID     = tok[2] # Unique ID
            universal_time = tok[3] # Game time
            reference_body = tok[4] # Reference body (what body is vessel orbiting?)
            longitude      = tok[5]
            latitude       = tok[6]
            vessel_rv      = tok[7]
            
            self.UT = float(universal_time)
            """
            vRV = tok[4]
            vMT = tok[5]     # Mission time
            vAcc =  tok[6]   # Acceleration magnitude
            vAlt = tok[7]    # Altitude
            vAnM = tok[8]    # Angular momentum
            vAnV = tok[9]    # Angular velocity
            vAtm = tok[10]    # Atmosphere density
            vGF  = tok[11]   # Gee force
            vGFi = tok[12]   # Geefore immediate
            vRAlt = tok[13]  # Height from surface (altitude?)
            vRAlt2 = tok[14] # Height from terrain (radar altimeter)
            vHor = tok[15]   # Horizontal surface spee d
            vLat = tok[16]   # Latitude
            vLon = tok[17]   # Longitude
            
            logging.info("vlat: %s"%str(vLat))
            logging.info("vlon: %s"%str(vLon))
            
            vOVel = tok[18]  # Orbital velocity
            vPQSAlt = tok[19]# PQS altitude ?
            vRBVel = tok[20] # RB velocity?
            vSPAcc = tok[21] # Specific accceleration
            vSVel = tok[22]  # Surface velocity (horizontal?)
            vSPrs = tok[23]  # Static pressure
            vTAlt = tok[24]  # Terrain altitude
            vVVel = tok[25]  # Vertical speed
            vDPrs = tok[26]  # Dynamic pressure (atm)
            vSPrs2 = tok[27] # Static pressure (atm)
            vTemp = tok[28]  # Temperature
            
            # If ship status (L)anded, (S)plashed, (P)relaunch or (F)lying
            if vStatus == "L" or vStatus == "S" or vStatus == "P" or vStatus == "F":
                vRef = tok[29]
                
            # Else (O)rbital, (S-)ub(-O)rbital or (E)scaping
            else:
                vRef = tok[29]
                vOEph = tok[30]
                vOSma = tok[31]
                VOEcc = tok[32]
                VOInc = tok[33]
                VOLAN = tok[34]
                VOAoP = tok[35]
                VOM0 = tok[36]
            """
            # Parse position and velocity if we are sub-orbital or orbital
            # TODO: What about docked ships?
            if vessel_state == "SO" or vessel_state == "O" or True:
                rv = vessel_rv.split(':') 
                print "vessel position update",rv
                trv = [float(self.UT), array([float(rv[0]), float(rv[1]), float(rv[2])]), array([float(rv[3]), float(rv[4]), float(rv[5])])]
                if vessel_PID in self.vessels:
                    
                    # TEMP: debugging..
                    #self.vessels[vPID].lon = vLon
                    #self.vessels[vPID].lat = vLat
                    r = trv[1]
                    print "Frame rotation: ",degrees(self.frame_rotation)
                    print "R1: ",r
                    r2 = self.RotateZ(r,self.frame_rotation)
                    print "R2: ",r2
                    pr = self.celestials["Kerbin"].angular_velocity * (self.UT) # + self.celestials["Kerbin"].planet_rotation_adjustment 
                    print "Planet rotation: ",degrees(pr)
                    r3 = self.RotateZ(r,pr)
                    print "R3: ",r3
                    
                    
                    self.vessels[vessel_PID].update(state=vessel_state, trv=trv)
                    
                    
                    
                    self.celestials["Kerbin"].planet_rotation_adjustment = 0
                    rasc,dec,below_radius = self.vessels[vessel_PID].orbit.getGround(self.UT)
                    
                    print "Game lon:",longitude
                    print "Sim  lon:",rasc
                    print "Diff 360:",float(longitude)%360 - rasc%360
                    print "Diff",abs((float(longitude)-rasc))
                    
                    self.celestials["Kerbin"].planet_rotation_adjustment = radians((float(longitude) - rasc)%360)
                    
                    if self.celestials["Kerbin"].tmp_debug:
                        print "Change:",degrees(self.celestials["Kerbin"].planet_rotation_adjustment - self.celestials["Kerbin"].tmp_debug),self.celestials["Kerbin"].planet_rotation_adjustment - self.celestials["Kerbin"].tmp_debug
                    self.celestials["Kerbin"].tmp_debug = self.celestials["Kerbin"].planet_rotation_adjustment
                    
                    print "ADJUSTMENT:",self.celestials["Kerbin"].planet_rotation_adjustment,degrees(self.celestials["Kerbin"].planet_rotation_adjustment)
                    
                    self.active_vessel = self.vessels[vessel_PID]
                else:
                    self.vessels[vessel_PID] = celestialdata.Vessel(self,self.celestials["Kerbin"], vessel_PID, state=vessel_state, trv=trv)
                    
            else:
                coordinates=(float(longitude),float(latitude))
                print "coordinates:",coordinates
                if vessel_PID in self.vessels:
                    self.vessels[vessel_PID].update(state=vessel_state, coordinates=coordinates)
                    self.active_vessel = self.vessels[vessel_PID]
                else:
                    self.vessels[vessel_PID] = celestialdata.Vessel(self,self.celestials["Kerbin"], vessel_PID, state=vessel_state, coordinates=coordinates)
            
            self.display.monitor.viewGroundTrack.draw()
            # TODO: Stash the vessel for now, load it after Eeloo has been received
            #self.temp.append((vPID,trv))
            
        
        # Object type (C)elestial body
        elif header == "C":

            # DEBUG: saving celestial stuff into a text file
            f = open("celestial.txt","a")
            f.write(data + "\n")
            f.close()
            
            name = tok[1]
            ref = tok[2]
            rv = tok[3]
            mu = float(tok[4])
            radius = float(tok[5])
            SoI = float(tok[6])
            atm = tok[7]
            
            angular_velocity = float(tok[8])
            initial_rotation = float(tok[9])
            rot_angle = tok[10]
            
            rotation = [angular_velocity,initial_rotation]
            print "name:",name
            print "vang1",angular_velocity
            print "initr",initial_rotation
            print "rotation angle:",rot_angle
            # Sun is a special case, since it doesn't have coordinates. CENTER OF THE UNIVERSE!
            if name == "Sun":
                self.celestials[name] = celestialdata.Sun(self,mu=float(mu),radius=float(radius))
            else:
                if atm == "None":
                    atm = False
                else:
                    atm = float(atm)
                    
                # Parse orbit and generate it
                rv = rv.split(':')
                trv = [0.0,array([float(rv[0]), float(rv[1]), float(rv[2])]), array([float(rv[3]), float(rv[4]), float(rv[5])])]
                self.celestials[name] = celestialdata.Planet(self,self.celestials[ref],name,mu=mu,radius=radius,SoI=SoI,trv=trv,atm=atm, rotation=rotation)
                
                # Eeloo is the last planet, so render the viewplot
                if name == "Eeloo":
                    self.display.monitor.viewPlot.draw()
 
        # Active vessel information
        elif header == "AV":
            if tok[1] in self.vessels:
                self.active_vessel = self.vessels[tok[1]]
            else:
                logging.error("Active vessel suggested by server was not found in local vessel list")
            
    def RotateZ(self,vector,angle):
        ''' For debugging purposes '''
        rot_matrix = array([[cos(angle), sin(angle), 0], [-sin(angle), cos(angle), 0], [0, 0, 1]])
        return dot(vector,rot_matrix)

class Display:
    ''' The display class handles events, window resizing and maintains correct aspect ratio '''
    def __init__(self,system,width=1024,height=768):
        pygame.init()
        
        self.system = system
        self.system.display = self
        
        self.font = pygame.font.Font("unispace.ttf",12)
        views.FONT = self.font
        global FONT
        FONT = self.font
        
        self.window = None
        
        info = pygame.display.Info()
        aspect = round(float(info.current_w) / float(info.current_h),2)
        print "Current aspect ratio",aspect
        if aspect == 1.33:
            self.monitor = monitor.Monitor43(self)
            
        # Support for 16:9 monitors
        #elif aspect == 1.78:
        #    self.monitor = monitor.Monitor169(self)
            
            
        # Support for 16:10 monitors
        #elif aspect == 1.6:
        #    self.monitor = monitor.Monitor1610(self)
            
        # Default to 4:3
        else:
            self.monitor = monitor.Monitor43(self)
            
        
        

        
       
        # The monitor is always 800x600, 4:3. Consider it a virtual monitor.
        # 1.12 monitor has been updated to 1024x768 4:3, or other widescreen formats
        
        '''
        self.monitor = pygame.Surface((self.basewidth,self.baseheight))
        self.scaledmonitor = pygame.Surface((self.basewidth, self.baseheight))
        
        self.viewGroundTrack = views.GroundTrack(self,(800,300))
        self.viewPlot = views.Plot(self,(400,300))
        self.viewData = views.MainMenu(self,(400,300))
        '''
        
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
                
                # In case of window resize, calculate new window requirements to maintain 4:3 aspect ratio
                elif event.type == pygame.VIDEORESIZE:
                    self.window = pygame.display.set_mode(event.size, pygame.RESIZABLE)
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
            for view in self.monitor.views['overview']:
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
                    
                    
            self.system.network.recv()
            
            self.window.fill((255,0,0))

            pygame.transform.scale(self.monitor.virtualSurface,
                                   (self.monitor.transformWidth,self.monitor.transformHeight),
                                   self.monitor.scaledSurface)
            
            self.window.blit(self.monitor.scaledSurface, (self.monitor.transformBlankWidth, self.monitor.transformBlankHeight))
            
            pygame.display.flip()
            #print self.window.get_size()
            
            newtick = time.time() 
            sleep = 0.05-(newtick-self.lastTick)
            #print "fps:",1/(newtick-self.lastTick)
            if sleep>0:    
                time.sleep(sleep)
            else:
                print "Warning: lagging"
            self.lastTick = time.time()
    
class Network:
    def __init__(self,system):
        self.socket = None
        self.buffer = ''
        self.system = system
        
    def connect(self,ip):
        # TODO: IP should include port
        
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
                    tok  = (self.buffer + buf).split(';')
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