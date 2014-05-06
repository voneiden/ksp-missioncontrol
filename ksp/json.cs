using System;
using System.Collections.Generic;

namespace MissionControl
{

	public class json
	{
		// TODO: Handle SoI infinity
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
			var string_value = value.ToString ();
			if (string_value.Equals("NaN")) {
				values.Add("\"nan\"");
			}
			else if (string_value.Equals("Infinity")) {
				values.Add("\"inf\"");
			}
			else if (string_value.Equals( "-Infinity")) {
				values.Add("\"-inf\"");
			}
			else {
				values.Add (string_value);
			}
		}

		public void Add(string key, json value)
		{
			keys.Add ('"' + key + '"');
			values.Add (value.dumps());
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
				var string_value = valuelist [i].ToString ();
				if (string_value.Equals("NaN")) {
					temp.Add("\"nan\"");
				}
				else if (string_value.Equals("Infinity")) {
					temp.Add("\"inf\"");
				}
				else if (string_value.Equals( "-Infinity")) {
					temp.Add("\"-inf\"");
				}
				else {
					temp.Add (string_value);
				}
			}
			values.Add ("[" + string.Join (",", temp.ToArray ()) + "]");
		}

		public void Add(string key, List<json> valuelist)
		{
			keys.Add ('"' + key + '"');

			List<string> temp = new List<string> ();
			for (int i = 0; i < valuelist.Count; i++) {
				temp.Add(valuelist[i].dumps());
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

