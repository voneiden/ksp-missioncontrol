# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
"""
import pygame, logging

FONT = None
class Element(object):
    def __init__(self,surface,shape,text,cText=(0,255,0),cBackground=(0,0,0),cHilight=(0,50,0),cFocus=(0,150,0)):
        self.surface = surface     
        self.shape = shape
        self.text = text
        
        # Define colors
        self.cText = cText
        self.cBackground = cBackground        
        self.cHilight = cHilight
        self.cFocus = cFocus
        
        # Ticker is used to count frames when under focus. Do stuff
        # like automatic defocus or animation or.. you know.
        self.ticker = 0
        
        self.bHilight = False
        self.bFocus = False
        self.render()
        
    def render(self):
        """ Override """
        if self.bFocus:
            bg = self.cFocus
        elif self.bHilight:
            bg = self.cHilight
        else:
            bg = self.cBackground
            
        pygame.draw.rect(self.surface,bg,self.shape)
        pygame.draw.rect(self.surface,self.cText,self.shape,1)
        txt = FONT.render(self.text,False,self.cText)
        self.surface.blit(txt,(self.shape[0]+2,self.shape[1]+2))
        
    def click(self):
        """ Override """
        pass
    
    def keydown(self,event):
        """ Override """
        pass
    
    def keyup(self,event):
        """ Override """
        pass
    
    def active(self):
        """ Override """
        pass
    
    def focus(self):
        """ Override """
        self.bFocus = True
        print "Focused"
        self.render()
    
    def defocus(self):
        """ Override """
        self.bFocus = False
        self.surface.focusElement = None
        print "Defocused"
        self.render()
    
    def hilight(self):
        """ Override """
        self.bHilight = True
        self.render()
    
    def dehilight(self):
        """ Override """
        self.bHilight = False
        self.render()
        
    def tick(self):
        pass
    

class Button(Element):
    ''' Button object for easy clickin' '''
    
    def __init__(self,surface,shape,text,cText=(0,255,0),cBackground=(0,0,0),cActive=(0,50,0),cClick=(0,150,0)):
        Element.__init__(self,surface,shape,text,cText,cBackground,cActive,cClick)
        
    def click(self):
        pass
    
    def tick(self):
        self.ticker += 1
        print "Ticking",self.ticker,self.bFocus
        if self.ticker >= 3:
            self.defocus()
            self.surface.focusElement = None
            self.ticker = 0
            
class Input(Element):
    ''' Input object for typing stuff? '''
    
    def __init__(self,surface,shape,text,cBackground=(0,0,0),cActive=(0,50,0),cText=(0,255,0),cClick=(0,150,0)):
        self.cursor = False
        self.key = None
        self.keyTicker = 0
        
        Element.__init__(self,surface,shape,text,cText,cBackground,cActive,cClick)
        
    def defocus(self):
        self.cursor = None
        self.key = None
        Element.defocus(self)
        
    def render(self):        
        if self.bFocus:
            bg = self.cFocus
        elif self.bHilight:
            bg = self.cHilight
        else:
            bg = self.cBackground
            
        pygame.draw.rect(self.surface,bg,self.shape)
        pygame.draw.rect(self.surface,self.cText,self.shape,1)
        
        if self.cursor:
            s = self.text + '_'
        else:
            s = self.text
            
        txt = FONT.render(s,False,self.cText)
        self.surface.blit(txt,(self.shape[0]+2,self.shape[1]+2))    
    
    def tick(self):
        self.ticker += 1
        self.ticker %= 10
        if self.ticker < 5:
            if self.cursor == False:
                self.cursor = True
                self.render()
        else:
            if self.cursor == True:
                self.cursor = False
                self.render()
    
        if self.key:
            self.keyTicker += 1
            if self.keyTicker > 10:
                if not self.keyTicker % 3:
                    self.keyInput()
                    
    def keydown(self,event):
        if event.key == 8 or event.key == 13 or 32 <= event.key <= 128:
            print "Keydown",event.key,chr(event.key)
            self.key = event.key 
            self.keyTicker = 0
            self.keyInput()
        
    def keyup(self,event):
        if event.key == 8 or event.key == 13 or 32 <= event.key <= 128:
            print "Keyup",event.key,chr(event.key)
            if event.key == self.key:
                self.key = None
            
            
    def keyInput(self):
        if self.key == pygame.K_BACKSPACE:
            self.text = self.text[:-1]
        elif self.key == pygame.K_RETURN:
            self.defocus()
        else:
            self.text += chr(self.key)
            
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
        
        self.inp_ip = Input(self,pygame.Rect(70,25,100,20),"192.168.1.13")
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
        print "DRAW",vessel
        if vessel:
            print "or",vessel.orbit
        
        
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

class Plot(Canvas):
    def __init__(self, monitor, resolution, position):
        Canvas.__init__(self, monitor, resolution, position)
        
        self.draw()
    
    def cc(self,pos):
        pos[0] += self.resolution[0]/2.0
        pos[1] += self.resolution[1]/2.0
        return [int(pos[0]),int(pos[1])]
        
    def draw(self):
        print "Redraw"
        self.fill([0,0,0])
        # Draw sun
        
        pygame.draw.circle(self,[255,255,0],self.cc([0,0]),4)
        
        for celestial in self.monitor.system.celestials.values():
            if celestial.parent == self.monitor.system.celestials["Sun"]:
                print "Drawing",celestial.name
                if celestial.name == "Kerbin":
                    color = pygame.Color("blue")
                    radius = 2
                elif celestial.name == "Moho":
                    color = pygame.Color("brown")
                    radius = 1
                elif celestial.name == "Eve":
                    color = pygame.Color("purple")
                    radius = 2
                elif celestial.name == "Duna":
                    color = pygame.Color("orange")
                    radius = 2
                elif celestial.name == "Dres":
                    color = pygame.Color("gray")
                    radius = 2
                elif celestial.name == "Jool":
                    color = pygame.Color("green")
                    radius = 3
                elif celestial.name == "Eeloo":
                    color = pygame.Color("cyan")
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
                
                # Draw orbit
                
                period = celestial.orbit.getPeriod()
                step = period / 40
                points = []
                for i in xrange(40):
     
                    np = celestial.orbit.get(i*step)[0]
                    nx = int(np[0] / 5e8)
                    ny = int(np[1] / 5e8)
                    points.append(self.cc([nx,ny]))
                    
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
































