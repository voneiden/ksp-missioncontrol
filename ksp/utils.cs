using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using KSP.IO;

namespace MissionControl  {


	public class MCUtils 
	{
		public string getStateLine(Vessel vessel) {
			Orbit orbit = vessel.GetOrbit ();
			//string referenceBody = FlightGlobals.Bodies.IndexOf (orbit.referenceBody).ToString ();
			string referenceBody = orbit.referenceBody.GetName ();
			if (vessel.situation == Vessel.Situations.LANDED || 
			    vessel.situation == Vessel.Situations.SPLASHED || 
			    vessel.situation == Vessel.Situations.PRELAUNCH) {
				List<string> buffer = new List<string>();
				buffer.Add ("V");
				if (vessel.situation == Vessel.Situations.LANDED) { buffer.Add ("L"); }
				else if (vessel.situation == Vessel.Situations.SPLASHED) { buffer.Add ("S"); }
				else if (vessel.situation == Vessel.Situations.PRELAUNCH) { buffer.Add ("P"); }
				//buffer.Add ("L");
				buffer.Add (vessel.id.ToString ());
				buffer.Add (Planetarium.GetUniversalTime ().ToString ());
				buffer.AddRange(getFlightData (vessel));

				buffer.Add (referenceBody);
				buffer.Add (vessel.latitude.ToString ());
				buffer.Add (vessel.longitude.ToString ());
				return string.Join ("\t",buffer.ToArray ());
			}
			else if (vessel.situation == Vessel.Situations.FLYING) {
				List<string> buffer = new List<string>();
				buffer.Add ("V");
				buffer.Add ("F");
				buffer.Add (vessel.id.ToString ());
				buffer.Add (Planetarium.GetUniversalTime ().ToString ());
				buffer.AddRange(getFlightData (vessel));

				buffer.Add (referenceBody);
				buffer.Add (vessel.latitude.ToString ());
				buffer.Add (vessel.longitude.ToString ());
				return string.Join ("\t",buffer.ToArray ());
			} 
			else if (vessel.situation == Vessel.Situations.ORBITING || 
			         vessel.situation == Vessel.Situations.DOCKED || 
			         vessel.situation == Vessel.Situations.SUB_ORBITAL ||
			         vessel.situation == Vessel.Situations.ESCAPING) {

				List<string> buffer = new List<string>();
				buffer.Add ("V");
				if (vessel.situation == Vessel.Situations.ORBITING) { buffer.Add ("O"); }
				else if (vessel.situation == Vessel.Situations.DOCKED) { buffer.Add ("D"); }
				else if (vessel.situation == Vessel.Situations.SUB_ORBITAL) { buffer.Add ("SO"); }
				else if (vessel.situation == Vessel.Situations.ESCAPING) { buffer.Add ("E"); }

				//buffer.Add ("K");
				buffer.Add (vessel.id.ToString ());
				buffer.Add (Planetarium.GetUniversalTime ().ToString ());

				buffer.AddRange(getFlightData (vessel));


				buffer.Add (referenceBody);
				buffer.Add (orbit.epoch.ToString ());
				buffer.Add (orbit.semiMajorAxis.ToString ());
				buffer.Add (orbit.eccentricity.ToString ());
				buffer.Add (orbit.inclination.ToString ());
				buffer.Add (orbit.LAN.ToString ());
				buffer.Add (orbit.argumentOfPeriapsis.ToString ());
				buffer.Add (orbit.meanAnomalyAtEpoch.ToString ());
				return string.Join ("\t",buffer.ToArray ());
			}
			else {
				Debug.Log ("Unknown vessel situation");
				return "";
			}
		}

		public List<string> getFlightData (Vessel vessel)
		{
			List<string> buffer = new List<string>();

			Orbit orbit = vessel.GetOrbit ();

			Vector3d r = orbit.getRelativePositionAtUT (0);
			Vector3d v = orbit.getOrbitalVelocityAtUT (0);

			String rx = r.x.ToString ();
			String ry = r.y.ToString ();
			String rz = r.z.ToString ();

			String vx = v.x.ToString ();
			String vy = v.y.ToString ();
			String vz = v.z.ToString ();

			buffer.Add (rx + ":" + ry + ":" + rz + ":" + vx + ":" + vy + ":" + vz);

			buffer.Add (vessel.missionTime.ToString ());
			buffer.Add (vessel.acceleration.magnitude.ToString ());
			buffer.Add (vessel.altitude.ToString ());
			buffer.Add (vessel.angularMomentum.magnitude.ToString ());
			buffer.Add (vessel.angularVelocity.magnitude.ToString ());
			buffer.Add (vessel.atmDensity.ToString ());
			buffer.Add (vessel.geeForce.ToString ());
			buffer.Add (vessel.geeForce_immediate.ToString ());
			buffer.Add (vessel.heightFromSurface.ToString ());
			buffer.Add (vessel.heightFromTerrain.ToString ());
			buffer.Add (vessel.horizontalSrfSpeed.ToString ());
			buffer.Add (vessel.latitude.ToString ());
			buffer.Add (vessel.longitude.ToString ());
			buffer.Add (vessel.obt_velocity.magnitude.ToString ());
			buffer.Add (vessel.pqsAltitude.ToString ());
			buffer.Add (vessel.rb_velocity.magnitude.ToString ());
			buffer.Add (vessel.specificAcceleration.ToString ());
			buffer.Add (vessel.srf_velocity.magnitude.ToString ());
			buffer.Add (vessel.staticPressure.ToString ());
			buffer.Add (vessel.terrainAltitude.ToString ());
			buffer.Add (vessel.verticalSpeed.ToString ());

			if (vessel.Parts.Count () > 0) {
				Part part = vessel.Parts [0];
				buffer.Add (part.dynamicPressureAtm.ToString ());
				buffer.Add (part.staticPressureAtm.ToString ());
				buffer.Add (part.temperature.ToString ());
			} else {
				buffer.Add ("0");
				buffer.Add ("0");
				buffer.Add ("0");
			}


			return buffer;
		}
		public string getCelestialState(CelestialBody celestial) 
		{
			Debug.Log ("Collecting: " + celestial.GetName ());
			List<string> buffer = new List<string>();
			buffer.Add ("C");
			buffer.Add (celestial.GetName ());

			if (celestial.orbitDriver != null) {
				Orbit orbit = celestial.GetOrbit ();

				Vector3d r = orbit.getRelativePositionAtUT (0);
				Vector3d v = orbit.getOrbitalVelocityAtUT (0);

				String rx = r.x.ToString ();
				String ry = r.y.ToString ();
				String rz = r.z.ToString ();

				String vx = v.x.ToString ();
				String vy = v.y.ToString ();
				String vz = v.z.ToString ();
;
				buffer.Add (celestial.referenceBody.GetName ());
				buffer.Add (rx + ":" + ry + ":" + rz + ":" + vx + ":" + vy + ":" + vz);
			} else {
				buffer.Add ("None");
				buffer.Add ("None");
			}
	
			buffer.Add (celestial.gravParameter.ToString ());
			buffer.Add (celestial.Radius.ToString ());
			buffer.Add (celestial.sphereOfInfluence.ToString ());
			if (celestial.atmosphere == true) {
				buffer.Add (celestial.maxAtmosphereAltitude.ToString ());
			} else {
				buffer.Add ("None");
			}

			return string.Join ("\t",buffer.ToArray ());
		}
	}
}