import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// --- SUB-COMPONENT: EVENT ANALYTICS ---
const EventStats = ({ eventId, token }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/analytics`, {
          headers: { token: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) { console.error("Stats Error:", err); }
    };
    fetchStats();
  }, [eventId, token]);

  if (!stats) return <p style={{ fontSize: "12px", color: "#999" }}>Loading stats...</p>;

  return (
    <div style={{ marginTop: "15px", padding: "12px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #eee" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
        <span>📈 <strong>Sales:</strong> {stats.totalSold}/{stats.capacity} ({stats.salesPercentage}%)</span>
        <span>✅ <strong>Check-ins:</strong> {stats.checkedInCount}/{stats.totalAttendees} ({stats.checkInPercentage}%)</span>
      </div>
      
      {/* Sales Progress Bar */}
      <div style={{ width: "100%", height: "6px", background: "#e9ecef", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ width: `${stats.salesPercentage}%`, height: "100%", background: "#007bff", transition: "width 0.8s ease-in-out" }}></div>
      </div>

      {/* Check-in Progress Bar */}
      <div style={{ width: "100%", height: "6px", background: "#e9ecef", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${stats.checkInPercentage}%`, height: "100%", background: "#28a745", transition: "width 0.8s ease-in-out" }}></div>
      </div>
    </div>
  );
};

const OrganizerDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null); 
  const [loading, setLoading] = useState(true);

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

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/events/${editingEvent._id}`, 
        editingEvent, 
        { headers: { token: `Bearer ${user.accessToken}` } }
      );
      alert("✅ Event updated! All ticket holders are being notified via email.");
      setEditingEvent(null);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/organizer`, {
        headers: { token: `Bearer ${user.accessToken}` }
      });
      setEvents(res.data);
    } catch (err) {
      alert("❌ Failed to update event.");
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

      <div style={{ marginTop: "30px", display: "grid", gap: "20px" }}>
        {events.length === 0 ? (
          <p>You haven't created any events yet.</p>
        ) : (
          events.map((ev) => (
            <div key={ev._id} style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "10px", background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0" }}>{ev.title}</h3>
                  <p style={{ margin: "0", color: "#555", fontSize: "14px" }}>
                    <strong>📅 Date:</strong> {new Date(ev.date).toLocaleDateString()} <br/>
                    <strong>📍 Location:</strong> {ev.location}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={() => navigate("/scanner")}
                    style={{ padding: "8px 12px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" }}
                  >
                    Scanner
                  </button>
                  <button 
                    onClick={() => setEditingEvent(ev)} 
                    style={{ padding: "8px 12px", background: "#003580", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" }}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* --- ANALYTICS SECTION --- */}
              <EventStats eventId={ev._id} token={user.accessToken} />

            </div>
          ))
        )}
      </div>

      {/* --- EDIT MODAL --- */}
      {editingEvent && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <form 
            onSubmit={handleUpdate} 
            style={{ background: "white", padding: "30px", borderRadius: "15px", width: "350px" }}
          >
            <h3 style={{ marginTop: 0 }}>Edit Event</h3>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Location:</label>
            <input 
              type="text" 
              required
              value={editingEvent.location} 
              onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} 
              style={{ width: "100%", padding: "10px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "5px" }} 
            />
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Date:</label>
            <input 
              type="date" 
              required
              value={editingEvent.date.split("T")[0]} 
              onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} 
              style={{ width: "100%", padding: "10px", marginBottom: "20px", border: "1px solid #ccc", borderRadius: "5px" }} 
            />
            <button type="submit" style={{ width: "100%", padding: "12px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", cursor: "pointer" }}>
              Save & Notify
            </button>
            <button type="button" onClick={() => setEditingEvent(null)} style={{ width: "100%", marginTop: "10px", background: "none", border: "none", color: "#d9534f", cursor: "pointer" }}>
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;