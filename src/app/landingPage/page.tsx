"use client";
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const landingPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          } else {
            if (document.body.contains(entry.target)) {
              entry.target.classList.remove(styles.visible);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    // Make a stable copy of refs for cleanup
    const refs = featureRefs.current.slice();
    refs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      refs.forEach((ref) => {
        if (ref && document.body.contains(ref)) {
          observer.unobserve(ref);
        }
      });
    };
  }, []);

  return (
    <div className={styles.landingPage} ref={landingPageRef}>
      <div className={styles.fadeOverlay}></div>
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <Image
            src="/images/tree.png"
            alt="Amenity Logo"
            width={280}
            height={280}
            className={styles.heroLogo}
          />
          <h1 className={styles.heroTitle}>Amenity</h1>
          <p className={styles.heroSubtitle}>Your daily companion for spiritual growth</p>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.featureContainer}>
          <div
            className={`${styles.featureItem} ${styles.featureLeft}`}
            ref={(el) => { featureRefs.current[0] = el; }}
          >
            <h2 className={`${styles.featureTitle} ${styles.readTitle}`}>Read.</h2>
            <p className={styles.featureText}>
              Start your day with a verse. Read the bible in peace. Save what resonates with you.
            </p>
          </div>

          <div
            className={`${styles.featureItem} ${styles.featureRight}`}
            ref={(el) => { featureRefs.current[1] = el; }}
          >
            <h2 className={`${styles.featureTitle} ${styles.growTitle}`}>Grow.</h2>
            <p className={styles.featureText}>
              Keep track of your spiritual journey. Remember your reflections. Mark your journey through a little sprout.
            </p>
          </div>

          <div
            className={`${styles.featureItem} ${styles.featureLeft}`}
            ref={(el) => { featureRefs.current[2] = el; }}
          >
            <h2 className={`${styles.featureTitle} ${styles.connectTitle}`}>Connect.</h2>
            <p className={styles.featureText}>
              Faith thrives in connection. Share insights and receive wisdom from the community.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <Link href="/loginPage" className={styles.ctaButton}>
            Sign Up to Proceed
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerLogo}>
            <div className={styles.footerLogoWrapper}>
              <Image
                src="/images/tree.png"
                alt="Amenity Logo"
                width={30}
                height={30}
                className={styles.footerLogoImg}
              />
              <span className={styles.footerBrandName}>Amenity</span>
            </div>
            <div className={styles.footerDeveloper}>
              Developers: JZML
            </div>
          </div>

          <div className={styles.footerContact}>
            <span className={styles.contactText}>Contact us:</span>
            <span className={styles.emailIcon}>✉️</span>
            <a href="mailto:amenity.web11@gmail.com">amenity.web11@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
