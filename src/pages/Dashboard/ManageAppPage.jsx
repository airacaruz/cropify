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
import { FaCalendarAlt, FaEye, FaNewspaper, FaPlus, FaTimes, FaVideo } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { auth, db } from "../../firebase";
import "../../styles/ManageApp.css";
import { adminAuditActions } from "../../utils/adminAuditLogger";

const ManageAppPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState("");
  const [newsList, setNewsList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedNewsId, setExpandedNewsId] = useState(null);

  // Tutorial states
  const [tutorialTitle, setTutorialTitle] = useState("");
  const [tutorialDescription, setTutorialDescription] = useState("");
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState("");
  const [tutorialList, setTutorialList] = useState([]);
  const [showTutorialForm, setShowTutorialForm] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [showTutorialsModal, setShowTutorialsModal] = useState(false);
  const [showNewsDetailsModal, setShowNewsDetailsModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);

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

  const openNewsModal = (news) => {
    setSelectedNews(news);
    setShowNewsDetailsModal(true);
  };


  const closeTutorialModal = () => {
    setShowTutorialModal(false);
    setSelectedTutorial(null);
  };

  const closeNewsModal = () => {
    setShowNewsDetailsModal(false);
    setSelectedNews(null);
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
      <Navbar role={role} adminName={adminName} adminId={uid} />


      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${!showTutorialsModal ? 'active' : ''}`}
          onClick={() => {
            setShowTutorialsModal(false);
          }}
        >
          <FaNewspaper /> News Management
        </button>
        <button
          className={`tab-button ${showTutorialsModal ? 'active' : ''}`}
          onClick={() => {
            setShowTutorialsModal(true);
          }}
        >
          <FaVideo /> Tutorials Management
        </button>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {!showTutorialsModal ? (
          /* News Management Table */
          <div className="management-table">
            <div className="table-header">
              <div className="header-actions">
            <button className="add-btn" onClick={() => setShowForm(true)}>
                  <FaPlus /> Add News
            </button>
              </div>
          </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th><FaNewspaper /> TITLE</th>
                    <th><FaCalendarAlt /> DESCRIPTION</th>
                    <th><FaCalendarAlt /> CREATED DATE</th>
                    <th><FaEye /> ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {newsList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        <FaNewspaper className="empty-icon" />
                        <p>No news articles found</p>
                      </td>
                    </tr>
                  ) : (
                    newsList.map((news, index) => (
                      <tr key={news.id} className={index % 2 === 0 ? 'even' : 'odd'}>
                        <td className="title-cell">
                          <div className="title-content">
                            <FaNewspaper className="item-icon" />
                            <span>{news.title}</span>
                          </div>
                        </td>
                        <td className="description-cell">
                          {news.description.length > 50 
                            ? news.description.slice(0, 50) + '...' 
                            : news.description}
                        </td>
                        <td className="date-cell">
                          {news.timestamp 
                            ? new Date(news.timestamp.seconds ? news.timestamp.seconds * 1000 : news.timestamp).toLocaleDateString()
                            : news.createdAt 
                            ? new Date(news.createdAt.seconds ? news.createdAt.seconds * 1000 : news.createdAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td className="actions-cell">
                          <button 
                            className="view-btn"
                            onClick={() => openNewsModal(news)}
                          >
                            <FaEye /> View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Tutorials Management Table */
          <div className="management-table">
            <div className="table-header">
              <div className="header-actions">
                <button className="add-btn" onClick={() => setShowTutorialForm(true)}>
                  <FaPlus /> Add Tutorial
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th><FaVideo /> TITLE</th>
                    <th><FaCalendarAlt /> DESCRIPTION</th>
                    <th><FaCalendarAlt /> CREATED DATE</th>
                    <th><FaEye /> ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorialList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        <FaVideo className="empty-icon" />
                        <p>No tutorials found</p>
                      </td>
                    </tr>
                  ) : (
                    tutorialList.map((tutorial, index) => (
                      <tr key={tutorial.id} className={index % 2 === 0 ? 'even' : 'odd'}>
                        <td className="title-cell">
                          <div className="title-content">
                            <FaVideo className="item-icon" />
                            <span>{tutorial.title}</span>
                          </div>
                        </td>
                        <td className="description-cell">
                          {tutorial.description.length > 50 
                            ? tutorial.description.slice(0, 50) + '...' 
                            : tutorial.description}
                        </td>
                        <td className="date-cell">
                          {tutorial.createdAt 
                            ? new Date(tutorial.createdAt.seconds ? tutorial.createdAt.seconds * 1000 : tutorial.createdAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td className="actions-cell">
                          <button 
                            className="view-btn"
                            onClick={() => openTutorialModal(tutorial)}
                          >
                            <FaEye /> View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>



      {/* Add News Form Modal */}
          {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3>
                <FaNewspaper style={{ marginRight: 8, color: "#4CAF50" }} />
                    Add News
                  </h3>
                  <button
                    type="button"
                    className="close-modal-btn"
                    onClick={() => setShowForm(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
              <div className="form-group">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
              </div>

                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

              <div className="form-group">
                  <label>Media Link (Image or Video URL):</label>
                  <input
                    type="url"
                    value={media}
                    onChange={(e) => setMedia(e.target.value)}
                    placeholder="https://..."
                    required
                  />
              </div>

                  <div className="modal-buttons">
                    <button type="submit" className="submit-btn">
                  <FaPlus /> Submit
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


      {/* Add Tutorial Form Modal */}
          {showTutorialForm && (
        <div className="modal-overlay" onClick={() => setShowTutorialForm(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3>
                <FaVideo style={{ marginRight: 8, color: "#4CAF50" }} />
                    Add Tutorial
                  </h3>
                  <button
                    type="button"
                    className="close-modal-btn"
                    onClick={() => setShowTutorialForm(false)}
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleTutorialSubmit}>
              <div className="form-group">
                  <label>Tutorial Title:</label>
                  <input
                    type="text"
                    value={tutorialTitle}
                    onChange={(e) => setTutorialTitle(e.target.value)}
                    placeholder="Enter tutorial title"
                    required
                  />
              </div>
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
              <div className="form-group">
                  <label>Video URL:</label>
                  <input
                    type="url"
                    value={tutorialVideoUrl}
                    onChange={(e) => setTutorialVideoUrl(e.target.value)}
                    placeholder="Enter YouTube or video URL"
                    required
                  />
              </div>
                  <div className="modal-buttons">
                    <button type="submit" className="submit-btn">
                  <FaPlus /> Submit
                    </button>
                    <button type="button" className="cancel-btn" onClick={() => setShowTutorialForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
              {/* Tutorial Title */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "20px", 
                  fontWeight: "600", 
                  color: "#333" 
                }}>
                  {selectedTutorial.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666", 
                  fontSize: "15px", 
                  lineHeight: "1.6" 
                }}>
                  {selectedTutorial.description}
                </p>
              </div>

              {/* Tutorial Information Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef"
                }}>
                  <h4 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Tutorial ID
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#6c757d", 
                    fontSize: "14px",
                    fontFamily: "monospace"
                  }}>
                    {selectedTutorial.id}
                  </p>
                </div>

                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef"
                }}>
                  <h4 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Created Date
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#6c757d", 
                    fontSize: "14px"
                  }}>
                    {selectedTutorial.createdAt 
                      ? new Date(selectedTutorial.createdAt.seconds ? selectedTutorial.createdAt.seconds * 1000 : selectedTutorial.createdAt).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Video Tutorial Section */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ 
                  margin: "0 0 15px 0", 
                  fontSize: "16px", 
                  fontWeight: "600", 
                  color: "#333" 
                }}>
                  Video Tutorial
                </h4>
                
                {/* Video URL Display */}
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
                  marginBottom: "15px"
                }}>
                  <p style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "14px", 
                    fontWeight: "500", 
                    color: "#495057" 
                  }}>
                    Video URL:
                  </p>
                  <p style={{ 
                    margin: 0, 
                    color: "#6c757d", 
                    fontSize: "13px",
                    wordBreak: "break-all",
                    fontFamily: "monospace"
                  }}>
                    {selectedTutorial.videoUrl}
                  </p>
                </div>

                {/* Watch Button */}
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

      {/* News Details Modal */}
      {showNewsDetailsModal && selectedNews && (
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
                  <FaNewspaper style={{ color: "white", fontSize: "18px" }} />
                </div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: "#333" }}>
                  News Details
                </h2>
              </div>
              <button
                onClick={closeNewsModal}
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
              {/* News Title */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "20px", 
                  fontWeight: "600", 
                  color: "#333" 
                }}>
                  {selectedNews.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: "#666", 
                  fontSize: "15px", 
                  lineHeight: "1.6" 
                }}>
                  {selectedNews.description}
                </p>
              </div>

              {/* News Information Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef"
                }}>
                  <h4 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    News ID
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#6c757d", 
                    fontSize: "14px",
                    fontFamily: "monospace"
                  }}>
                    {selectedNews.id}
                  </p>
                </div>

                <div style={{
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef"
                }}>
                  <h4 style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: "14px", 
                    fontWeight: "600", 
                    color: "#495057",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Created Date
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: "#6c757d", 
                    fontSize: "14px"
                  }}>
                    {selectedNews.timestamp 
                      ? new Date(selectedNews.timestamp.seconds ? selectedNews.timestamp.seconds * 1000 : selectedNews.timestamp).toLocaleDateString()
                      : selectedNews.createdAt 
                      ? new Date(selectedNews.createdAt.seconds ? selectedNews.createdAt.seconds * 1000 : selectedNews.createdAt).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Media Content Section */}
              {selectedNews.mediaUrl && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ 
                    margin: "0 0 15px 0", 
                    fontSize: "16px", 
                    fontWeight: "600", 
                    color: "#333" 
                  }}>
                    Media Content
                  </h4>
                  
                  {/* Media URL Display */}
                  <div style={{
                    padding: "15px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef",
                    marginBottom: "15px"
                  }}>
                    <p style={{ 
                      margin: "0 0 8px 0", 
                      fontSize: "14px", 
                      fontWeight: "500", 
                      color: "#495057" 
                    }}>
                      Media URL:
                    </p>
                    <p style={{ 
                      margin: 0, 
                      color: "#6c757d", 
                      fontSize: "13px",
                      wordBreak: "break-all",
                      fontFamily: "monospace"
                    }}>
                      {selectedNews.mediaUrl}
                    </p>
                  </div>

                  {/* Media Display */}
                  <div style={{
                    padding: "15px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef",
                    textAlign: "center"
                  }}>
                    {selectedNews.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img
                        src={selectedNews.mediaUrl}
                        alt={selectedNews.title}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "300px",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
                        }}
                      />
                    ) : (
                      <a
                        href={selectedNews.mediaUrl}
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
                        <FaNewspaper style={{ fontSize: "16px" }} />
                        View Media Content
                      </a>
                    )}
                  </div>
                </div>
              )}
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
                onClick={closeNewsModal}
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