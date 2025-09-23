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
import { FaEye, FaNewspaper, FaPlus, FaTimes, FaVideo } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import { adminAuditActions } from "../../utils/adminAuditLogger";

const ManageAppPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState("");
  const [newsList, setNewsList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("news");
  const [expandedNewsId, setExpandedNewsId] = useState(null);

  // Tutorial states
  const [tutorialTitle, setTutorialTitle] = useState("");
  const [tutorialDescription, setTutorialDescription] = useState("");
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState("");
  const [tutorialList, setTutorialList] = useState([]);
  const [showTutorialForm, setShowTutorialForm] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState(null);

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
    // Try to fetch news with createdAt first, then fallback to timestamp
    const newsQuery = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const unsubscribeNews = onSnapshot(newsQuery, (snapshot) => {
      const newsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNewsList(newsData);
    }, (error) => {
      console.error("Error fetching news with createdAt:", error);
      // Try alternative approach with timestamp
      console.log("Trying alternative fetch method with timestamp...");
      const altNewsQuery = query(collection(db, "news"), orderBy("timestamp", "desc"));
      onSnapshot(altNewsQuery, (snapshot) => {
        const newsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNewsList(newsData);
      }, (altError) => {
        console.error("Error fetching news with timestamp:", altError);
        // Final fallback - fetch without ordering
        getDocs(collection(db, "news")).then((snapshot) => {
      const newsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNewsList(newsData);
        }).catch((finalError) => {
          console.error("Final fallback also failed:", finalError);
        });
      });
    });

    // Fetch tutorials from Firestore
    const tutorialQuery = query(collection(db, "tutorials"));
    const unsubscribeTutorials = onSnapshot(tutorialQuery, (snapshot) => {
      const tutorialData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Tutorials fetched:", tutorialData);
      console.log("Number of tutorials:", tutorialData.length);
      setTutorialList(tutorialData);
    }, (error) => {
      console.error("Error fetching tutorials:", error);
      // Try alternative approach if the above fails
      console.log("Trying alternative fetch method...");
      getDocs(collection(db, "tutorials")).then((snapshot) => {
        const tutorialData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Alternative fetch - Tutorials:", tutorialData);
        setTutorialList(tutorialData);
      }).catch((altError) => {
        console.error("Alternative fetch also failed:", altError);
      });
    });

    return () => {
      unsubscribeNews();
      unsubscribeTutorials();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !media) {
      return;
    }

    try {
      await addDoc(collection(db, "news"), {
        title,
        description,
        mediaUrl: media,
        createdAt: serverTimestamp(),
      });

      // Log the add news action
      if (uid && adminName) {
        await adminAuditActions.addNews(uid, adminName);
      }

      setTitle("");
      setDescription("");
      setMedia("");
      setShowForm(false);
    } catch (error) {
      console.error("Error adding news:", error);
    }
  };

  const handleTutorialSubmit = async (e) => {
    e.preventDefault();
    if (!tutorialTitle || !tutorialDescription || !tutorialVideoUrl) {
      return;
    }

    try {
      await addDoc(collection(db, "tutorials"), {
        title: tutorialTitle,
        description: tutorialDescription,
        videoUrl: tutorialVideoUrl,
        createdAt: serverTimestamp(),
      });

      // Log the add tutorial action
      if (uid && adminName) {
        await adminAuditActions.addTutorial(uid, adminName);
      }

      setTutorialTitle("");
      setTutorialDescription("");
      setTutorialVideoUrl("");
      setShowTutorialForm(false);
    } catch (error) {
      console.error("Error adding tutorial:", error);
    }
  };

  const toggleExpand = (id) => {
    setExpandedNewsId(expandedNewsId === id ? null : id);
  };

  const openTutorialModal = (tutorial) => {
    setSelectedTutorial(tutorial);
    setShowTutorialModal(true);
  };

  const closeTutorialModal = () => {
    setShowTutorialModal(false);
    setSelectedTutorial(null);
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
        <Navbar role={role} adminName={adminName} adminId={uid} />
        <p>Access denied. Only Super Admin can view this page.</p>
      </div>
    );
  }

  return (
    <div className="manage-app-container">
      <Navbar role={role} adminName={adminName} />

      <div className="tab-buttons">
        <button
          className={activeTab === "news" ? "active" : ""}
          onClick={() => setActiveTab("news")}
        >
          <FaNewspaper style={{ marginRight: 4 }} /> News
        </button>
        <button
          className={activeTab === "tutorials" ? "active" : ""}
          onClick={() => setActiveTab("tutorials")}
        >
          <FaVideo style={{ marginRight: 4 }} /> Tutorials
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
                </form>
              </div>
            </div>
          )}

          <div className="news-grid">
            {newsList.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#666" }}>
                <FaNewspaper style={{ fontSize: "48px", color: "#ddd", marginBottom: "16px" }} />
                <p style={{ fontSize: "18px", margin: 0 }}>No news articles yet.</p>
                <p style={{ fontSize: "14px", margin: "8px 0 0 0", color: "#999" }}>Add your first news article to get started.</p>
              </div>
            ) : (
              newsList.map((news) => (
                <div key={news.id} className="news-card">
                  
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #4CAF50, #45a049)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "16px"
                    }}>
                      <FaNewspaper style={{ color: "white", fontSize: "20px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: "18px", 
                        fontWeight: "600", 
                        color: "#333",
                        lineHeight: "1.3"
                      }}>
                        {news.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ 
                    color: "#666", 
                    fontSize: "14px", 
                    lineHeight: "1.6",
                    marginBottom: "16px",
                    flex: 1
                  }}>
                    {news.description.length > 120
                      ? news.description.slice(0, 120) + "..."
                      : news.description}
                  </div>

                  {/* Timestamp - Support both createdAt and timestamp fields */}
                  {(news.timestamp || news.createdAt) && (
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#888", 
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span>📅</span>
                      {news.timestamp 
                        ? new Date(news.timestamp.seconds ? news.timestamp.seconds * 1000 : news.timestamp).toLocaleDateString()
                        : new Date(news.createdAt.seconds ? news.createdAt.seconds * 1000 : news.createdAt).toLocaleDateString()
                      }
                    </div>
                  )}

                  {/* View Details Button */}
                  <div style={{ marginTop: "auto" }}>
                    <button
                      onClick={() => toggleExpand(news.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#4CAF50",
                        color: "white",
                        padding: "12px 24px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        width: "100%",
                        justifyContent: "center"
                      }}
                      onMouseOver={(e) => e.target.style.background = "#45a049"}
                      onMouseOut={(e) => e.target.style.background = "#4CAF50"}
                    >
                      <FaEye style={{ fontSize: "14px" }} />
                      View Details
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {expandedNewsId === news.id && (
                    <div style={{ 
                      marginTop: "20px",
                      paddingTop: "20px",
                      borderTop: "1px solid #e9ecef"
                    }}>
                      <div style={{ marginBottom: "16px" }}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                          Full Description
                        </h4>
                        <p style={{ margin: 0, color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
                          {news.description}
                        </p>
                      </div>
                      
                      {/* Display imageUrl if available (News Type 2) */}
                      {news.imageUrl && (
                        <div style={{ marginBottom: "16px" }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                            Image
                          </h4>
                          <img
                            src={news.imageUrl}
                            alt={news.title}
                            style={{ 
                              maxWidth: "100%", 
                              height: "auto", 
                              borderRadius: "8px", 
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Display linkUrl if available (News Type 2) */}
                      {news.linkUrl && (
                        <div style={{ marginBottom: "16px" }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                            External Link
                          </h4>
                          <a
                            href={news.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#FF9800",
                              color: "white",
                              padding: "10px 16px",
                              borderRadius: "6px",
                              textDecoration: "none",
                              fontSize: "14px",
                              fontWeight: "500",
                              transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => e.target.style.background = "#F57C00"}
                            onMouseOut={(e) => e.target.style.background = "#FF9800"}
                          >
                            <FaNewspaper style={{ fontSize: "12px" }} />
                            Visit Article
                          </a>
                        </div>
                      )}

                      {/* Display mediaUrl if available (News Type 1) */}
                      {news.mediaUrl && (
                        <div style={{ marginBottom: "16px" }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                            Media Content
                          </h4>
                          {news.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                              <img
                                src={news.mediaUrl}
                                alt={news.title}
                              style={{ 
                                maxWidth: "100%", 
                                height: "auto", 
                                borderRadius: "8px", 
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}
                            />
                          ) : news.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                              <video
                                controls
                                src={news.mediaUrl}
                              style={{ 
                                maxWidth: "100%", 
                                height: "auto", 
                                borderRadius: "8px", 
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}
                            />
                          ) : (
                      <a
                        href={news.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "#2196F3",
                                color: "white",
                                padding: "10px 16px",
                                borderRadius: "6px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: "500",
                                transition: "all 0.2s ease"
                              }}
                              onMouseOver={(e) => e.target.style.background = "#1976D2"}
                              onMouseOut={(e) => e.target.style.background = "#2196F3"}
                            >
                              <FaNewspaper style={{ fontSize: "12px" }} />
                        View Content
                      </a>
                          )}
                        </div>
                      )}

                      {/* Display timestamp/createdAt if available */}
                      {(news.timestamp || news.createdAt) && (
                        <div style={{ marginBottom: "16px" }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                            Published Date
                          </h4>
                          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                            {news.timestamp 
                              ? new Date(news.timestamp.seconds ? news.timestamp.seconds * 1000 : news.timestamp).toLocaleString()
                              : new Date(news.createdAt.seconds ? news.createdAt.seconds * 1000 : news.createdAt).toLocaleString()
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "tutorials" && (
        <>
          <div className="header-buttons">
            <button className="add-btn" onClick={() => setShowTutorialForm(true)}>
              <FaPlus style={{ marginRight: 4 }} /> Add Tutorial
            </button>
          </div>

          {showTutorialForm && (
            <div className="modal-overlay">
              <div className="modal-form">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>
                    <FaVideo style={{ marginRight: 6, color: "#4CAF50" }} />
                    Add Tutorial
                  </h3>
                  <button
                    type="button"
                    className="close-modal-btn"
                    onClick={() => setShowTutorialForm(false)}
                    style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleTutorialSubmit}>
                  <label>Tutorial Title:</label>
                  <input
                    type="text"
                    value={tutorialTitle}
                    onChange={(e) => setTutorialTitle(e.target.value)}
                    placeholder="Enter tutorial title"
                    required
                  />
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      value={tutorialDescription}
                      onChange={(e) => setTutorialDescription(e.target.value)}
                      placeholder="Enter tutorial description"
                      rows="4"
                      required
                    />
                  </div>
                  <label>Video URL:</label>
                  <input
                    type="url"
                    value={tutorialVideoUrl}
                    onChange={(e) => setTutorialVideoUrl(e.target.value)}
                    placeholder="Enter YouTube or video URL"
                    required
                  />
                  <div className="modal-buttons">
                    <button type="submit" className="submit-btn">
                      <FaPlus style={{ marginRight: 4 }} /> Submit
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => setShowTutorialForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="tutorials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginTop: "20px" }}>
            {tutorialList.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#666" }}>
                <FaVideo style={{ fontSize: "48px", color: "#ddd", marginBottom: "16px" }} />
                <p style={{ fontSize: "18px", margin: 0 }}>No tutorials yet.</p>
                <p style={{ fontSize: "14px", margin: "8px 0 0 0", color: "#999" }}>Add your first tutorial to get started.</p>
              </div>
            ) : (
              tutorialList.map((tutorial) => (
                <div key={tutorial.id} className="tutorial-card">
                  
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #4CAF50, #45a049)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "12px"
                    }}>
                      <FaVideo style={{ color: "white", fontSize: "18px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: "16px", 
                        fontWeight: "600", 
                        color: "#333",
                        lineHeight: "1.3"
                      }}>
                        {tutorial.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ 
                    color: "#666", 
                    fontSize: "14px", 
                    lineHeight: "1.5",
                    marginBottom: "20px"
                  }}>
                    {tutorial.description.length > 100
                      ? tutorial.description.slice(0, 100) + "..."
                      : tutorial.description}
                  </div>

                  {/* View Button */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={() => openTutorialModal(tutorial)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#4CAF50",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        width: "100%",
                        justifyContent: "center"
                      }}
                      onMouseOver={(e) => e.target.style.background = "#45a049"}
                      onMouseOut={(e) => e.target.style.background = "#4CAF50"}
                    >
                      <FaEye style={{ fontSize: "12px" }} />
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tutorial Details Modal */}
      {showTutorialModal && selectedTutorial && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "30px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              paddingBottom: "15px",
              borderBottom: "1px solid #e9ecef"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #4CAF50, #45a049)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <FaVideo style={{ color: "white", fontSize: "18px" }} />
                </div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#333" }}>
                  Tutorial Details
                </h2>
              </div>
              <button
                onClick={closeTutorialModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "5px",
                  borderRadius: "4px",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "18px", 
                  fontWeight: "600", 
                  color: "#333" 
                }}>
                  {selectedTutorial.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666", 
                  fontSize: "14px", 
                  lineHeight: "1.6" 
                }}>
                  {selectedTutorial.description}
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ 
                  margin: "0 0 10px 0", 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  color: "#333" 
                }}>
                  Video Tutorial
                </h4>
                <a
                  href={selectedTutorial.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "#4CAF50",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "16px",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => e.target.style.background = "#45a049"}
                  onMouseOut={(e) => e.target.style.background = "#4CAF50"}
                >
                  <FaVideo style={{ fontSize: "16px" }} />
                  Watch Tutorial
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "15px",
              borderTop: "1px solid #e9ecef"
            }}>
              <button
                onClick={closeTutorialModal}
                style={{
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => e.target.style.background = "#5a6268"}
                onMouseOut={(e) => e.target.style.background = "#6c757d"}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAppPage;