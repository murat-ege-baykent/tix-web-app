import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const OrganizerDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null); // State to hold the event being edited
  const [loading, setLoading] = useState(true);

  // Fetch only events created by this organizer
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/organizer`, {
          headers: { token: `Bearer ${user.accessToken}` }
        });
        setEvents(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching organizer events:", err);
        setLoading(false);
      }
    };
    if (user) fetchEvents();
  }, [user]);

  // Handle the Update Submission
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Sends PUT request to update info and trigger mass emails
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${editingEvent._id}`, 
        editingEvent, 
        { headers: { token: `Bearer ${user.accessToken}` } }
      );
      
      alert("✅ Event updated! All ticket holders are being notified via email.");
      setEditingEvent(null);
      
      // Refresh the list to show new data
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/organizer`, {
        headers: { token: `Bearer ${user.accessToken}` }
      });
      setEvents(res.data);
    } catch (err) {
      console.error("Update failed:", err);
      alert("❌ Failed to update event. Make sure you are authorized.");
    }
  };

  if (loading) return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading Dashboard...</div>;

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <button 
        onClick={() => navigate("/")} 
        style={{ marginBottom: "20px", padding: "8px 15px", cursor: "pointer", background: "#f4f4f4", border: "1px solid #ccc", borderRadius: "5px" }}
      >
        ← Back to Home
      </button>

      <h2 style={{ borderBottom: "2px solid #003580", paddingBottom: "10px" }}>🛠 Organizer Dashboard</h2>
      <p style={{ color: "#666" }}>Manage your events and notify attendees of changes.</p>

      {/* --- EVENT LIST --- */}
      <div style={{ marginTop: "30px", display: "grid", gap: "20px" }}>
        {events.length === 0 ? (
          <p>You haven't created any events yet.</p>
        ) : (
          events.map((ev) => (
            <div key={ev._id} style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
              <div>
                <h3 style={{ margin: "0 0 5px 0" }}>{ev.title}</h3>
                <p style={{ margin: "0", color: "#555" }}>
                  <strong>📅 Date:</strong> {new Date(ev.date).toLocaleDateString()} <br/>
                  <strong>📍 Location:</strong> {ev.location}
                </p>
                <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#007bff" }}>
                  🎟 {ev.sold} / {ev.capacity} Tickets Sold
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => navigate("/scanner")}
                  style={{ padding: "10px 15px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                >
                  Open Scanner
                </button>
                <button 
                  onClick={() => setEditingEvent(ev)} 
                  style={{ padding: "10px 15px", background: "#003580", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                >
                  Edit Info
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- EDIT MODAL OVERLAY --- */}
      {editingEvent && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <form 
            onSubmit={handleUpdate} 
            style={{ background: "white", padding: "30px", borderRadius: "15px", width: "350px", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" }}
          >
            <h3 style={{ marginTop: 0 }}>Edit Event Details</h3>
            <p style={{ fontSize: "12px", color: "#d9534f", marginBottom: "20px" }}>
              * Saving changes will automatically email all ticket holders about the new date/location.
            </p>

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Concert Title:</label>
            <input 
              type="text" 
              disabled 
              value={editingEvent.title} 
              style={{ width: "100%", padding: "10px", marginBottom: "15px", background: "#f9f9f9", border: "1px solid #ddd" }} 
            />

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>New Location:</label>
            <input 
              type="text" 
              required
              value={editingEvent.location} 
              onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} 
              style={{ width: "100%", padding: "10px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "5px" }} 
            />

            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>New Date:</label>
            <input 
              type="date" 
              required
              value={editingEvent.date.split("T")[0]} 
              onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} 
              style={{ width: "100%", padding: "10px", marginBottom: "20px", border: "1px solid #ccc", borderRadius: "5px" }} 
            />

            <button 
              type="submit" 
              style={{ width: "100%", padding: "12px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
            >
              Save & Notify Attendees
            </button>
            <button 
              type="button" 
              onClick={() => setEditingEvent(null)} 
              style={{ width: "100%", marginTop: "10px", background: "none", border: "none", color: "#d9534f", cursor: "pointer" }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;