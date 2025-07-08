'use client';
import React, { useState, useRef, useEffect } from 'react';
import styles from './AboutPage.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  About,
  Bell,
  Bible,
  Fire,
  Help,
  Home,
  Logout,
  Profile,
  Sun,
  LOGO,
  Comments
} from '@/app/components/svgs';
import { signOut } from 'next-auth/react';

export default function AboutPage() {
  const router = useRouter();

  // State for profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Reference to the dropdown container
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Toggle profile dropdown
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const goToHome = () => {
    router.push('/homePage');
  };

  const biblePage = () => {
    router.push('/biblePage');
  };

  const goToHelp = () => {
    router.push('/helpPage');
  };

  // --- Burger menu state ---
  const [openSide, setOpenSide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const handleOpenSide = () => setOpenSide(true);
  const handleCloseOverlay = () => setOpenSide(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownRef]);

  // Fade-in and fade-out on scroll logic
  useEffect(() => {
    const elements = document.querySelectorAll('.' + styles.fadeInOnScroll);
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            entry.target.classList.remove(styles.fadeOut);
          } else {
            entry.target.classList.remove(styles.visible);
            entry.target.classList.add(styles.fadeOut);
          }
        });
      },
      { threshold: 0.15 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className={styles.body}>
      {/* Header Section - Reused from HomePage */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          {/* Hamburger menu for mobile (only hamburger, no X here) */}
          {isMobile && !openSide && (
            <button
              className={styles.hamburgerMenu}
              aria-label="Open Menu"
              onClick={handleOpenSide}
              style={{ position: 'absolute', left: 10, top: 18, zIndex: 1001, background: 'none', border: 'none', display: isMobile ? 'block' : 'none' }}
            >
              <span>&#9776;</span> {/* Hamburger icon */}
            </button>
          )}
          <div className={styles.headerLeft}>
            <LOGO style={{ width: 100, height: 100 }} />
            <h3 className="headingMedium" style={{ fontFamily: "'Segoe Script', cursive" }}>Amenity</h3>
          </div>

          <div className={styles.headerRight}>
            {/* Notification Icon */}
            <span className={styles.headerIcon}><Bell /> </span>

            {/* Profile Icon with Dropdown */}
            <div className={styles.profileContainer} ref={profileDropdownRef}>
              <span
                className={styles.headerIcon}
                onClick={toggleProfileMenu}
              >
                <Profile />
              </span>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownItem}>
                    <span><Profile /></span>
                    <span>View Profile</span>
                  </div>
                  <div className={styles.dropdownItem}
                    onClick={() => signOut({ callbackUrl: "/loginPage" })}>
                    <span><Logout /></span>
                    <span>Log Out</span>
                  </div>
                  <div className={styles.dropdownItem}>
                    <span><Sun /></span>
                    <span>Light Mode</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Section */}
      <main className={styles.main}>
        <div className={styles.mainContainer}>
          {/* Sidebar for desktop, or for mobile if openSide is true */}
          {(!isMobile || openSide) && (
            <div
              className={styles.mainLeft}
              style={isMobile ? { position: 'fixed', top: 0, left: 0, height: '100vh', width: '80vw', background: '#1e2b48', zIndex: 1000, boxShadow: '2px 0 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 0 } : {}}
            >
              {/* Close button for mobile sidebar */}
              {isMobile && (
                <button
                  onClick={handleCloseOverlay}
                  aria-label="Close Menu"
                  style={{
                    position: 'absolute',
                    top: 18,
                    left: 18,
                    zIndex: 1100,
                    background: 'none',
                    border: 'none',
                    fontSize: '2rem',
                    color: '#FFE8A3',
                    cursor: 'pointer',
                  }}
                >
                  &#10005;
                </button>
              )}
              {/* Top nav items */}
              <div style={{ marginTop: isMobile ? '3.5rem' : 0 }}>
                <div className={styles.navItem} style={{ color: '#FFE8A3' }} onClick={goToHome}>
                  <div className={styles.navIcon} style={{ color: '#FFE8A3' }}><Home /></div>
                  <span className={styles.navText}>Home</span>
                </div>
                <div className={styles.navItem} onClick={() => router.push('/PopularPage')}>
                  <div className={styles.navIcon}><Fire /></div>
                  <span className={styles.navText}>Popular</span>
                </div>
                <button className={styles.navItem} style={{ color: '#FFE8A3', background: 'none', border: 'none', textAlign: 'left', width: '100%' }} onClick={biblePage}>
                  <div className={styles.navIcon} style={{ color: '#FFE8A3' }}><Bible /></div>
                  <span className={styles.navText}>Bible</span>
                </button>
              </div>
              {/* Bottom nav items */}
              <div style={{ marginBottom: isMobile ? '2.5rem' : 0 }}>
                <button className={styles.navItem} style={{ color: '#FFE8A3', background: 'none', border: 'none', textAlign: 'left', width: '100%' }}>
                  <div className={styles.navIcon} style={{ color: '#FFE8A3' }}><About /></div>
                  <span className={styles.navText}>About</span>
                </button>
                <button className={styles.navItem} style={{ color: '#FFE8A3', background: 'none', border: 'none', textAlign: 'left', width: '100%' }} onClick={goToHelp}>
                  <div className={styles.navIcon} style={{ color: '#FFE8A3' }}><Help /></div>
                  <span className={styles.navText}>Help</span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay for mobile popout */}
          {isMobile && openSide && (
            <div onClick={handleCloseOverlay} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />
          )}

          {/* Right Box - Main About Content with Splash Background */}
          <div className={styles.rightBox}>
            {/* Gradient overlay for smooth scrolling effect */}
            <div className={styles.scrollGradient}></div>

            {/* Content wrapper to keep content above background layers */}
            <div className={styles.contentWrapper}>
              {/* Splash Section */}
              <section className={styles.splashSection}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Image
                    src="/images/tree.png"
                    alt="Amenity Logo"
                    width={400}
                    height={0}
                    className={styles.logoImage}
                    style={{ height: 'auto' }}
                    priority
                  />
                  <h1 className={styles.brandName}>Amenity</h1>
                </div>
              </section>

              {/* About Us Section */}
              <section className={`${styles.contentSection} ${styles.fadeInOnScroll}`}>
                <div className={styles.sectionLeft}>
                  <h2 className={styles.sectionTitle}>About us!</h2>
                  <p className={styles.sectionText}>
                    Welcome to JZML! We&apos;re a team of aspiring developers, and this website is our hands-on project to learn and grow. We&apos;re putting our best effort into making it a polished and presentable experience as we expand our skills.


                  </p>
                </div>
                <div className={styles.sectionRight}>
                  <Image
                    src="/images/AboutUs.jpg"
                    alt="Team working together"
                    width={350}
                    height={250}
                    className={styles.sectionImage}
                  />
                </div>
              </section>

              {/* Why Amenity Section */}
              <section className={`${styles.contentSection} ${styles.fadeInOnScroll}`}>
                <div className={styles.sectionRight}>
                  <Image
                    src="/images/WhyAmenity.jpg"
                    alt="People in community"
                    width={350}
                    height={250}
                    className={styles.sectionImage}
                  />
                </div>
                <div className={styles.sectionLeft}>
                  <h2 className={styles.sectionTitle}>Why Amenity?</h2>
                  <p className={styles.sectionText}>
                    Amenity is a peaceful online space where people can reconnect with God and share their thoughts—whether it&apos;s a confession, a burden, or simply a good day—while receiving support, prayers, or advice from a kind and understanding community. As students, we wanted to build something meaningful that helps others feel heard and spiritually supported. We believe that faith and connection shouldn&apos;t be limited by distance, so Amenity bridges that gap by creating a safe space for people to grow, heal, and connect with both God and others.



                  </p>
                </div>
              </section>

              {/* Our Story Section */}
              <section className={`${styles.contentSection} ${styles.fadeInOnScroll}`}>
                <div className={styles.sectionLeft}>
                  <h2 className={styles.sectionTitle}>Our Story!</h2>
                  <p className={styles.sectionText}>
                    Building Amenity was our first big project—and it wasn&apos;t easy. With just a month to finish it, we learned while coding, faced many bugs, and grew through the process.<br />
                    Wilfred Justin Peteros led as project manager and full-stack developer. Louielyn Abella handled UI/UX and frontend, Mary Claire worked full-stack, and Joram Zhient Entice managed the backend and database. Despite the challenges, we&apos;re proud of what we built together.
                  </p>
                </div>
                <div className={styles.sectionRight}>
                  <Image
                    src="/images/JZML.jpg"
                    alt="Team photo"
                    width={350}
                    height={250}
                    className={styles.sectionImage}
                  />
                </div>
              </section>

              {/* Contact Section */}
              <section className={`${styles.contactSection} ${styles.fadeInOnScroll}`}>
                <div className={styles.footerRow}>
                  <div className={styles.footerColLeft}>
                    <div className={styles.footerLeftStack}>
                      <span className={styles.footerContactLabel}>Contact Us:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={styles.emailIcon} style={{ color: '#FFE8A3' }}><Comments /></span>
                        <a href="mailto:amenity.web11@gmail.com">amenity.web11@gmail.com</a>
                      </div>
                    </div>
                  </div>
                  <div className={styles.footerColCenter}>
                    <div className={styles.footerSeparator}></div>
                  </div>
                  <div className={styles.footerColRight}>
                    <div className={styles.footerRightStack}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Image
                          src="/images/tree.png"
                          alt="Amenity Logo"
                          width={45}
                          height={45}
                          className={styles.footerLogoImg}
                        />
                        <span className={styles.footerBrandName}>Amenity</span>
                      </div>
                      <span className={styles.footerBy}>By: J2ML</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
