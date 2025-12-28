import React, { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { GoogleLogin } from '@react-oauth/google'; // <--- IMPORT GOOGLE LIBRARY

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const { loading, error, dispatch } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  // --- STANDARD LOGIN HANDLER ---
  const handleClick = async (e) => {
    e.preventDefault();
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", credentials);
      dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
      navigate("/");
    } catch (err) {
      dispatch({ type: "LOGIN_FAILURE", payload: err.response ? err.response.data : { message: "Login failed" } });
    }
  };

  // --- GOOGLE LOGIN HANDLER ---
  const handleGoogleSuccess = async (credentialResponse) => {
    dispatch({ type: "LOGIN_START" });
    try {
        console.log("Google Token received:", credentialResponse.credential);
        
        // Send Google Token to your Backend
        const res = await axios.post("http://localhost:3000/api/auth/google", {
            token: credentialResponse.credential
        });

        // Save User & Redirect (Same as normal login)
        dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
        navigate("/"); 
        
    } catch (err) {
        console.error("Google Login Backend Error:", err);
        dispatch({ type: "LOGIN_FAILURE", payload: { message: "Google Login failed" } });
    }
  };

  const handleGoogleFailure = () => {
    console.log('Google Sign In was unsuccessful.');
  };

  return (
    <div className="loginContainer">
      <div className="loginWrapper">
        <h2>Tix Login</h2>
        
        {/* Standard Form */}
        <input
          id="username"
          placeholder="Username"
          onChange={handleChange}
          className="lInput"
        />
        <input
          id="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          className="lInput"
        />
        
        <button disabled={loading} onClick={handleClick} className="lButton">
          Login
        </button>

        {error && <span style={{color:"red", marginTop:"10px", display:"block"}}>{error.message || "Login failed!"}</span>}
        
        {/* --- GOOGLE BUTTON --- */}
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", width: "100%" }}>
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleFailure}
                theme="filled_blue"
                shape="pill"
                text="signin_with"
            />
        </div>

        {/* --- FOOTER LINKS --- */}
        <div style={{marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "15px", borderTop:"1px solid #eee", paddingTop:"15px", width:"100%"}}>
            <a href="/register" style={{fontSize: "14px", color: "#0071c2", textDecoration: "none"}}>
                Create an account
            </a>
            
            <button 
                onClick={() => navigate("/")} 
                style={{
                    background: "transparent", 
                    border: "1px solid #ccc", 
                    padding: "5px 10px", 
                    borderRadius: "5px", 
                    cursor: "pointer", 
                    fontSize: "12px",
                    color: "#555"
                }}
            >
                Return to Home
            </button>
        </div>

      </div>
    </div>
  );
};

export default Login;