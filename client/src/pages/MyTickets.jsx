import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TicketModal from "../components/TicketModal"; 

// --- SUB-COMPONENT: TICKET LOADING SKELETON ---
const TicketSkeleton = () => (
  <div style={{ border: "1px solid #eee", borderRadius: "10px", padding: "20px", background: "white", animation: "pulse 1.5s infinite ease-in-out" }}>
    <div style={{ background: "#f0f0f0", height: "22px", width: "80%", marginBottom: "15px", borderRadius: "4px" }}></div>
    <div style={{ background: "#f0f0f0", height: "14px", width: "50%", marginBottom: "8px", borderRadius: "4px" }}></div>
    <div style={{ background: "#f0f0f0", height: "14px", width: "60%", marginBottom: "8px", borderRadius: "4px" }}></div>
    <div style={{ background: "#f0f0f0", height: "14px", width: "30%", marginBottom: "20px", borderRadius: "4px" }}></div>
    <hr style={{ border: "0", borderTop: "1px solid #eee", marginBottom: "15px" }} />
    <div style={{ background: "#f0f0f0", height: "40px", borderRadius: "5px" }}></div>
    <style>{`
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `}</style>
  </div>
);

const MyTickets = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      console.log("🔹 FRONTEND: Fetching tickets for user:", user?.username);

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tickets`, {
          headers: { token: `Bearer ${user.accessToken}` },
        });

        console.log("🔹 FRONTEND: Response received!", res.data);
        setTickets(res.data);
      } catch (err) {
        console.error("🔴 FRONTEND ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchTickets();
    } else {
        console.log("🔴 No User found in context, redirecting...");
        navigate("/login");
    }
  }, [user, navigate]);

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", minHeight: "100vh" }}>
      <button 
        onClick={() => navigate("/")} 
        style={{ marginBottom: "20px", padding: "10px", cursor: "pointer", background: "transparent", border: "1px solid #ccc", borderRadius: "5px" }}
      >
        ← Back to Events
      </button>

      <h1>My Tickets</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {loading ? (
          // Show 3 skeletons while loading tickets
          Array(3).fill(0).map((_, i) => <TicketSkeleton key={i} />)
        ) : tickets.length === 0 ? (
          <p style={{ gridColumn: "1/-1" }}>You haven't purchased any tickets yet.</p>
        ) : (
          tickets.map((t, index) => (
            <div key={t._id || index} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", background: "white" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#0071c2" }}>{t.eventTitle || "Unknown Event"}</h3>
              <p><strong>Date:</strong> {t.eventDate ? new Date(t.eventDate).toLocaleDateString() : "N/A"}</p>
              <p><strong>Location:</strong> {t.eventLocation || "Unknown"}</p>
              <p><strong>Qty:</strong> {t.quantity}</p>
              
              <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "15px 0" }} />
              
              <button 
                onClick={() => setSelectedTicket(t)}
                style={{ width: "100%", padding: "10px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
              >
                View QR Code
              </button>
            </div>
          ))
        )}
      </div>

      {selectedTicket && (
        <TicketModal 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </div>
  );
};

export default MyTickets;