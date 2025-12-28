import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
// import "./Login.css"; // Un-comment if you have this file, otherwise standard styles below work fine

const OrganizerDashboard = () => {
  const { user, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    price: "",    
    capacity: "", 
  });

  const [myEvents, setMyEvents] = useState([]);

  // --- 1. FETCH EVENTS ---
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch all events (high limit) and filter client-side for this organizer
        const res = await axios.get("http://localhost:3000/api/events?limit=100");
        const allEvents = res.data.events || []; 
        
        // Filter: Keep only events created by THIS user
        // Note: This relies on the backend saving 'organizerId'. 
        // If your backend saves it as 'owner', change this to event.owner === user._id
        const userEvents = allEvents.filter(event => event.organizerId === user._id);
        
        setMyEvents(userEvents);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    if(user) fetchEvents();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure numbers are numbers
      const eventPayload = {
        ...formData,
        price: Number(formData.price),
        capacity: Number(formData.capacity),
        organizerId: user._id // Explicitly send ID if backend needs it
      };

      const res = await axios.post("http://localhost:3000/api/events", eventPayload, {
        headers: { token: `Bearer ${user.accessToken}` }
      });

      alert("Event Created Successfully!");
      
      // Add the new event to the list immediately
      setMyEvents([...myEvents, res.data]); 
      
      setFormData({ title: "", description: "", date: "", location: "", price: "", capacity: "" });
    } catch (err) {
      console.error(err);
      alert("Error creating event. Check console.");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this event?")) return;
    try {
      await axios.delete(`http://localhost:3000/api/events/${id}`, {
        headers: { token: `Bearer ${user.accessToken}` }
      });
      setMyEvents(myEvents.filter(event => event._id !== id));
    } catch (err) {
      console.error(err);
      alert("Could not delete. Check console.");
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* --- HEADER --- */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"30px", borderBottom:"1px solid #ccc", paddingBottom:"10px"}}>
            <div style={{display: "flex", gap: "15px", alignItems: "center"}}>
      {/* NEW MAIN MENU BUTTON */}
      <button onClick={() => navigate("/")} style={{padding:"8px 15px", background:"#6c757d", color:"white", border:"none", borderRadius:"5px", cursor:"pointer"}}>
        ← Main Menu
      </button>
            <div>
              <h1 style={{margin:0, color:"#003580"}}>Organizer Dashboard</h1>
              <p style={{margin:"5px 0", color:"gray"}}>Welcome, {user.username}</p>
            </div>
            </div>
            <div style={{display:"flex", gap:"10px"}}>
              {/* SCANNER BUTTON (From our previous step) */}
              <button 
                onClick={() => navigate("/scanner")} 
                style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor:"pointer", fontWeight:"bold" }}
              >
                📸 Open Scanner
              </button>

              <button 
                onClick={() => {dispatch({type:"LOGOUT"}); navigate("/login")}} 
                style={{ padding: "10px 20px", background: "#d9534f", color: "white", border: "none", borderRadius: "5px", cursor:"pointer", fontWeight:"bold" }}
              >
                Logout
              </button>
            </div>
        </div>

      {/* --- CREATE FORM --- */}
      <div style={{ background:"#f4f4f4", padding:"20px", borderRadius:"10px", marginBottom:"40px" }}>
        <h3 style={{marginTop:0}}>Create New Event</h3>
        
        <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
            <input id="title" placeholder="Event Title" onChange={handleChange} value={formData.title} style={{padding:"10px"}} />
            <input id="description" placeholder="Description" onChange={handleChange} value={formData.description} style={{padding:"10px"}} />
            
            <div style={{display:"flex", gap:"10px"}}>
                <input id="date" type="date" onChange={handleChange} value={formData.date} style={{padding:"10px", flex:1}} />
                <input id="location" placeholder="Location" onChange={handleChange} value={formData.location} style={{padding:"10px", flex:1}} />
            </div>
            
            <div style={{display:"flex", gap:"10px"}}>
                <div style={{flex:1}}>
                    <label style={{fontSize:"12px", color:"gray"}}>Price ($)</label>
                    <input id="price" type="number" onChange={handleChange} value={formData.price} style={{width:"100%", padding:"10px"}} />
                </div>
                <div style={{flex:1}}>
                    <label style={{fontSize:"12px", color:"gray"}}>Capacity</label>
                    <input id="capacity" type="number" onChange={handleChange} value={formData.capacity} style={{width:"100%", padding:"10px"}} />
                </div>
            </div>
            
            <button onClick={handleSubmit} style={{padding:"10px", background:"#0071c2", color:"white", border:"none", cursor:"pointer", fontWeight:"bold"}}>Create Event</button>
        </div>
      </div>

      {/* --- EVENTS LIST --- */}
      <h3>My Created Events</h3>
      <hr />
      
      {myEvents.length === 0 ? <p>No events created yet.</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", marginTop:"20px" }}>
          {myEvents.map((event) => (
            <div key={event._id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "10px", background:"white", boxShadow:"0 2px 5px rgba(0,0,0,0.1)" }}>
              <h3 style={{marginTop:0, color:"#0071c2"}}>{event.title}</h3>
              <p style={{fontSize:"14px", color:"#555"}}>{event.description.substring(0, 100)}...</p>
              
              <div style={{background:"#f9f9f9", padding:"10px", borderRadius:"5px", margin:"10px 0", fontSize:"14px"}}>
                  <p style={{margin:"5px 0"}}>📅 <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                  <p style={{margin:"5px 0"}}>📍 <strong>Loc:</strong> {event.location}</p>
                  <p style={{margin:"5px 0"}}>💵 <strong>Price:</strong> ${event.price}</p>
                  <p style={{margin:"5px 0"}}>🎟 <strong>Sold:</strong> {event.sold} / {event.capacity}</p>
              </div>

              <button onClick={() => handleDelete(event._id)} style={{ width:"100%", color: "white", background: "#d9534f", border: "none", padding: "10px", cursor: "pointer", borderRadius:"4px", fontWeight:"bold" }}>
                Delete Event
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;