# -*- coding: utf-8 -*-
""" "THE BEER-WARE LICENSE" (Revision 42):
 * Matti Eiden <snaipperi@gmail.com> wrote this file. As long as you retain 
 * this notice you can do whatever you want with this stuff. If we meet some 
 * day, and you think this stuff is worth it, you can buy me a beer in return.
"""
import pygame
FONT = None

class BoxElement(object):
    ''' 
    Element is the base object for interactive objects for views
    It requires a surface to render on, shape (rect), text and colors.
    
    color_text - color of text
    color_background
    '''
    def __init__(self, surface, shape, text, color_text=(0,255,0),
                 color_background=(0,0,0), color_hilight=(0,50,0), 
                 color_focus=(0,150,0)):
                     
        self.surface = surface     
        self.shape = shape
        self.text = text
        
        
        # TODO, generate button size automatically
        # Enlarge button if shape is too small
        textsize = FONT.size(self.text)
        if textsize[0] > self.shape.width:
            self.shape.inflate_ip(textsize[0]+5, self.shape.height)
            
        # Define colors
        self.color_text = color_text
        self.color_background = color_background        
        self.color_hilight = color_hilight
        self.color_focus = color_focus
        
        # Ticker is used to count frames when under focus. Do stuff
        # like automatic defocus or animation or.. you know.
        self.ticker = 0
        
        self.has_hilight = False
        self.has_focus = False
        self.render()
        
    def render(self):
        """ Override """
        if self.has_focus:
            bg = self.color_focus
        elif self.has_hilight:
            bg = self.color_hilight
        else:
            bg = self.color_background
            
        pygame.draw.rect(self.surface, bg, self.shape)
        pygame.draw.rect(self.surface, self.color_text, self.shape,1)
        txt = FONT.render(self.text, False, self.color_text)
        self.surface.blit(txt,(self.shape[0]+2, self.shape[1]+2))
        
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
        self.has_focus = True
        print "Focused"
        self.render()
    
    def defocus(self):
        """ Override """
        self.has_focus = False
        self.surface.focusElement = None
        print "Defocused"
        self.render()
    
    def hilight(self):
        """ Override """
        self.has_hilight = True
        self.render()
    
    def dehilight(self):
        """ Override """
        self.has_hilight = False
        self.render()
        
    def tick(self):
        pass
    

class Button(BoxElement):
    ''' Button object for easy clickin' '''
    
    def __init__(self, surface, shape, text, color_text=(0,255,0),
                 color_background=(0,0,0), color_hilight=(0,50,0), 
                 color_focus=(0,150,0)):
                     
        BoxElement.__init__(self, surface, shape, text,color_text,
                         color_background, color_hilight, color_focus)
        
    def click(self):
        pass
    
    def tick(self):
        self.ticker += 1
        print "Ticking",self.ticker,self.has_focus
        if self.ticker >= 3:
            self.defocus()
            self.surface.focusElement = None
            self.ticker = 0
            
class Input(BoxElement):
    ''' Input object for typing stuff '''
    
    def __init__(self, surface, shape, text, color_background=(0,0,0),
                 color_hilight=(0,50,0), color_text=(0,255,0), 
                 color_focus=(0,150,0)):
                     
        self.cursor = False
        self.key = None
        self.keyTicker = 0
        
        BoxElement.__init__(self, surface, shape, text, color_text, 
                         color_background, color_hilight, color_focus)
        
    def defocus(self):
        self.cursor = None
        self.key = None
        BoxElement.defocus(self)
        
    def render(self):        
        if self.has_focus:
            bg = self.color_focus
        elif self.has_hilight:
            bg = self.color_hilight
        else:
            bg = self.color_background
            
        pygame.draw.rect(self.surface, bg, self.shape)
        pygame.draw.rect(self.surface, self.color_text, self.shape,1)
        
        if self.cursor:
            s = self.text + '_'
        else:
            s = self.text
            
        txt = FONT.render(s, False, self.color_text)
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
