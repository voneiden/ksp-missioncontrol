# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain 
 * this notice you can do whatever you want with this stuff. If we meet some 
 * day, and you think this stuff is worth it, you can buy me a beer in return.

This file contains the virtual monitor class, which handles layouts and 
scaling of the image.
"""
import pygame, views
import logging

class Monitor(object):
    '''
    The monitor class is a virtual monitor that defines the layout
    of subviews. The monitor class should be subclassed for various aspect ratios.

    virtualSurface is always rendered on. After that the virtual surface is scaled on
    scaled surface to create that sweet pixely look.
    '''
    def __init__(self,display,resolution=(1024,768)):
        ''' Initialize a virtual monitor for display and resolution '''
        self.display = display
        self.system = display.system

        self.virtualResolution = resolution
        self.virtualSurface = pygame.Surface(resolution)

        self.scaledResolution = resolution
        self.scaledSurface = pygame.Surface(resolution)
        
        # TODO active view mode
        self.views = {}    # Holds different viewmodes.
        self.settings = {} # Holds runtime settings for views

        self.aspect = float(resolution[0]) / float(resolution[1])

        self.transform()
        self.setupViews()

    def setupViews(self):
        ''' Override this function to setups the views used by this monitor'''
        pass

    def fill(self):
        ''' Override this function to draw on the monitor surface '''
        self.virtualSurface.fill((255,255,255))

    def transform(self):
        ''' Calculates window stretching to maintain fixed aspect ratio '''
        sw = float(self.display.window.get_width())
        sh = float(self.display.window.get_height())

        vw = float(self.virtualSurface.get_width())
        vh = float(self.virtualSurface.get_height())

        if sw/sh >= self.aspect:
            self.transformHeight = int(sh)
            self.transformWidth = int(vw * (sh / vh))
        else:
            self.transformWidth = int(sw)
            self.transformHeight = int(vh * (sw / vw))

        self.transformBlankWidth  = int((sw-self.transformWidth)/2)
        self.transformBlankHeight = int((sh-self.transformHeight)/2)

        self.scaledSurface = pygame.Surface((self.transformWidth,self.transformHeight))

    def getRelativePosition(self,pos):
        ''' Get relative position in our virtual monitor from the absolute position on scaledMonitor '''
        #print(pos)
        x = int((pos[0] - self.transformBlankWidth) / float(self.transformWidth) * self.virtualSurface.get_width())
        y = int((pos[1] - self.transformBlankHeight)/ float(self.transformHeight) * self.virtualSurface.get_height())
        #print ((x,y))
        return (x,y)


    def getView(self,rpos):
        ''' 
        Find out which view is under the relative position
        '''
        # TODO active view mode
        
        position = pygame.Rect((rpos[0],rpos[1]),(1,1))
        for view in self.views["overview"]:
            if view.position.contains(position):
                return (view, (rpos[0] - view.position.x, rpos[1] - view.position.y))
        return False



class Monitor43(Monitor):
    '''
    4:3 standard monitor
    Virtual resolution 1024 x 768 (XGA, 768kilopixels) or SVGA (800x600, 480 kilopixels)

    This monitor defines a view where there's a thin top menu bar, two top small views and one big bottom view.
    '''
    def __init__(self,display):
        Monitor.__init__(self,display,(1024,768))

    def setupViews(self):
        # overview style
        self.viewTopMenu = views.HorizontalMenu(self, (1024,28), pygame.Rect((0,0),(1024,28)))
        self.viewPlot = views.Plot(self, (512,370), pygame.Rect((0,28),(512,370)))
        self.viewData = views.MainMenu(self, (512,370), pygame.Rect((512,28),(512,370)))
        self.viewGroundTrack = views.GroundTrack(self, (1024,370), pygame.Rect((0,398),(1024,370)))

        self.views["overview"] = [self.viewTopMenu,
                                  self.viewPlot,
                                  self.viewData,
                                  self.viewGroundTrack]


    def fill(self):
        self.virtualSurface.fill((255,255,255))
        for view in self.views["overview"]:
            self.virtualSurface.blit(view,view.position)


class Monitor169(Monitor):
    '''
    16:9 HIGH DEFINITION (with pixels!!)
    Virtual resolution is 1280 x 720 (WXGA, 921 kilopixels) or SWVGA ?!?! (1000x562, 562 kilopixels)
    '''
    def __init__(self,display):
        Monitor.__init__(self,display,(1280,720))

    def setupViews(self):
        self.viewMenubar = views.VerticalMenu(self, (80,720), pygame.Rect((0,0),(80,720)))
        self.viewPlot = views.Plot(self, (600,360), pygame.Rect((80,0),(600,360)))
        self.viewData = views.MainMenu(self, (600,360), pygame.Rect((680,0),(600,360)))
        self.viewGroundTrack = views.GroundTrack(self, (1200,360), pygame.Rect((80,360),(1200,360)))

        self.views["overview"] = [self.viewMenubar,
                                  self.viewPlot,
                                  self.viewData,
                                  self.viewGroundTrack]
    def fill(self):
        self.virtualSurface.fill((255,255,255))
        for view in self.views["overview"]:
            self.virtualSurface.blit(view,view.position)

class Monitor1610(Monitor):
    '''
    16:10 Older LCD
    Virtual resolution is 1280 x 800 (WXGA, 1 megapixel) or 1000x625, 625 kilopixels
    '''
    def __init__(self,display):
        Monitor.__init__(self,display,(1280,800))

    def setupViews(self):
        self.viewMenubar = views.VerticalMenu(self, (80,800), pygame.Rect((0,0),(80,800)))
        self.viewPlot = views.Plot(self, (600,400), pygame.Rect((80,0),(600,400)))
        self.viewData = views.MainMenu(self, (600,400), pygame.Rect((680,0),(600,400)))
        self.viewGroundTrack = views.GroundTrack(self, (1200,400), pygame.Rect((80,400),(1200,400)))

        self.views["overview"] = [self.viewMenubar,
                                  self.viewPlot,
                                  self.viewData,
                                  self.viewGroundTrack]
                                  
    def fill(self):
        self.virtualSurface.fill((255,255,255))
        for view in self.views["overview"]:
            self.virtualSurface.blit(view,view.position)