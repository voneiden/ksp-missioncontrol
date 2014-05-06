using WebSocketSharp;
using WebSocketSharp.Server;
using UnityEngine;

namespace MissionControl  {
	public class MissionControlService : WebSocketService
	{
		public MissionControl core;

		public MissionControlService (MissionControl c)
		{
			core = c;
		}

		protected override void OnMessage (MessageEventArgs e)
		{
			var msg = e.Data;
			if (msg == "sub") {
				Send (core.utils.getStateLine (core.active_vessel));

			} else {
				Send (msg);
			}
		}
	}
}
