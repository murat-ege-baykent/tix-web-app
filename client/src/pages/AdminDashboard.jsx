import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Reuse basic styles for now

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const { user, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // We need to send the token in the header!
        const res = await axios.get("http://localhost:3000/api/users", {
            headers: { token: `Bearer ${user.token || user.accessToken || ""}` } 
            // Note: If your login response didn't include a token, this might fail. 
            // We'll check that in a second.
        });
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/users/${id}`, {
        headers: { token: `Bearer ${user.accessToken}` },
      });
      setUsers(users.filter((item) => item._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{display: "flex", gap: "15px", alignItems: "center"}}>
      {/* NEW MAIN MENU BUTTON */}
      <button onClick={() => navigate("/")} style={{padding:"8px 15px", background:"#6c757d", color:"white", border:"none", borderRadius:"5px", cursor:"pointer"}}>
        ← Main Menu
      </button>
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="lButton" style={{width:"100px", background:"red"}}>Logout</button>
      </div>
      </div>
      <h3>User Management</h3>
      <table border="1" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u._id}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <button 
                  onClick={() => handleDelete(u._id)}
                  style={{ cursor: "pointer", color: "red" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;