using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using KSP.IO;
using RemoteTech;
using MissionControl;
/* 

Copyright (c) 2013, Matti 'voneiden' Eiden
All rights reserved.
gvbhjhgkjhgfghjikjuyhtgyhuioiuytrr
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

v 0.1 - Testing Remote Tech contact

 */

namespace MissionControl  {

	[KSPAddon(KSPAddon.Startup.Flight, false) ]
	public class MissionControl : MonoBehaviour
	{
		public static GameObject GameObjectInstance;
		MCUtils utils = new MCUtils ();
		Server server;
		public bool RMConn = false;
		public void Awake ()
		{
			CancelInvoke ();
			InvokeRepeating ("CheckRemote",1.0F,1.0F);


			if (server != null) { server.Cleanup (); }

			server = gameObject.AddComponent <Server>();
			server.MC = this;
			string buffer = "";
		}

		public void OnDisable()
		{
			if (server != null) {
				server.Cleanup ();
			}
		}


		// Check if RemoteTech is active
		public void CheckRemote() {
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
		}
		public void ProcessIncoming(string data) {
			Debug.Log ("Received message:" + data);
			string[] requests = data.Split (';');
			foreach (string request in requests) 
			{
				if (!request.Contains (',')) {
					Debug.Log ("Skip!");
					continue;
				}
				Debug.Log ("Splitting");
				string[] tok = request.Split (new string[] { "," }, 2, StringSplitOptions.None);
				Debug.Log (tok.ToString ());
				int socket = Convert.ToInt32 ( tok [0]);
				string req = tok [1];
				Debug.Log ("Derp");
				if (req == "FULLSYNC") {
					Debug.Log ("Client requested a full sync");
					server.Send (socket, FullSync ());
				}
			}
		}

		public string FullSync() {
			List<string> buffer = new List<string>();
			foreach (Vessel vessel in FlightGlobals.Vessels) {
				buffer.Add (utils.getStateLine (vessel));
			}
			foreach (CelestialBody celestial in FlightGlobals.Bodies) {
				buffer.Add (utils.getCelestialState (celestial));
			}
			buffer.Add ("SYNCOK");
			Debug.Log ("SYNC MSG:" + buffer.ToString ());
			return string.Join (";",buffer.ToArray ());
		}
	}
}



