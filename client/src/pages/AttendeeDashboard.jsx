import React, { useContext, useState, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TicketModal from "../components/TicketModal"; 

// --- SUB-COMPONENT: LOADING SKELETON ---
const EventSkeleton = () => (
  <div style={{ border: "1px solid #eee", borderRadius: "10px", overflow: "hidden", background: "white", animation: "pulse 1.5s infinite ease-in-out" }}>
    <div style={{ background: "#f0f0f0", height: "10px" }}></div>
    <div style={{ padding: "20px" }}>
      <div style={{ background: "#f0f0f0", height: "24px", width: "70%", marginBottom: "10px", borderRadius: "4px" }}></div>
      <div style={{ background: "#f0f0f0", height: "14px", width: "100%", marginBottom: "5px", borderRadius: "4px" }}></div>
      <div style={{ background: "#f0f0f0", height: "14px", width: "90%", marginBottom: "15px", borderRadius: "4px" }}></div>
      <div style={{ background: "#f9f9f9", padding: "10px", borderRadius: "5px" }}>
        <div style={{ background: "#f0f0f0", height: "12px", width: "40%", marginBottom: "8px", borderRadius: "4px" }}></div>
        <div style={{ background: "#f0f0f0", height: "12px", width: "60%", borderRadius: "4px" }}></div>
      </div>
      <div style={{ background: "#f0f0f0", height: "40px", marginTop: "15px", borderRadius: "5px" }}></div>
    </div>
    <style>{`
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `}</style>
  </div>
);

const AttendeeDashboard = () => {
  const { user, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null); 
  const [loading, setLoading] = useState(true); // Track loading state
  
  const [filters, setFilters] = useState({ search: "", location: "", date: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true); // Start animation
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events`, {
          params: { ...filters, page, limit: 6 }
        });
        let eventData = res.data.events;
        if (!filters.search && !filters.location && !filters.date) {
            eventData = shuffleArray([...eventData]);
        }
        setEvents(eventData);
        setTotalPages(res.data.totalPages);
      } catch (err) { 
        console.error("Error fetching events:", err); 
      } finally {
        setLoading(false); // End animation
      }
    };
    fetchEvents();
  }, [filters, page]); 

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1); 
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  const handlePurchase = async (eventId) => {
    if (!user) {
      alert("Please Login to Purchase Tickets");
      navigate("/login");
      return;
    }
    const qtyInput = prompt("How many tickets would you like to buy? (Max 5)", "1");
    if (qtyInput === null) return; 
    const quantity = parseInt(qtyInput);
    if (!quantity || quantity < 1 || quantity > 5) {
      alert("Invalid quantity. Please enter 1-5.");
      return;
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/tickets/purchase`, 
        { eventId, quantity },
        { headers: { token: `Bearer ${user.accessToken}` } }
      );
      setSelectedTicket(res.data); 
    } catch (err) {
      alert(err.response?.data || "Purchase failed.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      {/* --- HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ color: "#003580", margin: 0 }}>Tix Events</h1>
          <p style={{ margin: "5px 0", color: "#555" }}>Discover your next experience.</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"15px" }}>
          {user ? (
            <>
              <span style={{ fontWeight: "bold" }}>Hello, {user.username}</span>
              <a href="/my-tickets" style={{ color: "#0071c2", fontWeight: "bold", textDecoration: "none" }}>My Tickets</a>
              {user.role === 'admin' && <a href="/admin" style={{color:"red", textDecoration:"none", fontWeight:"bold"}}>Admin</a>}
              {(user.role === 'organizer' || user.role === 'admin') && <a href="/organizer" style={{color:"blue", textDecoration:"none", fontWeight:"bold"}}>Organizer</a>}
              <button onClick={handleLogout} style={{ padding: "8px 15px", background: "#d9534f", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Logout</button>
            </>
          ) : (
            <button onClick={handleLogin} style={{ padding: "8px 20px", background: "#003580", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Login</button>
          )}
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div style={{ background: "#febb02", padding: "15px", borderRadius: "10px", display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "30px", alignItems: "center" }}>
        <input name="search" placeholder="Search Event Name..." onChange={handleFilterChange} style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "none", outline:"none" }} />
        <input name="location" placeholder="Location..." onChange={handleFilterChange} style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "none", outline:"none" }} />
        <input name="date" type="date" onChange={handleFilterChange} style={{ padding: "10px", borderRadius: "5px", border: "none", outline:"none" }} />
      </div>

      {/* --- EVENTS GRID --- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {loading ? (
          // Show 6 Skeletons while loading
          Array(6).fill(0).map((_, i) => <EventSkeleton key={i} />)
        ) : events.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", marginTop: "50px", color: "gray" }}><h3>No events found.</h3></div>
        ) : (
          events.map((event) => (
            <div key={event._id} style={{ border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden", background:"white", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", transition: "transform 0.2s" }}>
              <div style={{ background: "#003580", height: "10px" }}></div>
              <div style={{ padding: "20px" }}>
                <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>{event.title}</h3>
                <p style={{ color: "#777", fontSize: "14px", height: "40px", overflow: "hidden" }}>{event.description}</p>
                <div style={{ marginTop: "15px", fontSize: "14px", background:"#f9f9f9", padding:"10px", borderRadius:"5px" }}>
                  <p style={{margin:"5px 0"}}>📅 <strong>{new Date(event.date).toLocaleDateString()}</strong></p>
                  <p style={{margin:"5px 0"}}>📍 {event.location}</p>
                  <p style={{margin:"5px 0", color:"green", fontWeight:"bold"}}>💵 ${event.price}</p>
                </div>
                {event.sold >= event.capacity ? (
                  <button disabled style={{ width: "100%", marginTop: "15px", padding: "10px", background: "#ccc", color: "#666", border: "none", borderRadius: "5px", cursor: "not-allowed", fontSize: "16px", fontWeight:"bold" }}>Sold Out</button>
                ) : (
                  <button onClick={() => handlePurchase(event._id)} style={{ width: "100%", marginTop: "15px", padding: "10px", background: "#0071c2", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", fontWeight:"bold" }}>Buy Ticket</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- PAGINATION --- */}
      {!loading && totalPages > 1 && (
        <div style={{ marginTop: "40px", display: "flex", justifyContent: "center", gap: "10px" }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} style={{ padding: "10px 20px", cursor: "pointer", opacity: page === 1 ? 0.5 : 1, border:"1px solid #ccc", background:"white", borderRadius:"5px" }}>Previous</button>
          <span style={{ padding: "10px", fontWeight: "bold" }}>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} style={{ padding: "10px 20px", cursor: "pointer", opacity: page === totalPages ? 0.5 : 1, border:"1px solid #ccc", background:"white", borderRadius:"5px" }}>Next</button>
        </div>
      )}

      {selectedTicket && <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  );
};

export default AttendeeDashboard;