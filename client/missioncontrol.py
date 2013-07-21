# -*- coding: utf-8 -*-
"""
Created on Wed Jul 10 21:52:13 2013

@author: snaipperi
"""
import pygame, sys, time, socket
import celestialdata, kepler
from numpy import array

FONT = None

class System:
    def __init__(self):
        self.network = Network(self)
        self.display = None
        self.celestials = {}
        
        f = open("celestial.txt","w")
        f.close()

    def parse(self,data):
        print "PARSE:",data
        tok = data.split('\t')
        vType = tok[0]   # Type, should be V
        if vType == "V":
            vStatus = tok[1] # Status (flying, etc.)
            vPID = tok[2]    # Unique ID
            vT = tok[3]      # Game time
            vMT = tok[4]     # Mission time
            vAcc =  tok[5]   # Acceleration magnitude
            vAlt = tok[6]    # Altitude
            vAnM = tok[7]    # Angular momentum
            vAnV = tok[8]    # Angular velocity
            vAtm = tok[9]    # Atmosphere density
            vGF  = tok[10]   # Gee force
            vGFi = tok[11]   # Geefore immediate
            vRAlt = tok[12]  # Height from surface (altitude?)
            vRAlt2 = tok[13] # Height from terrain (radar altimeter)
            vHor = tok[14]   # Horizontal surface spee d
            vLat = tok[15]   # Latitude
            vLon = tok[16]   # Longitude
            vOVel = tok[17]  # Orbital velocity
            vPQSAlt = tok[18]# PQS altitude ?
            vRBVel = tok[19] # RB velocity?
            vSPAcc = tok[20] # Specific accceleration
            vSVel = tok[21]  # Surface velocity (horizontal?)
            vSPrs = tok[22]  # Static pressure
            vTAlt = tok[23]  # Terrain altitude
            vVVel = tok[24]  # Vertical speed
            vDPrs = tok[25]  # Dynamic pressure (atm)
            vSPrs2 = tok[26] # Static pressure (atm)
            vTemp = tok[27]  # Temperature
            
            print "Status:",vStatus
            print "Velocity:",vSVel
            print "Altitude:",vAlt
            print "Pressure:",vSPrs
            print "Dynamic pressure:",vDPrs
            print "SAlt:",vRAlt
            print "TAlt:",vRAlt2
            if vStatus == "L" or vStatus == "S" or vStatus == "P" or vStatus == "F":
                vRef = tok[28]
            else:
                vRef = tok[28]
                vOEph = tok[29]
                vOSma = tok[30]
                VOEcc = tok[31]
                VOInc = tok[32]
                VOLAN = tok[33]
                VOAoP = tok[34]
                VOM0 = tok[35]
        elif vType == "C":
            print "Celestial data"
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
            
            if name == "Sun":
                self.celestials[name] = celestialdata.Sun(mu=float(mu),radius=float(radius))
            else:
                if atm == "None":
                    atm = False
                else:
                    atm = float(atm)
                rv = rv.split(':')
                trv = [0.0,array([float(rv[0]), float(rv[1]), float(rv[2])]), array([float(rv[0]), float(rv[1]), float(rv[2])])]
                self.celestials[name] = celestialdata.Planet(self.celestials[ref],name,mu=float(mu),radius=float(radius),SoI=float(SoI),trv=trv,atm=atm)
                self.display.viewPlot.draw()
            
            
            
class Button(object):
    ''' Button object for easy clickin' '''
    
    def __init__(self,shape,text,bgcolor=(0,0,0),bgactive=(0,50,0),bcolor=(0,255,0),bgclick=(0,150,0)):
        self.shape = shape
        self.text = text
        self.bgcolor = bgcolor
        self.bcolor = bcolor
        self.bgactive = bgactive
        self.bgclick = bgclick
        
    def render(self,surface,active=False,click=False):
        if active:
            bg = self.bgactive
        elif click:
            bg = self.bgclick
        else: 
            bg = self.bgcolor
        pygame.draw.rect(surface,bg,self.shape)
        pygame.draw.rect(surface,self.bcolor,self.shape,1)
        txt = FONT.render(self.text,False,self.bcolor)
        surface.blit(txt,(self.shape[0]+2,self.shape[1]+2))
        
    def click(self):
        pass
    

class Canvas(pygame.Surface):
    def __init__(self,display,resolution):
        pygame.Surface.__init__(self,resolution)
        
        self.display = display
        self.buttons = []
        self.activeButton = None
        
    def motion(self,pos):
        print "motion",self,pos
        rect = pygame.Rect(pos,(1,1))
        newActive = None
        
        for button in self.buttons:
            if button.shape.contains(rect):
                button.render(self,True)
                newActive = button
                
        if self.activeButton and self.activeButton != newActive:
            self.activeButton.render(self)
        self.activeButton = newActive
    def click(self,pos):
        print "click",self,pos
        rect = pygame.Rect(pos,(1,1))
        for button in self.buttons:
            print "Buttons",len(self.buttons)
            if button.shape.contains(rect):
                print "BUTTON CLICK"
                button.render(self,False,True)
                button.click()
                # Create a button click event so that hilight can be removed
                pygame.event.post(pygame.event.Event(pygame.USEREVENT+1,{'canvas':self}))
                
        print "Done"
    def testButton(self):
        shape = pygame.Rect(10,10,40,20)
        button = Button(shape,"Test")
        self.buttons.append(button)
        button.render(self)
        
    def defocus(self):
        print "DEFOCUS"
        if self.activeButton:
            self.activeButton.render(self)
            self.activeButton = None



class MainMenu(Canvas):
    def __init__(self,display,resolution):
        Canvas.__init__(self,display,resolution)
        self.display = display
        self.draw()
        
    def draw(self):
        self.fill((0,0,0))
        self.buttons = []
        
        if self.display.system.network.socket:
            cstr1 = FONT.render("Connected: Yes",False,(255,255,255))
        else:
            cstr1 = FONT.render("Connected: No",False,(255,255,255))
        self.blit(cstr1,(5,5))
        
        btn_connect = Button(pygame.Rect(5,25,60,20),"Connect")
        self.buttons.append(btn_connect)
        btn_connect.render(self)
        btn_connect.click = self.doConnect
        
    def doConnect(self):
        self.display.system.network.connect()
        self.draw()
        if self.display.system.network.socket:
            self.display.system.network.socket.send("FULLSYNC;")
        
        

class GroundTrack(Canvas):
    def __init__(self,display,resolution):
        Canvas.__init__(self,display,resolution)
        self.display = display
        self.resolution = resolution
        
        #self.map_kerbin = pygame.image.load("maps/kerbin.png")
        self.maps = {}
        self.maps["kerbin"] = pygame.image.load("maps/kerbin.png")
        self.map = self.maps["kerbin"]
        
        self.longitude = 180
        self.latitude  = 180
        
        #self.thetas 
    def draw(self):
        pass
    
    
class Plot(Canvas):
    def __init__(self,display,resolution):
        Canvas.__init__(self,display,resolution)
        self.display = display
        self.resolution = resolution
        
        self.draw()
    
    def cc(self,pos):
        pos[0] += int(self.resolution[0]/2.0)
        pos[1] += int(self.resolution[1]/2.0)
        return pos
        
    def draw(self):
        print "Redraw"
        self.fill([0,0,0])
        # Draw sun
        
        pygame.draw.circle(self,[255,255,0],self.cc([0,0]),3)
        
        for celestial in self.display.system.celestials.values():
            if celestial.parent == self.display.system.celestials["Sun"]:
                print "Drawing",celestial.name
                if celestial.name == "Kerbin":
                    color = [0,255,0]
                    radius = 2
                else:
                    color = [255,255,255]
                    radius = 2
                    
                rv = celestial.orbit.get(0)
                r = rv[0]
                x = int(r[0] / 5e8)
                y = int(r[1] / 5e8)

                print "DRAWING AT",x,y
                pygame.draw.circle(self,color,self.cc([x,y]),radius)
                
        
class Display:
    def __init__(self,system,width=800,height=600):
        pygame.init()
        
        self.font = pygame.font.Font("unispace.ttf",12)
        global FONT
        FONT = self.font
        
        
        self.system = system
        self.system.display = self
        
        self.basewidth = width
        self.baseheight = height
        
        self.window = pygame.display.set_mode((self.basewidth, self.baseheight),pygame.RESIZABLE)
        
        # The monitor is always 800x600, 4:3
        self.monitor = pygame.Surface((self.basewidth,self.baseheight))
        self.scaledmonitor = pygame.Surface((self.basewidth, self.baseheight))
        
        self.viewGroundTrack = Canvas(self,(800,300))
        self.viewPlot = Plot(self,(400,300))
        self.viewData = MainMenu(self,(400,300))
        
        self.focus = None
        
        self.transformWidth = self.basewidth
        self.transformHeight = self.baseheight
        self.transformCenterWidth = 0
        self.transformCenterHeight = 0
        self.lastTick = time.time()
        
        self.x = 30
        
        #self.font = pygame.font.match_font("consolas")
        #self.font = pygame.font.Font(self.font,12)
        
        
        self.map_kerbin = pygame.image.load("maps/kerbin.png")
        self.viewGroundTrack.blit(self.map_kerbin,(0,0))
        
        self.render_data()
        
        
    
    def recalculate_transforms(self):
        ''' Calculates window stretching to maintain aspect ratio '''
        sw = float(self.window.get_width())
        sh = float(self.window.get_height())
        
        if sw/sh >= 1.333333333:
            self.transformHeight = int(sh)
            self.transformWidth = int(640 * (sh / 480.0))
        else:
            self.transformWidth = int(sw)
            self.transformHeight = int(480 * (sw / 640))
        
        self.transformCenterWidth = int((sw-self.transformWidth)/2)
        self.transformCenterHeight = int((sh-self.transformHeight)/2)
            
    def render_groundTrack(self):
        self.viewGroundTrack.fill((0,0,0))
        self.viewGroundTrack.blit(self.map_kerbin,(0,0))
        
    def render_data(self):
        #self.viewData.fill((0,0,0))
        pass
        
        #self.viewData.blit(cstr1,(0,0))
        #self.viewData.testButton()
        
        
    def getRpos(self,pos):
        ''' Get relative position in the 800x600 window '''
        print pos
        x = int((pos[0] - self.transformCenterWidth) / float(self.window.get_width()) * 800)
        y = int((pos[1] - self.transformCenterHeight)/ float(self.window.get_height()) * 600)
        print (x,y)
        return (x,y)
        
    def getCanvas(self,rpos):
        x,y = rpos
        if x < 400 and y < 300:
            return (self.viewPlot,(x,y))
        elif x >= 400 and y < 300:
            return (self.viewData,(x-400,y))
        else:
            return (self.viewGroundTrack,(x,y-300))
        
        
    def mainloop(self):
        ''' Mainloop. Attempts to stay at 20fps '''
        
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
                
                
                elif event.type in (pygame.QUIT, pygame.KEYDOWN):
                    sys.exit()
                    
                # Button click hilight event (used to dehilight)
                elif event.type == pygame.USEREVENT+1:
                    if event.canvas.activeButton:
                        event.canvas.activeButton.render(event.canvas,True)
                    
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
            
            self.window.blit(self.scaledmonitor,(self.transformCenterWidth,self.transformCenterHeight))
            
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
        
    def connect(self):
        self.socket = socket.socket()
        try:
            self.socket.connect(("192.168.1.13",11211))
        except socket.error:
            self.socket = None
            
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