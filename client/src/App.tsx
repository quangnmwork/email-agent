import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";

interface Email {
  uid: number;
  subject?: string;
  from?: { name?: string; address?: string }[];
  to?: { name?: string; address?: string }[];
  date?: string;
}

interface EmailData {
  emails: Email[];
  timestamp: string;
}

const SOCKET_URL = "http://localhost:3000";

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("emails", (data: EmailData) => {
      setEmails(data.emails);
      setLastUpdate(new Date(data.timestamp));
    });

    newSocket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const getFromDisplay = (from?: { name?: string; address?: string }[]) => {
    if (!from || from.length === 0) return "Unknown";
    const sender = from[0];
    return sender.name || sender.address || "Unknown";
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">📬</span>
          <h1>Mail Agent</h1>
        </div>
        <div className="header-right">
          {lastUpdate && (
            <span className="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <div className={`status ${connected ? "online" : "offline"}`}>
            <span className="status-dot"></span>
            {connected ? "Live" : "Offline"}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="email-container">
          {/* Email List */}
          <section className="email-list">
            <div className="email-list-header">
              <h2>Inbox</h2>
              <span className="email-count">{emails.length} emails</span>
            </div>
            
            {emails.length === 0 ? (
              <div className="empty-state">
                <span className="loading-spinner"></span>
                <p>Loading emails...</p>
              </div>
            ) : (
              <ul className="emails">
                {emails.map((email) => (
                  <li
                    key={email.uid}
                    className={`email-item ${selectedEmail?.uid === email.uid ? "selected" : ""}`}
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="email-avatar">
                      {getFromDisplay(email.from).charAt(0).toUpperCase()}
                    </div>
                    <div className="email-content">
                      <div className="email-header">
                        <span className="email-from">{getFromDisplay(email.from)}</span>
                        <span className="email-date">{formatDate(email.date)}</span>
                      </div>
                      <div className="email-subject">
                        {email.subject || "(No subject)"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Email Preview */}
          <section className="email-preview">
            {selectedEmail ? (
              <>
                <div className="preview-header">
                  <h3>{selectedEmail.subject || "(No subject)"}</h3>
                  <div className="preview-meta">
                    <div className="preview-from">
                      <strong>From:</strong> {getFromDisplay(selectedEmail.from)}
                      {selectedEmail.from?.[0]?.address && (
                        <span className="email-address">
                          {" <"}{selectedEmail.from[0].address}{">"}
                        </span>
                      )}
                    </div>
                    <div className="preview-date">
                      <strong>Date:</strong>{" "}
                      {selectedEmail.date
                        ? new Date(selectedEmail.date).toLocaleString("vi-VN")
                        : "Unknown"}
                    </div>
                  </div>
                </div>
                <div className="preview-body">
                  <p className="preview-placeholder">
                    📧 Email content preview coming soon...
                  </p>
                </div>
              </>
            ) : (
              <div className="preview-empty">
                <span className="preview-empty-icon">📨</span>
                <p>Select an email to preview</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
