import React, { useEffect, useState } from 'react';
import {
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMapMarkerAlt,
  FaMicrochip,
  FaMobile,
  FaPhone,
  FaQuoteLeft,
  FaSun,
  FaThermometerHalf,
  FaTint,
  FaTwitter,
  FaUsers,
  FaWordpress
} from 'react-icons/fa';
import logoImage from '../../assets/images/logo.png';
import './LandingPage.css';

const LandingPage = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false);
  const [downloadCount] = useState(12547);


  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Urban Farmer",
      image: "/api/placeholder/80/80",
      text: "Cropify has revolutionized my urban farming. The sensors provide real-time data that helps me optimize my plant growth like never before."
    },
    {
      name: "Mike Chen",
      role: "Greenhouse Owner",
      image: "/api/placeholder/80/80",
      text: "The analytics dashboard is incredible. I can track plant health trends and make data-driven decisions for my greenhouse operations."
    },
    {
      name: "Emily Rodriguez",
      role: "Home Gardener",
      image: "/api/placeholder/80/80",
      text: "As a beginner, Cropify made smart farming accessible. The mobile app is intuitive and the support team is amazing."
    }
  ];


  // Automatic slideshow for testimonials
  useEffect(() => {
    if (isSlideshowPaused) return;

    const interval = setInterval(() => {
      setActiveTestimonial((prevIndex) => 
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      );
    }, 2000); // Change testimonial every 2 seconds

    return () => clearInterval(interval);
  }, [isSlideshowPaused, testimonials.length]);

  return (
    <div className="landing-page">
      {/* Admin Login Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <a href="/login" className="admin-login-link">
            Click here to admin login
          </a>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src={logoImage} alt="Cropify Logo" className="logo-image" />
          </div>
          <div className="nav-links">
            <a href="#about">About Us</a>
            <a href="#features">Features</a>
            <a href="#contact">Contact Us</a>
          </div>
          <div className="nav-actions">
            <a href="#download" className="download-nav-btn">Download</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              IoT-Powered Hydroponics Made Simple with
              <span className="highlight"> Cropify</span>
            </h1>
            <p className="hero-description">
              Monitor your plants with IoT sensors, get AI-powered insights, and grow healthier crops with our comprehensive smart farming platform.
            </p>
          </div>
          <div className="hero-image">
            <div className="hero-mockup">
              <div className="mockup-phone">
                <div className="phone-screen">
                  <div className="app-interface">
                    <div className="app-header">
                      <img src={logoImage} alt="Cropify" className="app-logo" />
                    </div>
                    <div className="app-content">
                      <div className="sensor-card">
                        <FaMicrochip />
                        <span>Sensor Kit #001</span>
                        <div className="status active">Active</div>
                      </div>
                      <div className="metrics">
                        <div className="metric">
                          <FaTint />
                          <span>pH: 6.8</span>
                        </div>
                        <div className="metric">
                          <FaThermometerHalf />
                          <span>24°C</span>
                        </div>
                        <div className="metric">
                          <FaSun />
                          <span>65%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose Cropify?</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaMicrochip />
              </div>
              <h3>Real-time Monitoring</h3>
              <p>Monitor pH, TDS, temperature, and humidity in real-time with our advanced IoT sensors. Get instant alerts and data visualization for optimal plant care.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaMobile />
              </div>
              <h3>Mobile App</h3>
              <p>Access your farm data anywhere with our intuitive mobile application. Track your plants, receive notifications, and manage your hydroponic system on the go.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h3>Expert Support</h3>
              <p>Get help from our team of agricultural experts and smart farming specialists. Partnered with <a href="https://plantboxinnovations.wordpress.com/" target="_blank" rel="noopener noreferrer" className="plantbox-link">PlantBox Innovations</a> for sustainable farming solutions and expert guidance.</p>
            </div>
          </div>
        </div>
      </section>


      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2 style={{ textAlign: 'center' }}>What Our Customers Say</h2>
            <p style={{ textAlign: 'center' }}>Real stories from real farmers</p>
          </div>
          <div 
            className="testimonials-container"
            onMouseEnter={() => setIsSlideshowPaused(true)}
            onMouseLeave={() => setIsSlideshowPaused(false)}
          >
            <div className="testimonial-card active">
              <div className="testimonial-content">
                <FaQuoteLeft className="quote-icon" />
                <p>{testimonials[activeTestimonial].text}</p>
                <div className="testimonial-author">
                  <div className="author-info">
                    <h4>{testimonials[activeTestimonial].name}</h4>
                    <span>{testimonials[activeTestimonial].role}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="testimonial-nav">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`nav-dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
            <div className="cta-content">
              <h2 style={{ textAlign: 'center' }}>Ready to Start Your IoT-Powered Hydroponics Journey?</h2>
              <p style={{ textAlign: 'center' }}>Join thousands of farmers who are already using Cropify to grow better crops.</p>
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <a 
                  href="https://drive.google.com/file/d/1U0A7S2MmX5ukTlLyvLbPutyj1XpXZUvX/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem 2rem',
                    backgroundColor: 'white',
                    color: '#4CAF50',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '1.2rem',
                    transition: 'all 0.3s ease',
                    border: '2px solid white'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f5f5f5';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Download APK
                </a>
                <div style={{ 
                  marginTop: '1rem', 
                  fontSize: '0.9rem', 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500'
                }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{downloadCount.toLocaleString()}</span> downloads
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <img src={logoImage} alt="Cropify Logo" className="footer-logo-image" />
              </div>
              <p>Empowering farmers with smart technology for sustainable agriculture.</p>
              <div className="social-links">
                <a href="https://www.facebook.com/plantboxinnovate" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
                <a href="#"><FaTwitter /></a>
                <a href="#"><FaInstagram /></a>
                <a href="#"><FaLinkedin /></a>
                <a href="https://plantboxinnovations.wordpress.com/" target="_blank" rel="noopener noreferrer"><FaWordpress /></a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <div className="contact-info">
                <div className="contact-item">
                  <FaEnvelope />
                  <span>cropifyphilippines@gmail.com</span>
                </div>
                <div className="contact-item">
                  <FaPhone />
                  <span>+63 9763446894</span>
                </div>
                <div className="contact-item">
                  <FaMapMarkerAlt />
                  <span>Manila, Philippines</span>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Cropify. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
