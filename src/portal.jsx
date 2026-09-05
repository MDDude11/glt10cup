import React from "react";
import ReactDOM from "react-dom/client";

function Portal() {
  return (
    <div>
      <h1>Gala Luxuria</h1>
      <p>Official Cricket Platform</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Portal />
  </React.StrictMode>
);
