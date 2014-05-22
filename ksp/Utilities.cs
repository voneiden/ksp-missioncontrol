using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using KSP.IO;

namespace MissionControl  {


	public class Utilities 
	{
		public json getVesselState(Vessel vessel) {
			Debug.Log ("STEP_XXX_1");
			Orbit orbit = vessel.GetOrbit ();
			//string referenceBody = FlightGlobals.Bodies.IndexOf (orbit.referenceBody).ToString ();
			string referenceBody = orbit.referenceBody.GetName ();

			//List<string> buffer = new List<string>();
			json buffer = new json ();
			buffer.Add ("type", "vessel");

			if (vessel.situation == Vessel.Situations.LANDED) {
				buffer.Add ("state", "landed");
			} 
			else if (vessel.situation == Vessel.Situations.SPLASHED) {
				buffer.Add ("state", "splashed");
			} 
			else if (vessel.situation == Vessel.Situations.PRELAUNCH) {
				buffer.Add ("state", "prelaunch");
			} 
			else if (vessel.situation == Vessel.Situations.FLYING) {
				buffer.Add ("state", "flying");
			}
			else if (vessel.situation == Vessel.Situations.ORBITING) {
				buffer.Add ("state", "orbiting");
			} 
			else if (vessel.situation == Vessel.Situations.DOCKED) {
				buffer.Add ("state", "docked");
			} 
			else if (vessel.situation == Vessel.Situations.SUB_ORBITAL) {
				buffer.Add ("state", "suborbital");
			} 
			else if (vessel.situation == Vessel.Situations.ESCAPING) {
				buffer.Add ("state", "escaping");
			} 

			else {
				Debug.Log ("Unknown vessel situation");
				buffer.Add ("state", "unknown");
			} // # 1
			Debug.Log ("STEP_XXX_2");
			buffer.Add ("uid", vessel.id.ToString ());
			buffer.Add ("name", vessel.vesselName); // # 3
			buffer.Add ("ut", Planetarium.GetUniversalTime ()); // # 4
			buffer.Add ("ref", referenceBody); // # 5

			buffer.Add ("lon", vessel.longitude); // # 6
			buffer.Add ("lat", vessel.latitude); // # 7

			buffer.Add ("apo_t", vessel.orbit.timeToAp);
			buffer.Add ("per_t", vessel.orbit.timeToPe);

			// Why was this zero?
			Vector3d r = orbit.getRelativePositionAtUT (Planetarium.GetUniversalTime ());
			Vector3d v = orbit.getOrbitalVelocityAtUT (Planetarium.GetUniversalTime ());

			//Vector3d r = orbit.pos.xzy;
			//Vector3d v = orbit.vel.xzy;
			List<double> RV = new List<double> ();
			Debug.Log ("STEP_XXX_3");
			// TODO explain the coordinate system further
			RV.Add(r.y); 
			RV.Add(r.x); 
	       	RV.Add(r.z); 

	       	RV.Add(v.y);
	       	RV.Add(v.x);
	       	RV.Add(v.z);

			buffer.Add ("rv", RV);	// # 8

			Vector3d forward = vessel.ReferenceTransform.forward;
			Vector3d up = vessel.ReferenceTransform.up;
			List<double> fwup = new List<double> ();
			fwup.Add (forward.y);
			fwup.Add (forward.x);
			fwup.Add (forward.z);
			fwup.Add (up.y);
			fwup.Add (up.x);
			fwup.Add (up.z);
			Debug.Log ("STEP_XXX_4");
			buffer.Add ("fwup", fwup);
			//Debug.Log ("SPEED1: " + orbit.getOrbitalVelocityAtUT (Planetarium.GetUniversalTime ()).ToString ()); // Tis is currently used velocity
			//Debug.Log ("SPEED2: " + orbit.GetFrameVelAtUT (Planetarium.GetUniversalTime ()).ToString ());
			//Debug.Log ("SPEED3: " + orbit.GetRelativeVel ().ToString () );
			// GetRelativeVel seems to be OK to get the correct position

			//Debug.Log ("SPEED4: " + orbit.GetRotFrameVel ( ().ToString () );


			//Debug.Log ("POSIT1: " + orbit.getPositionAtUT(Planetarium.GetUniversalTime ()).ToString ());
			//Debug.Log ("POSIT2: " + orbit.getRelativePositionAtUT(Planetarium.GetUniversalTime ()).ToString ()); // Tis is currently used pos
			//Debug.Log ("POSIT3: " + orbit.getTruePositionAtUT (Planetarium.GetUniversalTime ()).ToString ());
			//Debug.Log ("POSIT4: " + orbit.pos.xzy.ToString ());

			//Debug.Log ("FRAMEROT: " + Planetarium.FrameIsRotating ().ToString ());
			//Debug.Log ("FRAMEROT: " + Planetarium.ZupRotation.ToString ());
			//Debug.Log ("FRAMEROT: " + Planetarium.Rotation.ToString ());

			//Debug.Log ("Framerot: " + Planetarium.InverseRotAngle.ToString ());



			//buffer.Add (orbit.epoch.ToString ());
			json elements = new json();

			elements.Add ("sma", orbit.semiMajorAxis);
			elements.Add ("ecc", orbit.eccentricity);
			elements.Add ("inc", orbit.inclination);
			elements.Add ("lan", orbit.LAN);
			elements.Add ("aop", orbit.argumentOfPeriapsis); // # 9
			elements.Add ("tan", orbit.trueAnomaly);
			elements.Add ("epo", orbit.epoch);

			//buffer.Add (orbit.meanAnomalyAtEpoch.ToString ());

			buffer.Add ("elements", elements);

			buffer.Add ("mt", vessel.missionTime); // # 10
			buffer.Add ("atm_density", vessel.atmDensity); // # 11
			buffer.Add ("geeforce", vessel.geeForce); // # 12
			buffer.Add ("obt_v", vessel.obt_velocity.magnitude); // # 13
			buffer.Add ("srf_v", vessel.srf_velocity.magnitude); // # 14
			buffer.Add ("vrt_v", vessel.verticalSpeed);   // # 15
			buffer.Add ("pressure_s", vessel.staticPressure); // # 16
			Debug.Log ("STEP_XXX_5");
			if (vessel.Parts.Count () > 0) {
				Part part = vessel.Parts [0];
				buffer.Add ("pressure_d", part.dynamicPressureAtm); // # 17
				buffer.Add ("temperature", part.temperature); // #  18
			} else {
				buffer.Add ("pressure_d", 0);
				buffer.Add ("temperature", 0);
			}

			buffer.Add ("alt", vessel.altitude); // # 19
			buffer.Add ("alt_srf", vessel.heightFromSurface); // # 20
			buffer.Add ("alt_ter", vessel.heightFromTerrain); // # 21


			buffer.Add ("alt_per", orbit.PeA);
			buffer.Add ("alt_apo", orbit.ApA);
			//vessel.GetTransform().rotation
			Vector3 roteul = vessel.GetTransform ().rotation.eulerAngles;
			Vector3 rotinv = Quaternion.Inverse(vessel.GetTransform ().rotation).eulerAngles;
			List<double> rot = new List<double> ();
			rot.Add (roteul.y);
			rot.Add (roteul.x);
			rot.Add (roteul.z);
			rot.Add (rotinv.y);
			rot.Add (rotinv.x);
			rot.Add (rotinv.z);
			buffer.Add ("rot", rot);
			//buffer.Add (vessel.acceleration.magnitude.ToString ());
			//buffer.Add (vessel.angularMomentum.magnitude.ToString ());
			//buffer.Add (vessel.angularVelocity.magnitude.ToString ());
			//buffer.Add (vessel.geeForce_immediate.ToString ());
			//buffer.Add (vessel.horizontalSrfSpeed.ToString ());
			//buffer.Add (vessel.pqsAltitude.ToString ());
			//buffer.Add (vessel.rb_velocity.magnitude.ToString ());
			//buffer.Add (vessel.specificAcceleration.ToString ());
			//buffer.Add (vessel.terrainAltitude.ToString ());

			// Lets fetch active parts for fuel amount?
			json resources = new json ();
			double max_liquid = 0;
			double liquid = 0;
			double max_electric = 0;
			double electric = 0;
			double max_solid = 0;
			double solid = 0;

			foreach (Vessel.ActiveResource resource in vessel.GetActiveResources()) {
				if (resource.info.name == "LiquidFuel") {
					max_liquid += resource.maxAmount;
					liquid += resource.amount;
				} else if (resource.info.name == "ElectricCharge") {
					max_electric += resource.maxAmount;
					electric += resource.amount;
				} else if (resource.info.name == "SolidFuel") {
					max_solid += resource.maxAmount;
					solid += resource.amount;
				}
			}

			json liquid_fuel = new json ();
			liquid_fuel.Add ("cur", liquid);
			liquid_fuel.Add ("max", max_liquid);
			resources.Add ("LiquidFuel", liquid_fuel);

			json electric_charge = new json ();
			electric_charge.Add ("cur", electric);
			electric_charge.Add ("max", max_electric);
			resources.Add ("ElectricCharge", electric_charge);

			json solid_fuel = new json ();
			solid_fuel.Add ("cur", solid);
			solid_fuel.Add ("max", max_solid);
			resources.Add ("SolidFuel", solid_fuel);

			buffer.Add ("resources", resources);

			Debug.Log ("STEP_XXX_6");
			return buffer;
			
		}
		
		public json getCelestialState(CelestialBody celestial) 
		{
			Debug.Log ("Collecting: " + celestial.GetName ());
			json buffer = new json ();
			buffer.Add ("type", "celestial");

			buffer.Add ("name", celestial.GetName ());
			buffer.Add ("ref", celestial.referenceBody.GetName ());
			if (celestial.orbitDriver != null) {
				Orbit orbit = celestial.GetOrbit ();

				Vector3d r = orbit.getRelativePositionAtUT (0);
				Vector3d v = orbit.getOrbitalVelocityAtUT (0);

				List<double> RV = new List<double> ();

				// Swap coordinate system
				RV.Add (r.y); 
				RV.Add (r.x); 
				RV.Add (r.z); 

				RV.Add (v.y);
				RV.Add (v.x);
				RV.Add (v.z);

				buffer.Add ("rv", RV);	

			} else {
				List<double> RV = new List<double> ();
				RV.Add (0.0);
				RV.Add (0.0);
				RV.Add (0.0);
				RV.Add (0.0);
				RV.Add (0.0);
				RV.Add (0.0);
				buffer.Add ("rv", RV);
			}
	
			buffer.Add ("mu", celestial.gravParameter);
			buffer.Add ("radius", celestial.Radius);
			buffer.Add ("soi", celestial.sphereOfInfluence);

			if (celestial.atmosphere == true) {
				buffer.Add ("alt_atm", celestial.maxAtmosphereAltitude);
			} else {
				buffer.Add ("alt_atm", 0);
			}

			// Angular velocity data
			buffer.Add ("ang_v", celestial.zUpAngularVelocity.magnitude);

			buffer.Add ("initial_rotation", celestial.initialRotation);
			buffer.Add ("rotation_angle", celestial.rotationAngle);
			buffer.Add ("rotation_t0", Planetarium.GetUniversalTime ());

			return buffer;
		}
	}
}