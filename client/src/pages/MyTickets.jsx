import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TicketModal from "../components/TicketModal"; 

const MyTickets = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      // DEBUG: Verify we are starting the fetch
      console.log("🔹 FRONTEND: Fetching tickets for user:", user?.username);

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/tickets`, {
          headers: { token: `Bearer ${user.accessToken}` },
        });

        // DEBUG: See exactly what the backend sent back
        console.log("🔹 FRONTEND: Response received!", res.data);
        console.log("🔹 Is it an array?", Array.isArray(res.data));
        console.log("🔹 Length:", res.data.length);

        setTickets(res.data);
      } catch (err) {
        console.error("🔴 FRONTEND ERROR:", err);
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
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <button 
        onClick={() => navigate("/")} 
        style={{ marginBottom: "20px", padding: "10px", cursor: "pointer", background: "transparent", border: "1px solid #ccc", borderRadius: "5px" }}
      >
        ← Back to Events
      </button>

      <h1>My Tickets</h1>
      


      {tickets.length === 0 ? (
        <p>You haven't purchased any tickets yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {tickets.map((t, index) => (
            <div key={t._id || index} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#0071c2" }}>{t.eventTitle || "Unknown Event"}</h3>
              <p><strong>Date:</strong> {t.eventDate ? new Date(t.eventDate).toLocaleDateString() : "N/A"}</p>
              <p><strong>Location:</strong> {t.eventLocation || "Unknown"}</p>
              <p><strong>Qty:</strong> {t.quantity}</p>
              
              <hr />
              
              <button 
                onClick={() => setSelectedTicket(t)}
                style={{ width: "100%", padding: "10px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
              >
                View QR Code
              </button>
            </div>
          ))}
        </div>
      )}

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