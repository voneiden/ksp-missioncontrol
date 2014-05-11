using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using KSP.IO;
//using RemoteTech; // RemoteTech removed to make debugging easier for now
using MissionControl;
using WebSocketSharp;
using WebSocketSharp.Server;


/* 
Copyright (c) 2012-2014, Matti 'voneiden' Eiden
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


 */

namespace MissionControl  {
	[KSPAddon(KSPAddon.Startup.Flight, false) ]
	public class MissionControl : MonoBehaviour
	{



		//public bool RMConn = false;
		public List<Vessel> all_vessels = new List<Vessel>();

		//public static GameObject GameObjectInstance;
		public Utilities utilities = new Utilities ();
		public List<MissionControlService> subscribed_clients = new List<MissionControlService>();
		public Vessel active_vessel = null;
		public WebSocketServer wssv;

		public void Awake ()
		{
			// Just in case cancel all old invokes related to this instance
			CancelInvoke ();

			// Do a full sync
			//FullSync ();

			// Add all vessels to the vessel list
			foreach (Vessel vessel in FlightGlobals.Vessels) {
				if (!all_vessels.Contains (vessel)) {
					all_vessels.Add (vessel);
				}
			}
			InvokeRepeating ("UpdateClients",1.0F,1.0F);

			if (wssv == null) {
				Debug.Log ("Establishing websocket");
				wssv = new WebSocketServer (12321); //TODO: Add possibility to configure IP
				wssv.AddWebSocketService<MissionControlService> ("/mcs", () => new MissionControlService (this));
				wssv.Start ();

				Debug.Log ("Established websocket!");
			}
		}

		public void OnDisable()
		{
			if (wssv != null) {
				wssv.Stop ();
				wssv = null;
			}

		}

		public void Synchronize(MissionControlService client)
		{
			Debug.Log ("STEP1");
			// Retrieve celestial information
			List<json> celestial_buffer = new List<json>();
			foreach (CelestialBody celestial in FlightGlobals.Bodies) {
				celestial_buffer.Add (utilities.getCelestialState (celestial));
			}
			Debug.Log ("STEP2");
			// Retrieve vessel information and add the vessel to known vessels
			List<json> vessel_buffer = new List<json>();
			foreach (Vessel vessel in FlightGlobals.Vessels) {
				vessel_buffer.Add (utilities.getVesselState (vessel));
				Debug.Log ("STEP2X");
				client.known_vessels.Add (vessel);
			}

			Debug.Log ("STEP3");
			// Compile it into a single json packet
			json buffer = new json();
			buffer.Add ("state", GameState ());
			buffer.Add ("celestials", celestial_buffer);
			buffer.Add ("vessels", vessel_buffer);
			Debug.Log ("STEP4");
			client.send (buffer.dumps ());
			Debug.Log ("STEP5");
			UpdateClients (); // TODO: not necessary the right way to do it.
		}

		public void Subscribe(MissionControlService client) 
		{
			if (!subscribed_clients.Contains(client)) {
				subscribed_clients.Add (client);
			}
		}

		public void Unsubscribe(MissionControlService client)
		{
			if (subscribed_clients.Contains (client)) {
				subscribed_clients.Remove (client);
			}
		}

		public json GameState() {
			json buffer = new json ();
			buffer.Add ("ut", Planetarium.GetUniversalTime());
			//buffer.Add ("rotating", Planetarium.FrameIsRotating());
			buffer.Add ("frame_angle", Planetarium.InverseRotAngle);
			buffer.Add ("active_vessel", FlightGlobals.ActiveVessel.id.ToString());
			buffer.Add ("throttle", FlightInputHandler.state.mainThrottle);
			return buffer;
		}
		public void UpdateClients() {
			json state = GameState ();
			json buffer = new json ();
			buffer.Add ("state", state);

			List<json> vessel_buffer = new List<json> ();
			vessel_buffer.Add (utilities.getVesselState (FlightGlobals.ActiveVessel));
			buffer.Add ("vessels", vessel_buffer);

			string msg = buffer.dumps ();

			foreach (MissionControlService mcs in subscribed_clients) {
				mcs.send (msg);
			}

			/*
			if (RemoteTech.RTGlobals.coreList.ActiveCore != null) {
				Debug.Log ("Remote connection:" + RemoteTech.RTGlobals.coreList.ActiveCore.InContact.ToString ());
				if (RemoteTech.RTGlobals.coreList.ActiveCore.InContact == true && FlightGlobals.ActiveVessel != null) {
					if (RMConn == false) {
						RMConn = true;
						server.SendAll ("RMCONN TRUE");
					}
					Vessel ActiveVessel = FlightGlobals.ActiveVessel;
					//string pid = ActiveVessel.id.ToString ();
					server.SendAll (utils.getStateLine (ActiveVessel));
				}
				else {
					if (RMConn == true) {
						RMConn = false;
						server.SendAll ("RMCONN FALSE");
					}
				}
			}
			*/

			// Check for new vessels..
			/*
			foreach (Vessel vessel in FlightGlobals.Vessels) {
				if (!all_vessels.Contains (vessel)) {
					all_vessels.Add (vessel);
					server.SendAll (utils.getStateLine (vessel));
				}
			}

			// Check for changed active vessel
			if (active_vessel != FlightGlobals.ActiveVessel) {
				active_vessel = FlightGlobals.ActiveVessel;
				server.SendAll("AV\t" + active_vessel.id.ToString ());
			}
			*/
			/*
			Vessel ActiveVessel = FlightGlobals.ActiveVessel;
			double UT = Planetarium.GetUniversalTime ();
			bool frame_rotating = Planetarium.FrameIsRotating ();
			double frame_angle = Planetarium.InverseRotAngle;
			string rotating;
			if (frame_rotating) {
				rotating = "1";
			}
			else {
				rotating = "0";
			}
			json buffer = new json ();
			buffer.Add ("type", "update");
			buffer.Add ("ut", UT);
			buffer.Add ("rotating", rotating);
			buffer.Add ("frame_angle", frame_angle);
			buffer.Add ("active_vessel", ActiveVessel.id.ToString());
			*/

			//Debug.Log ("Forward: " + active_vessel.GetTransform ().eulerAngles.ToString ());
			//Debug.Log ("Forward: " + active_vessel.GetTransform ().eulerAngles.ToString ());
			//Debug.Log ("Surface rotation: " + active_vessel.srfRelRotation.ToString ());
			//Debug.Log ("Surface eotation: " + active_vessel.srfRelRotation.eulerAngles);
			//Transform test = active_vessel.GetTransform ();
			//Debug.Log ("Rotation1: " + active_vessel.GetTransform().eulerAngles);
			//Debug.Log ("Rotation2: " + active_vessel.GetTransform().rotation.eulerAngles);
			//Debug.Log ("Rotation3: " + active_vessel.srfRelRotation.eulerAngles);

			// REF: FAR
			/*
			Vector3 tmpVec = active_vessel.transform.up * Vector3.Dot(active_vessel.transform.up, active_vessel.srf_velocity.normalized) + active_vessel.transform.forward * Vector3.Dot(active_vessel.transform.forward, active_vessel.srf_velocity.normalized);   //velocity vector projected onto a plane that divides the airplane into left and right halves
			float AoA = Vector3.Dot(tmpVec.normalized, active_vessel.transform.forward);
			AoA = Mathf.Rad2Deg * Mathf.Asin(AoA);
			if (float.IsNaN(AoA))
				AoA = 0;
			*/
			/*
			tmpVec = active_vessel.transform.up * Vector3.Dot(active_vessel.transform.up, active_vessel.srf_velocity.normalized) + active_vessel.transform.right * Vector3.Dot(active_vessel.transform.right, active_vessel.srf_velocity.normalized);     //velocity vector projected onto the vehicle-horizontal plane
			float yaw = Vector3.Dot(tmpVec.normalized, active_vessel.transform.right);
			yaw = Mathf.Rad2Deg * Mathf.Asin(yaw);
			if (float.IsNaN(yaw))
				yaw = 0;
			*/
			/*
			float pitch = 0;
			float yaw = 0;
			float roll = 0;

			NavBall ball = FlightUIController.fetch.GetComponentInChildren<NavBall>();
			if (ball)
			{
				Quaternion vesselRot = Quaternion.Inverse(ball.relativeGymbal);

				float heading = vesselRot.eulerAngles.y;
				//vesselRot *= Quaternion.Euler(0, -heading, 0);
				//heading = 360 - heading;
				pitch = (vesselRot.eulerAngles.x > 180) ? (360 - vesselRot.eulerAngles.x) : -vesselRot.eulerAngles.x;
				yaw = vesselRot.eulerAngles.y;
				roll = (vesselRot.eulerAngles.z > 180) ? (360 - vesselRot.eulerAngles.z) : -vesselRot.eulerAngles.z;
			}

			Debug.Log ("AoA: " + AoA);
			Debug.Log ("PCH: " + pitch);
			Debug.Log ("YAW: " + yaw);
			Debug.Log ("ROL: " + roll);

			//server.SendAll (buffer.dumps());
			//server.SendAll (utils.getStateLine (ActiveVessel));
			*/
		}
	}
}



