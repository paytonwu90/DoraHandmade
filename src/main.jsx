import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./assets/scss/all.scss";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "../src/store/store.js";

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_API_GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <App />
    </Provider>
  </GoogleOAuthProvider>
);
