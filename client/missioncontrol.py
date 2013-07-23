# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
"""
import pygame, sys, time, socket
import celestialdata, kepler, views
from numpy import array, degrees

FONT = None

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
        
        f = open("celestial.txt","w")
        f.close()

    def parse(self,data):
        ''' Parse incoming TCP data '''

        tok = data.split('\t')
        oType = tok[0] # Object type
        
        # Object type (V)essel
        if oType == "V":
            vStatus = tok[1] # Status (flying, etc.)
            vPID = tok[2]    # Unique ID
            vT = tok[3]      # Game time
            self.UT = float(vT)
            
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
            
            # Parse position and velocity
            rv = vRV.split(':')
            trv = [0.0,array([float(rv[0]), float(rv[1]), float(rv[2])]), array([float(rv[3]), float(rv[4]), float(rv[5])])]
            
            # TODO: Stash the vessel for now, load it after Eeloo has been received
            self.temp.append((vPID,trv))
            
        
        # Object type (C)elestial body
        elif oType == "C":

            # DEBUG: saving celestial stuff into a text file
            f = open("celestial.txt","a")
            f.write(data + "\n")
            f.close()
            
            name = tok[1]
            ref = tok[2]
            rv = tok[3]
            mu = tok[4]
            radius = tok[5]
            SoI = tok[6]
            atm = tok[7]
            
            # Sun is a special case, since it doesn't have coordinates. CENTER OF THE UNIVERSE!
            if name == "Sun":
                self.celestials[name] = celestialdata.Sun(mu=float(mu),radius=float(radius))
            else:
                if atm == "None":
                    atm = False
                else:
                    atm = float(atm)
                    
                # Parse orbit and generate it
                rv = rv.split(':')
                trv = [0.0,array([float(rv[0]), float(rv[1]), float(rv[2])]), array([float(rv[3]), float(rv[4]), float(rv[5])])]
                self.celestials[name] = celestialdata.Planet(self.celestials[ref],name,mu=float(mu),radius=float(radius),SoI=float(SoI),trv=trv,atm=atm)
                
                # Eeloo is the last planet, so render the viewplot
                if name == "Eeloo":
                    self.display.viewPlot.draw()
            
            # TODO unstash test ships
            if name == "Kerbin":
                for vessel in self.temp:
                    self.vessels[vessel[0]] = celestialdata.Vessel(self.celestials["Kerbin"],vessel[0],trv=vessel[1])
                self.display.viewGroundTrack.draw()
            
            
            

class Display:
    ''' The display class handles events, window resizing and maintains correct aspect ratio '''
    def __init__(self,system,width=800,height=600):
        pygame.init()
        
        self.font = pygame.font.Font("unispace.ttf",12)
        views.FONT = self.font
        global FONT
        FONT = self.font
        
        
        self.system = system
        self.system.display = self
        
        self.basewidth = width
        self.baseheight = height
        
        self.window = pygame.display.set_mode((self.basewidth, self.baseheight),pygame.RESIZABLE)
        
        # The monitor is always 800x600, 4:3. Consider it a virtual monitor.
        self.monitor = pygame.Surface((self.basewidth,self.baseheight))
        self.scaledmonitor = pygame.Surface((self.basewidth, self.baseheight))
        
        self.viewGroundTrack = views.GroundTrack(self,(800,300))
        self.viewPlot = views.Plot(self,(400,300))
        self.viewData = views.MainMenu(self,(400,300))
        
        self.focus = None
        
        
        self.transformWidth = self.basewidth
        self.transformHeight = self.baseheight
        self.transformBlankWidth = 0
        self.transformBlankHeight = 0
        self.lastTick = time.time()
        
        self.x = 30
        
        self.icon = pygame.image.load("icon.png")
        pygame.display.set_icon(self.icon)
        pygame.display.set_caption("KSP Mission Control")
        
        self.map_kerbin = pygame.image.load("maps/kerbin.png")
        self.viewGroundTrack.blit(self.map_kerbin,(0,0))
        
        
        
    
    def recalculate_transforms(self):
        ''' Calculates window stretching to maintain aspect ratio '''
        sw = float(self.window.get_width())
        sh = float(self.window.get_height())
        
        # 4:3 aspect ratio
        if sw/sh >= 1.333333333:
            self.transformHeight = int(sh)
            self.transformWidth = int(800.0 * (sh / 600.0))
        else:
            self.transformWidth = int(sw)
            self.transformHeight = int(600.0 * (sw / 800.0))
        
        self.transformBlankWidth  = int((sw-self.transformWidth)/2)
        self.transformBlankHeight = int((sh-self.transformHeight)/2)
    
        
    def getRpos(self,pos):
        ''' Get relative position in the 800x600 window '''
        print(pos)    
        x = int((pos[0] - self.transformBlankWidth) / float(self.transformWidth) * 800)
        y = int((pos[1] - self.transformBlankHeight)/ float(self.transformHeight) * 600)
        print ((x,y))
        return (x,y)
        
    def getCanvas(self,rpos):
        ''' Find out which canavas is under the relative position
        If you want to make a custom layout, you probably want to edit here
        
        TODO: Make this more flexible for easy theming
        '''
        x,y = rpos
        if x < 400 and y < 300:
            return (self.viewPlot,(x,y))
        elif x >= 400 and y < 300:
            return (self.viewData,(x-400,y))
        else:
            return (self.viewGroundTrack,(x,y-300))
        
        
    def mainloop(self):
        ''' 
        Mainloop. Attempts to stay at 20fps 
        
        Probably it doesn't.
        '''
        
        while True:
            self.monitor.fill((255,255,255))

            self.monitor.blit(self.viewPlot,(0,0))
            self.monitor.blit(self.viewData,(400,0))
            self.monitor.blit(self.viewGroundTrack,(0,300))
            
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
                    self.recalculate_transforms()
                    self.scaledmonitor = pygame.Surface((self.transformWidth,self.transformHeight))                
                
                
                
                    
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
            for canvas in [self.viewGroundTrack,self.viewPlot,self.viewData]:
                if canvas.focusElement:
                    canvas.focusElement.tick()
            
            
            for event in postprocess_motion:
                canvas,rpos = self.getCanvas(self.getRpos(event.pos))
                canvas.motion(rpos)
                
                # Defocus old canvas
                if canvas != self.focus:
                    if self.focus:
                        self.focus.defocus()
                    self.focus = canvas
                    
            for event in postprocess_clicks:
                if event.type == pygame.MOUSEBUTTONDOWN:
                    canvas,rpos = self.getCanvas(self.getRpos(event.pos))
                    canvas.click(rpos)
                    
                    
            self.system.network.recv()
            
            self.window.fill((0,0,0))
            pygame.transform.scale(self.monitor,(self.transformWidth,self.transformHeight),self.scaledmonitor)
            
            self.window.blit(self.scaledmonitor,(self.transformBlankWidth,self.transformBlankHeight))
            
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