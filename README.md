Kerbal Space Program - Mission Control
==================

This project aims at providing external mission control capability to Kerbal Space Program.
The project consists of two parts: 
* A KSP plugin which listens to incoming TCP connections and streams live vessel updates to any connected sockets. Essentially like Telemachus except it doesn't require any external parts.
* Browser based client

The network protocol is fairly simple. It utilises websockets. All data from server is transmitted as json, however the server itself does not receive json. The command client needs to 
send currently to the server to start streaming live updates is "subscribe" and the address defaults to ws://127.0.0.1:80/mcs 


Contributors are very welcome, I'm not going to be able to finish this one ever alone.

=================================

Dependencies
============

Currently none, future versions may have optional dependencies with RemoteTech or similar plugins.

Version History
===============
v0.3 (released 2014-05-08) (experimental demo)
- Web browser implementation that can display orbit plots (currently limited to the solar system) and ground tracks (currently limited to Kerbin)
- Essentially same as 0.2 except runs in browser.

v0.2 (released 2013-08-17) (experimental demo)
- Expanding the core features.
- Still not very useful. Displays variable orbit plot, ground track and some flight data

v0.1 (experimental demo)
- Displays ground track and solar system