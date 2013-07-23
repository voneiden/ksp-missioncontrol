// This is from Unity wiki, public domain

using UnityEngine;
using System.Collections;
using System.Net.Sockets;
using System.Net;
using System.Text;
using System.Threading;
using System.Text.RegularExpressions;
using System;
using MissionControl;
 
public class Server : MonoBehaviour {
	public int port = 11211;
	public bool debug = false;
 
    static Server theServer;
 
    private Socket m_Socket;
   	private Thread t;
 
	private Regex exp;
 	public MissionControl.MissionControl MC = null;
 	
	bool myEnabled=false;
 
    ArrayList m_Connections;   
    ArrayList m_rBuffer;
	ArrayList m_sBuffers;
    ArrayList m_ByteBuffer;
	Hashtable robotListeners; //contains ArrayLists which hold the socket number of each connection listening to a given robot <key: robot name, value: ArrayList>
 
    void Start()
    {
		exp = new Regex(@"(\d+),(\w+),(\w+),(\w+),(.*)$"); //header is "<socketID>,<robotname>,<sensor/effector name>,<command>,<args>"
		myEnabled = gameObject.active;
		if(theServer==null) Init();
    }
 
	public void Send(int socketIndex, string data)
	{
		Debug.Log ("Sending to client " + socketIndex.ToString ());
		Socket client = m_Connections [socketIndex] as Socket;
		byte[] byteData = System.Text.Encoding.ASCII.GetBytes (data +  ";");
		client.Send (byteData);
	}

	public void SendAll(string data)
	{
		byte[] byteData = System.Text.Encoding.ASCII.GetBytes (data +  ";");
		Debug.Log ("Sending to all clients");
		foreach (Socket socket in m_Connections) {
			socket.Send (byteData);
		}
	}
    void Init(){
		if(theServer!=null) Cleanup();
		theServer = this;
		robotListeners = new Hashtable();
		if(m_Socket==null){		
			m_Connections = new ArrayList ();   
	    	m_rBuffer = new ArrayList ();
	    	m_ByteBuffer = new ArrayList ();
			m_sBuffers = new ArrayList ();
	        m_Socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);    
 
	        IPEndPoint ipLocal = new IPEndPoint ( IPAddress.Any , port);
 
	        m_Socket.Bind( ipLocal );
 
	        //start listening...
 
	        m_Socket.Listen (100);
 
			t = new Thread(new ThreadStart(ThreadWorker));
			t.Start();
	//		Debug.Log("Listening on: " + ((IPEndPoint)m_Socket.LocalEndPoint).Address + ":" + ((IPEndPoint)m_Socket.LocalEndPoint).Port);
		}
	}
	
	// From http://jouzorg.appspot.com/study/misc/unitysocket
 	void Update() {
		if (MC != null) {
			string msg = GetMessage ();
			if (msg == null) {
				return;
			} else {
				MC.ProcessIncoming (msg);

			}
		}
	}

 		//if (m_rBuffer!=null && m_rBuffer.Count>0) {
    	//	Array stack = m_rBuffer.ToArray();
    	//	foreach (String msg in stack) {
      	//		if (MC != null) {
      	//			MC.ProcessIncoming(msg);
      	//		}
      	//		m_rBuffer.Remove(msg);
    	//	}
  		//}
	void SetEnabled(bool mode){
		myEnabled = mode;
		if(mode && theServer==null) Init();
		if(!mode) Cleanup();
	}
 
	void OnApplicationQuit(){
		Cleanup();
	}
 
    public void Cleanup ()
    {		
		if (m_Socket != null){
//			m_Socket.Shutdown(SocketShutdown.Both);
            m_Socket.Close();
			m_Socket = null;
		}
 
		if(t!=null) t.Join();
 
		if(m_Connections!=null) {
			foreach (Socket con in m_Connections) if(con!=null) con.Close();
        	m_Connections.Clear();
			m_Connections=null;
		}
 
		if(t!=null) t=null;
		if(theServer!=null) theServer=null;
    }   
 
	//Get a message from the received queue
    static public string GetMessage (){
        if(theServer!=null){	
			if (theServer.m_rBuffer.Count == 0)
        	{
        	    return null;
        	}
        	else
        	{
        	    string readMsg = (string)theServer.m_rBuffer[0];
        	    theServer.m_rBuffer.RemoveAt(0);
        	    return readMsg;
        	}
		}
		else return null;
    }
 
	//Put a message in the outgoing queues
	static public void PutMessage(string robotName, string sendMsg){
 
		if(theServer!=null && Connected()){
			ArrayList listeners = (ArrayList)(theServer.robotListeners[robotName]); //get a list of sockets listening to the robot sending the message
			if(listeners!=null && listeners.Count>0){
				if(theServer.debug) Debug.Log("Adding Message " + sendMsg + " to queues for " + robotName);				
				for(int i=0; i<listeners.Count; i++){ //for each listener, add the message to its outgoing buffer
					ArrayList m_sBuffer = (ArrayList) (theServer.m_sBuffers[(int)listeners[i]]);
					if(m_sBuffer==null) listeners.Remove(listeners[i]); //if a connection is dropped, m_sBuffer will be set to null elsewhere and we don't want to continue to use it.
					else{
						if(m_sBuffer.Count>100) m_sBuffer.Clear(); //if there is a backlog of more than 1000 messages clear the queue
						m_sBuffer.Add(sendMsg); //if everything is safe, add the message to the outgoing buffer
					}
				}
			}
			else if(listeners==null) Debug.Log("No one is in the listeners list for " + robotName);
			else Debug.Log ("Message not sent from " + robotName + " listerns.Count = " + listeners.Count);
		}
	}
 
	//Convert a string to a byte array
	static ArrayList StringToBytes(string theString){
		ArrayList bytes=new ArrayList();
		foreach(char c in theString.ToCharArray()){
			bytes.Add((byte)c);
		}
		return bytes;
	}
 
	//Returns true if there are messages waiting to be read in the received queue
	static public int MessageAvailable(){
		if(theServer!=null) return theServer.m_rBuffer.Count;
		else return -1;
	}
 
	//Returns true if there are connections in the connection list
	static public bool Connected(){
		if(theServer!=null && theServer.m_Connections.Count>0) return true;
		else return false;
	}
 
	//Number of messages waiting to be sent
	static public int SendBufferBackLog(){
		int backlog=0;
		if(theServer!=null){
			for(int i=0;i<theServer.m_sBuffers.Count;i++) backlog+=((ArrayList)(theServer.m_sBuffers[i])).Count;
			return backlog;
		}
		else return -1;
	}
 
	//Clear the send buffer
	static public void ClearSendBuffer(){
		if(theServer!=null) for(int i=0;i<theServer.m_sBuffers.Count;i++) ((ArrayList)(theServer.m_sBuffers[i])).Clear();
		return;
	}
 
	static private void FlushReadBuffer(Socket socket){
		socket.Receive(new byte[socket.Available]);
	}
 
	//Check if a socket is still connected, questionable if this is working in Unity/Mono
	static bool IsConnected(Socket socket){
		bool blockingState = socket.Blocking;
		bool connected = false;
		try
		{
		    byte [] tmp = new byte[1];
 
		    socket.Blocking = false;
		    socket.Send(tmp, 0, 0);
		    connected = true;
		}
		catch (SocketException e) 
		{
		    // 10035 == WSAEWOULDBLOCK
		    if (e.NativeErrorCode.Equals(10035))
		        connected = true;
		    else
		    {
		        connected = false;
		    }
		}
		finally
		{
		    socket.Blocking = blockingState;
		}
		return connected;
	}
 
 
	void ThreadWorker(){
		// double tTime = 0.0;
 
		while(m_Socket!=null && myEnabled) {	
			// tTime = Time.realtimeSinceStartup;
			try{	
				DoIO();
			}
			catch(Exception e){
				Debug.Log("Error in Server :: DoIO()\n" + e.StackTrace);
			}
			// Debug.Log("DoIO just took " + (Time.realtimeSinceStartup - tTime) + " seconds.");
			Thread.Sleep(10);
		}
	}
 
    void DoIO()  {
 		// Accept any incoming connections!
        ArrayList listenList = new ArrayList();
 
        if(m_Socket!=null) listenList.Add(m_Socket);
		else return;
 
        Socket.Select(listenList, null, null, 1000);
 
        for( int i = 0; i < listenList.Count; i++ ){
            Socket newSocket = ((Socket)listenList[i]).Accept();
			newSocket.Blocking=false;			
            m_Connections.Add(newSocket);
            m_ByteBuffer.Add(new ArrayList());
			m_sBuffers.Add(new ArrayList ());
            Debug.Log("Did connect " + newSocket.RemoteEndPoint);
        }
 
        // Read & Write data to the connections!
 
 
        if (m_Connections.Count > 0){
			// Write data to connections
			ArrayList connections = new ArrayList (m_Connections);
            Socket.Select(null, connections, null, 1000);
 
			for(int i=0; i<m_Connections.Count;i++){
				ArrayList m_sBuffer = (ArrayList) m_sBuffers[i];
 
				while (m_sBuffer.Count>0){
					if(debug) Debug.Log("Sending: " + m_sBuffer[0] + " from queue " + i);
 
					byte[] sndBytes = new byte[((string)m_sBuffer[0]).Length];
					string theString = (string)m_sBuffer[0];
					for(int j=0;j<sndBytes.Length;j++){
						sndBytes[j]=(byte)theString[j];
					}
					Socket socket = (Socket)connections[i];
					if(socket!=null){
						try{
							if(socket.Connected==false)break; 			
							socket.Send(sndBytes);		
						}
						catch (SocketException e) {
							if(debug) Debug.Log("Socket Exception " + e.NativeErrorCode + " " + e.Message);
							if(e.NativeErrorCode.Equals(10054) || e.NativeErrorCode.Equals(10058)){
								Debug.Log("Did Close");
								socket.Close();
								theServer.m_ByteBuffer.RemoveAt(m_Connections.IndexOf(socket));
								theServer.m_Connections.Remove(socket);
							}
							else if(debug) Debug.Log("Unhandled Socket Exception During Writing!");
						}
					}
					else if(debug) Debug.Log("Socket in connections[" + i + "] is null!");			
					m_sBuffer.RemoveAt(0); //Remove the message we just handled
				}
			}
 
			connections = new ArrayList (m_Connections);
			if(connections==null) return;
            Socket.Select(connections, null, null, 1000);
            // Go through all sockets that have data incoming!
            foreach (Socket socket in connections)
            {	
				ArrayList buffer = null;
				int socketIndex = m_Connections.IndexOf(socket);
 
				try{
					if(socket.Connected==true){
						byte[] receivedbytes = new byte[512];
 
						buffer = (ArrayList)m_ByteBuffer[socketIndex];
	                	int read = socket.Receive(receivedbytes);
 
						// print("chars Read: " + read + " char[0] = " + receivedbytes[0]);
 
						if(socket.Available>512) {
							FlushReadBuffer(socket);
							if(debug) Debug.Log("EMERGENCY! - Buffer Filling Up - Flushing");
						}
 
	                	if(receivedbytes[0]!=0) {
							for (int i=0;i<read;i++) buffer.Add(receivedbytes[i]);
						}
					}
					else if(debug) Debug.Log("Trying to read from socket, but it is no longer connected!");
				}
				catch (SocketException e) {
					if(e.NativeErrorCode.Equals(10054) || e.NativeErrorCode.Equals(10058)){
						if(debug) Debug.Log("Closing Socket Due to Socket Exception During Reading!");
						socket.Close();
						theServer.m_ByteBuffer.RemoveAt(m_Connections.IndexOf(socket));
						theServer.m_Connections.Remove(socket);
					}
					else if(debug) Debug.Log("Unhandled Socket Exception During Reading!");
 
				}
 
 
				while (buffer!=null && buffer.Count > 0){
					//   Debug.Log("buffer.Count " + buffer.Count);
                        ArrayList thismsgBytes = new ArrayList(buffer);
 
                        // if (thismsgBytes.Count != length) Debug.Log("Bug");
 
                        byte[] readbytes = (byte[])thismsgBytes.ToArray(typeof(byte));
 
						string readString = "";
 
						foreach(byte b in readbytes){
							if((char)b=='\n' || (char)b=='\r') {
								buffer.RemoveRange(0,1);
								break;
							}
							readString+=(char)b;						
						}
					//	print(readString.Length);
						if(readString.Length>0) buffer.RemoveRange(0, readString.Length);
 
						if(readString.Length>0){
							readString = socketIndex+","+readString;
							// if(length>0) print("From Server: Msg Length: "  + length);                        	
							if(m_rBuffer!=null)theServer.m_rBuffer.Add(readString);
							if(debug) Debug.Log("ReadString: " + readString);
						}
 
 
                        if (theServer != this) Debug.Log("Server Bug");   
                }
 
 
			}
		}
	}
 
}