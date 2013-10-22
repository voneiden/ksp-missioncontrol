Kerbal Space Program - Mission Control
==================

This project aims at providing external mission control capability to Kerbal Space Program.
The project consists (at the moment) of two parts: 
* A KSP plugin which listens to incoming TCP connections and streams live vessel updates to any connected sockets.
* Python pygame -based client that visualizes the data in various ways, including ground tracks and orbit plots.

The network protocol needs still standardization. Perhaps it can be used by other apps and software too.

Contributors are welcome!

!!! NOTE NOTE NOTE NOTE NOTE !!!
=================================
Currently working on the dev branch to create a browser client. Current progress demo should be
available at http://www.eiden.fi/ksp/ksp-missioncontrol/web-client/ (the solar system can be dragged to rotate)


v0.21 release changed the network protocol to use JSON strings separated by newlines (\n).
v0.21 release changed coordinate system transformation to plugin side. Frame rotation must still be done on client side.

Dependencies
============

Plugin: RemoteTech

32-bit Client
* Python 2.7 32-bit  (Python 3 experimental)
* pygame http://www.pygame.org/download.shtml
* numpy http://sourceforge.net/projects/numpy/files/NumPy/1.7.1/

64-bit Client
* Python 2.7 64-bit (Python 3 experimental)
* pygame 64-bit http://www.lfd.uci.edu/~gohlke/pythonlibs/#pygame
* numpy 64-bit http://www.lfd.uci.edu/~gohlke/pythonlibs/#numpy


Version History
===============

v0.2 (released 17.8.2013) (experimental demo)
- Expanding the core features.
- Still not very useful. Displays variable orbit plot, ground track and some flight data

v0.1 (experimental demo)

- Displays ground track and solar system