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
      <div style={{ width: "100%", height: "6px", background: "#e9ecef", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ width: `${stats.salesPercentage}%`, height: "100%", background: "#007bff", transition: "width 0.8s" }}></div>
      </div>
      <div style={{ width: "100%", height: "6px", background: "#e9ecef", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${stats.checkInPercentage}%`, height: "100%", background: "#28a745", transition: "width 0.8s" }}></div>
      </div>
    </div>
  );
};

const OrganizerDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [editingEvent, setEditingEvent] = useState(null); 
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    price: 0,
    capacity: 100
  });

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/organizer`, {
        headers: { token: `Bearer ${user.accessToken}` }
      });
      setEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  // --- CREATE HANDLER ---
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/events`, newEvent, {
        headers: { token: `Bearer ${user.accessToken}` }
      });
      alert("✅ Event Created!");
      setShowCreateModal(false);
      fetchEvents();
    } catch (err) {
      alert("❌ Failed to create event.");
    }
  };

  // --- UPDATE HANDLER ---
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/events/${editingEvent._id}`, editingEvent, {
        headers: { token: `Bearer ${user.accessToken}` }
      });
      alert("✅ Event updated and notifications sent!");
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      alert("❌ Update failed.");
    }
  };

  if (loading) return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading Dashboard...</div>;

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={() => navigate("/")} style={{ padding: "8px 15px", cursor: "pointer", background: "#f4f4f4", border: "1px solid #ccc", borderRadius: "5px" }}>← Home</button>
        <button onClick={() => setShowCreateModal(true)} style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>+ Create New Event</button>
      </div>

      <h2 style={{ borderBottom: "2px solid #003580", paddingBottom: "10px" }}>🛠 Organizer Dashboard</h2>

      {/* --- EVENT LIST --- */}
      <div style={{ marginTop: "30px", display: "grid", gap: "20px" }}>
        {events.map((ev) => (
          <div key={ev._id} style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "10px", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0 }}>{ev.title}</h3>
                <p style={{ margin: "5px 0", color: "#555", fontSize: "14px" }}>📍 {ev.location} | 📅 {new Date(ev.date).toLocaleDateString()}</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => navigate("/scanner")} style={{ padding: "8px 12px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Scanner</button>
                <button onClick={() => setEditingEvent(ev)} style={{ padding: "8px 12px", background: "#003580", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Edit</button>
              </div>
            </div>
            <EventStats eventId={ev._id} token={user.accessToken} />
          </div>
        ))}
      </div>

      {/* --- CREATE MODAL --- */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <form onSubmit={handleCreate} style={{ background: "white", padding: "30px", borderRadius: "15px", width: "400px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>Create New Event</h3>
            <input type="text" placeholder="Event Title" required onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <textarea placeholder="Description" required onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <input type="text" placeholder="Location" required onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <input type="date" required onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <input type="number" placeholder="Price ($)" required onChange={(e) => setNewEvent({...newEvent, price: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <input type="number" placeholder="Capacity" required onChange={(e) => setNewEvent({...newEvent, capacity: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <button type="submit" style={{ width: "100%", padding: "12px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}>Launch Event</button>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ width: "100%", marginTop: "10px", background: "none", border: "none", color: "red" }}>Cancel</button>
          </form>
        </div>
      )}

      {/* --- EDIT MODAL (Waitlist Triggered Here) --- */}
      {editingEvent && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <form onSubmit={handleUpdate} style={{ background: "white", padding: "30px", borderRadius: "15px", width: "350px" }}>
            <h3>Edit Event Info</h3>
            <p style={{ fontSize: "12px", color: "blue" }}>* Increasing capacity will notify the Waitlist.</p>
            <label>Location:</label>
            <input type="text" value={editingEvent.location} onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
            <label>New Capacity:</label>
            <input type="number" value={editingEvent.capacity} onChange={(e) => setEditingEvent({ ...editingEvent, capacity: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "20px" }} />
            <button type="submit" style={{ width: "100%", padding: "12px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}>Save & Notify</button>
            <button type="button" onClick={() => setEditingEvent(null)} style={{ width: "100%", marginTop: "10px", background: "none", border: "none", color: "red" }}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard;