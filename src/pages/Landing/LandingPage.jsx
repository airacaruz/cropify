import React, { useEffect, useState } from 'react';
import {
    FaChevronLeft,
    FaChevronRight,
    FaEnvelope,
    FaFacebook,
    FaInstagram,
    FaLinkedin,
    FaMapMarkerAlt,
    FaMicrochip,
    FaMobile,
    FaTwitter,
    FaUsers,
    FaWordpress
} from 'react-icons/fa';
import appMockupImage from '../../assets/images/cropify_phoneview.png';
import cropifyTextLogo from '../../assets/images/cropifytextlogo.png';
import slider1 from '../../assets/images/imageSlider/481671011_633272719541517_8855981084144259507_n.jpg';
import slider2 from '../../assets/images/imageSlider/493825041_677072771828178_6303893193829315865_n.jpg';
import slider6 from '../../assets/images/imageSlider/518390974_740183395517115_5596105515263630200_n.jpg';
import slider5 from '../../assets/images/imageSlider/522649900_740181562183965_8879259136510827171_n.jpg';
import slider4 from '../../assets/images/imageSlider/522971609_740181642183957_1526375359484507212_n.jpg';
import logoImage from '../../assets/images/logo.png';
import './LandingPage.css';

const LandingPage = () => {
  const [downloadCount] = useState(12547);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slider images data
  const sliderImages = [
    {
      url: slider1,
      title: "Hydroponic Farming Excellence",
      description: "Modern vertical farming systems for maximum yield"
    },
    {
      url: slider2,
      title: "Expert Training & Support",
      description: "Professional guidance for sustainable agriculture"
    },
    {
      url: slider4,
      title: "IoT-Powered Systems",
      description: "Smart sensors for optimal plant growth"
    },
    {
      url: slider5,
      title: "Healthy Fresh Produce",
      description: "Nutrient-rich vegetables grown sustainably"
    },
    {
      url: slider6,
      title: "Hands-On Learning",
      description: "Practical workshops and demonstrations"
    }
  ];

  // Auto-play slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [sliderImages.length]);

  // Navigation functions
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Function to scroll to download section
  const scrollToDownload = () => {
    const downloadSection = document.getElementById('download');
    if (downloadSection) {
      downloadSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };



  return (
    <div className="landing-page">
      

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src={logoImage} alt="Cropify Logo" className="logo-image" />
          </div>
            <div className="nav-links">
              <a href="https://plantboxinnovations.wordpress.com/" target="_blank" rel="noopener noreferrer">About Us</a>
              <a href="#features">Features</a>
              <a href="#contact">Contact Us</a>
            </div>
          <div className="nav-actions">
            <a href="#download" onClick={(e) => { e.preventDefault(); scrollToDownload(); }} className="download-nav-btn">Download</a>
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
                <img 
                  src={appMockupImage} 
                  alt="Cropify Mobile App Interface" 
                  className="app-screenshot"
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Slider Section */}
      <section className="image-slider-section">
        <div className="slider-header">
          <h2 className="slider-section-title">
            THE TEAM BEHIND <img src={cropifyTextLogo} alt="Cropify" className="cropify-text-logo" />
          </h2>
        </div>
        <div className="slider-container">
          <div className="slider-wrapper">
            {sliderImages.map((slide, index) => (
              <div
                key={index}
                className={`slide ${index === currentSlide ? 'active' : ''}`}
                style={{
                  backgroundImage: `url(${slide.url})`,
                  transform: `translateX(${(index - currentSlide) * 100}%)`,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <button className="slider-btn prev-btn" onClick={prevSlide} aria-label="Previous slide">
            <FaChevronLeft />
          </button>
          <button className="slider-btn next-btn" onClick={nextSlide} aria-label="Next slide">
            <FaChevronRight />
          </button>

          {/* Dot Indicators */}
          <div className="slider-dots">
            {sliderImages.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
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



      {/* CTA Section */}
      <section id="download" className="cta-section">
        <div className="container">
            <div className="cta-content">
              <h2 style={{ textAlign: 'center' }}>Ready to Start Your IoT-Powered Hydroponics Journey?</h2>
              <p style={{ textAlign: 'center' }}>Join thousands of farmers who are already using Cropify to grow better crops.</p>
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <a 
                  href="https://drive.google.com/uc?export=download&id=1fOjfl4jJvvwMbVeeSTN5ojNVsui9ipbj"
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
                  <FaMapMarkerAlt />
                  <span>Manila & Davao, Philippines</span>
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
