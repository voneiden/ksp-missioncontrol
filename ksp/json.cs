using System;
using System.Collections.Generic;

namespace MissionControl
{
	public class json
	{
		private List<string> keys = new List<string>();
		private List<string> values = new List<string>();


		public json ()
		{

		}

		public void Add(string key, string value)
		{
			keys.Add ('"' + key + '"');
			values.Add ('"' + value + '"');
		}
		public void Add(string key, double value)
		{
			keys.Add ('"' + key + '"');
			values.Add (value.ToString());
		}

		public void Add(string key, List<string> valuelist)
		{
			keys.Add ('"' + key + '"');
			for (int i = 0; i < valuelist.Count; i++) {
				valuelist [i] = '"' + valuelist [i] + '"';
			}
			values.Add ("[" + string.Join (",", valuelist.ToArray ()) + "]");
		}

		public void Add(string key, List<double> valuelist)
		{
			keys.Add ('"' + key + '"');
			List<string> temp = new List<string> ();

			for (int i = 0; i < valuelist.Count; i++) {
				temp.Add(valuelist[i].ToString());
			}
			values.Add ("[" + string.Join (",", temp.ToArray ()) + "]");
		}

		public string dumps()
		{
			string buffer = "{";
			for (int i = 0; i < keys.Count; i++) {
				buffer += keys [i] + ":" + values [i];
				if (i + 1 != keys.Count) {
					buffer += ",";
				}
			}

			return buffer + "}";
		}
	}
}

