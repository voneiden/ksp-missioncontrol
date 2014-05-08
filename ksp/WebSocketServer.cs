using System;
using System.Collections.Generic;
using WebSocketSharp;
using WebSocketSharp.Server;
using UnityEngine;

namespace MissionControl  {
	public class MissionControlService : WebSocketService
	{
		public MissionControl core;
		public List<Vessel> known_vessels = new List<Vessel>(); 

		public MissionControlService (MissionControl c)
		{
			core = c;
		}

		protected override void OnMessage (MessageEventArgs e)
		{
			var msg = e.Data;
			if (msg == "subscribe") {
				/* Do a full synchronization and subscribe the client to periodical updates*/
				core.Synchronize (this);
				core.Subscribe (this);

			} else {
				Send ("Unknown request");
			}
		}
		protected override void OnError(ErrorEventArgs e)
		{
			core.Unsubscribe (this);
		}

		public void send(string msg) 
		{
			Send (msg);
		}
	}
}
