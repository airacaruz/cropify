import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp, FaImage, FaNewspaper, FaPlus, FaTimes, FaVideo } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import "../../styles/ManageApp.css";

const ManageAppPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState("");
  const [newsList, setNewsList] = useState([]);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("news");
  const [expandedNewsId, setExpandedNewsId] = useState(null);

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/", { replace: true });
      } else {
        setUid(user.uid);
        const q = query(collection(db, "admins"), where("adminId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            setRole((data.role || "unknown").toLowerCase());
            setAdminName(data.name || "Admin");
          });
        } else {
          setRole("unknown");
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const newsQuery = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(newsQuery, (snapshot) => {
      const newsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNewsList(newsData);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !media) {
      setStatus("Please fill in all fields.");
      return;
    }

    try {
      await addDoc(collection(db, "news"), {
        title,
        description,
        mediaUrl: media,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setDescription("");
      setMedia("");
      setStatus("News article added successfully!");
      setShowForm(false);
    } catch (error) {
      console.error("Error adding news:", error);
      setStatus("Error adding news. Try again.");
    }
  };

  const toggleExpand = (id) => {
    setExpandedNewsId(expandedNewsId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (role !== "superadmin") {
    return (
      <div className="loading-container">
        <Navbar role={role} />
        <p>Access denied. Only Super Admin can view this page.</p>
      </div>
    );
  }

  return (
    <div className="manage-app-container">
      <Navbar role={role} />
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FaNewspaper style={{ color: "#4CAF50" }} /> Manage Cropify News
      </h2>

      <div className="tab-buttons">
        <button
          className={activeTab === "news" ? "active" : ""}
          onClick={() => setActiveTab("news")}
        >
          <FaNewspaper style={{ marginRight: 4 }} /> News
        </button>
      </div>

      {activeTab === "news" && (
        <>
          <div className="header-buttons">
            <button className="add-btn" onClick={() => setShowForm(true)}>
              <FaPlus style={{ marginRight: 4 }} /> Add News
            </button>
          </div>

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-form">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>
                    <FaNewspaper style={{ marginRight: 6, color: "#4CAF50" }} />
                    Add News
                  </h3>
                  <button
                    type="button"
                    className="close-modal-btn"
                    onClick={() => setShowForm(false)}
                    style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <label>Title:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <label>Description:</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  <label>Media Link (Image or Video URL):</label>
                  <input
                    type="url"
                    value={media}
                    onChange={(e) => setMedia(e.target.value)}
                    placeholder="https://..."
                  />

                  <div className="modal-buttons">
                    <button type="submit" className="submit-btn">
                      <FaPlus style={{ marginRight: 4 }} /> Submit
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                  </div>
                  {status && <p className="status-message">{status}</p>}
                </form>
              </div>
            </div>
          )}

          <div className="news-list">
            {newsList.length === 0 ? (
              <p>No news articles yet.</p>
            ) : (
              newsList.map((news) => (
                <div key={news.id} className="news-item-card">
                  <div className="news-card-header" onClick={() => toggleExpand(news.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FaNewspaper style={{ color: "#4CAF50" }} />
                      <span style={{ fontWeight: "bold", fontSize: "1.1em" }}>{news.title}</span>
                    </div>
                    <span>
                      {expandedNewsId === news.id ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  </div>
                  <div className="news-preview" style={{ margin: "8px 0", color: "#555" }}>
                    {news.description.length > 80 && expandedNewsId !== news.id
                      ? news.description.slice(0, 80) + "..."
                      : news.description}
                  </div>
                  {expandedNewsId === news.id && (
                    <div className="news-full-content">
                      <div style={{ marginBottom: 10 }}>
                        {news.mediaUrl &&
                          (news.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <span>
                              <FaImage style={{ marginRight: 4, color: "#2196F3" }} />
                              <img
                                src={news.mediaUrl}
                                alt={news.title}
                                className="news-image"
                                style={{ maxWidth: 220, borderRadius: 8, marginTop: 8 }}
                              />
                            </span>
                          ) : news.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                            <span>
                              <FaVideo style={{ marginRight: 4, color: "#FF9800" }} />
                              <video
                                controls
                                src={news.mediaUrl}
                                className="news-image"
                                style={{ maxWidth: 220, borderRadius: 8, marginTop: 8 }}
                              />
                            </span>
                          ) : null)}
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <strong>Description:</strong>
                        <p style={{ margin: "6px 0" }}>{news.description}</p>
                      </div>
                      <a
                        href={news.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-content-link"
                      >
                        View Content
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ManageAppPage;