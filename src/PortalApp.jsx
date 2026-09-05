import React from "react";

function PortalApp() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            marginBottom: "10px",
          }}
        >
          Gala Luxuria
        </h1>

        <p
          style={{
            fontSize: "18px",
            marginBottom: "50px",
            opacity: 0.75,
          }}
        >
          Official Cricket Platform
        </p>

        <h2
          style={{
            fontSize: "24px",
            marginBottom: "30px",
          }}
        >
          Select a Competition
        </h2>

        <div
          style={{
            display: "flex",
            gap: "25px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              window.location.href = "./index.html";
            }}
            style={{
              width: "320px",
              padding: "30px",
              background: "#111",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "20px",
            }}
          >
            <strong>GLT 10 Cup 2026</strong>
            <br />
            <span
              style={{
                display: "block",
                marginTop: "12px",
                fontSize: "14px",
                opacity: 0.7,
              }}
            >
              Official tournament website
            </span>
          </button>

          <button
            onClick={() => {
              // DRAFTS will remain locked until officially announced.
            }}
            style={{
              width: "320px",
              padding: "30px",
              background: "#111",
              color: "#777",
              border: "1px solid #333",
              borderRadius: "12px",
              cursor: "not-allowed",
              fontSize: "20px",
            }}
            title="Coming soon"
          >
            <strong>🔒 The DRAFTS 2026</strong>
            <br />
            <span
              style={{
                display: "block",
                marginTop: "12px",
                fontSize: "14px",
                opacity: 0.7,
              }}
            >
              Coming soon
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PortalApp;
