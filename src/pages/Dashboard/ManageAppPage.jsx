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

  // Role and user info
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch role and admin name using uid (like Dashboard)
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

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  // Optional: restrict access to only superadmin
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
      <h2>Manage Cropify</h2>

      <div className="tab-buttons">
        <button
          className={activeTab === "news" ? "active" : ""}
          onClick={() => setActiveTab("news")}
        >
          News
        </button>
        {/* Future tabs can go here */}
        {/* <button onClick={() => setActiveTab("somethingElse")}>Other Tab</button> */}
      </div>

      {activeTab === "news" && (
        <>
          <div className="header-buttons">
            <button className="add-btn" onClick={() => setShowForm(true)}>
              Add News
            </button>
          </div>

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-form">
                <h3>Add News</h3>
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
                    <button type="submit">Submit</button>
                    <button type="button" onClick={() => setShowForm(false)}>
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
                <div key={news.id} className="news-item">
                  {news.mediaUrl &&
                    (news.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img
                        src={news.mediaUrl}
                        alt={news.title}
                        className="news-image"
                      />
                    ) : news.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                      <video
                        controls
                        src={news.mediaUrl}
                        className="news-image"
                      />
                    ) : null)}
                  <h3>{news.title}</h3>
                  <p>{news.description}</p>
                  <a
                    href={news.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Content
                  </a>
                  <hr />
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