'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './HomePage.module.css';
import { useSession, signOut } from 'next-auth/react';
import supadata from '../lib/supabaseclient';
import {
  Archive,
  About,
  Bell,
  Bible,
  Bookmark,
  Calendar,
  Fire,
  Help,
  Home,
  Logout,
  Profile,
  Sun,
  Create,
  LOGO,
  Delete,
  UnArchive,
  Like,
  Dislike,
  Comments,
  Arrow,
  Fire as FireIcon,
  SaveChapIcon
} from '@/app/components/svgs'; // Adjust the import path as necessary
import { useRouter } from 'next/navigation';
import CreatePostModal from './CreatePostModal';
import EditProfileModal from './EditProfileModal';
import CommentSection from './CommentSection';
import PostInteractions from './PostInteractions';
import { useNotifications } from '../hooks/useNotifications';
import Image from 'next/image';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import FilteredSearchBar from '@/app/components/FilteredSearchBar';
import StreakPlant from '../components/StreakPlant';
import { getUserStreakAndHP } from '../lib/streakService';

dayjs.extend(utc);
dayjs.extend(timezone);

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  // --- Streak Plant State ---
  const [Stage, setStage] = useState<1 | 2 | 3 | 4>(1); // Default to stage 0

  useEffect(() => {
    if (!session?.user?.id) return;
    getUserStreakAndHP(session.user.id).then(data => {
      setStage(data?.Stage ?? 1);
    });
  }, [session]);

  // Notification hook
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();



  // State for profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // State for notification dropdown
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Reference to the dropdown containers
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Toggle profile dropdown
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotificationMenu(false); // Close notification menu when opening profile
  };

  // Toggle notification dropdown
  const toggleNotificationMenu = () => {
    setShowNotificationMenu(!showNotificationMenu);
    setShowProfileMenu(false); // Close profile menu when opening notifications
  };

  const biblePage = () => {
    router.push('/biblePage');
  }

  const goToHelp = () => {
    router.push('/helpPage');
  };

  const archivedPage = () => {
    router.push('/archivedPage');
  };

  const [verseOfTheDay, setVerseOfTheDay] = useState({ text: '', reference: '' });


  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10); // e.g., '2024-06-07'
    const stored = localStorage.getItem('verseOfTheDay');
    if (stored) {
      const { text, reference, date } = JSON.parse(stored);
      if (date === today) {
        setVerseOfTheDay({ text, reference });
        return;
      }
    }
    // If not found or not today, fetch new
    async function fetchRandomVerse() {
      try {
        const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
        const data = await res.json();
        if (data && data.length > 0) {
          setVerseOfTheDay({
            text: data[0].text,
            reference: `${data[0].bookname} ${data[0].chapter}:${data[0].verse}`,
          });
          localStorage.setItem(
            'verseOfTheDay',
            JSON.stringify({
              text: data[0].text,
              reference: `${data[0].bookname} ${data[0].chapter}:${data[0].verse}`,
              date: today,
            })
          );
        }
      } catch (err) {
        setVerseOfTheDay({
          text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
          reference: "John 3:16"
        });
      }
    }
    fetchRandomVerse();
  }, []);
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownRef, notificationDropdownRef]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [posts, setPosts] = useState<Array<{
    id: number;
    topic: string;
    content: string;
    image_url?: string;
    created_at: string;
    user_id: string;
  }>>([]);

  // Add state to track archived posts for the current user
  const [archivedPostIds, setArchivedPostIds] = useState<Set<number>>(new Set());
  const [archivedCount, setArchivedCount] = useState<number>(0);

  // Fetch archived posts for the current user
  useEffect(() => {
    const fetchArchivedPosts = async () => {
      if (!session?.user?.id) return;
      const { data, error } = await supadata
        .from('archived_posts')
        .select('id, post_id')
        .eq('user_id', session.user.id);
      if (!error && data) {
        setArchivedPostIds(new Set(data.map((row: any) => row.post_id)));
        setArchivedCount(data.length);
      }
    };
    fetchArchivedPosts();
  }, [session?.user?.id]);

  const [savedCount, setSavedCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [streakDone, setStreakDone] = useState(false);


  // Calculate time left until end of day
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const difference = endOfDay.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m left`);
        } else {
          setTimeLeft(`${minutes}m left`);
        }
      } else {
        setTimeLeft('0m left');
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every minute
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSavedCount = async () => {
      if (session?.user?.id) {
        const { count, error } = await supadata
          .from('bookmarking')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        if (!error && typeof count === 'number') {
          setSavedCount(count);
        }
      }
    };
    fetchSavedCount();
  }, [session]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supadata
        .from('Posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        setPosts(data || []);
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    if (timeLeft && session?.user?.id) {
    checkstreaks();
    }
  }, [session?.user?.id]);


  // Add handleDelete function
  const handleDelete = async (postId: number) => {
    const { error } = await supadata
      .from('Posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.log("Error: ", error);
      alert('Failed to delete post!');
    } else {
      setPosts(posts => posts.filter(post => post.id !== postId));
    }
  };

  const handleLogOut = async () => {
    try {
      await signOut({ callbackUrl: '/loginPage' });
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/loginPage');
    }
  };


  // Archive/unarchive logic
  const handleArchive = async (postId: number) => {
    if (!session?.user?.id) return;

    const postToArchive = posts.find(p => p.id === postId);
    if (!postToArchive) return;

    if (archivedPostIds.has(postId)) {
      // Unarchive
      const { error } = await supadata
        .from('archived_posts')
        .delete()
        .eq('user_id', session.user.id)
        .eq('post_id', postId);
      if (!error) {
        setArchivedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setArchivedCount(prev => prev - 1);
      }
    } else {
      // Archive
      console.log("user: ", session.user.id);
      const { error } = await supadata
        .from('archived_posts')
        .insert([{
          user_id: session.user.id,
          post_id: postId,
          title: postToArchive.topic,
          created_at: new Date().toISOString()
        }]);

      if (!error) {
        setArchivedPostIds(prev => new Set(prev).add(postId));
        setArchivedCount(prev => prev + 1);
      }
    }
  };

  const checkstreaks = async () => {
    if (!session?.user?.id) return;

    const today = dayjs().format('YYYY-MM-DD');

    const { data: streak, error } = await supadata
      .from('streaks_input')
      .select('date')
      .eq('user_id', session.user.id)
      .single();

    if (error || !streak) {
      setStreakDone(false);
    } else {
      const lastActiveDate = dayjs(streak.date).format('YYYY-MM-DD');
      setStreakDone(lastActiveDate === today);
    }

    if (!streak || streak.date !== today) {
      // Check if notification already exists for today
      const { data: existingNotif, error: notifError } = await supadata
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('type', 'bible_reminder')
        .gte('created_at', dayjs().startOf('day').toISOString());

      if (!notifError && (!existingNotif || existingNotif.length === 0)) {
        // Insert new notification
        const message = `📖 You have ${timeLeft || 'a few hours'} left to complete your daily Bible reading.`;
        await supadata
          .from('notifications')
          .insert([{
            user_id: session.user.id,
            message: message,
            type: 'bible_reminder',
            is_read: false,
            created_at: new Date().toISOString(),
          }]);
      }
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Add state for mobile sidebar popouts
  const [openSide, setOpenSide] = useState<'left' | 'right' | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenSide = (side: 'left' | 'right') => {
    setOpenSide(prev => (prev === side ? null : side));
  };
  const handleCloseOverlay = () => setOpenSide(null);

  // Add state for streak modal
  const [showStreakModal, setShowStreakModal] = useState(false);

  return (

    <div className={styles.body}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          {/* Hamburger menu for mobile */}
          {isMobile && (
            <button
              className={styles.hamburgerMenu}
              aria-label={openSide === 'left' ? 'Close Menu' : 'Open Menu'}
              onClick={() => handleOpenSide('left')}
              style={{ position: 'absolute', left: 10, top: 18, zIndex: 1001, background: 'none', border: 'none', display: isMobile ? 'block' : 'none' }}
            >
              {openSide === 'left' ? (
                <span>&#10005;</span> // X icon
              ) : (
                <span>&#9776;</span> // Hamburger icon
              )}
            </button>
          )}
          <div className={styles.headerLeft} style={isMobile ? { justifyContent: 'center', width: '100%' } : {}}>
            <LOGO style={{ width: 100, height: 100 }} />
            <h3 className="headingMedium" style={{ fontFamily: "'Segoe Script', cursive" }}>Amenity</h3>
          </div>
          <div className={styles.headerMid}>
            <FilteredSearchBar
              filterLabel="Home"
              placeholder="Search posts"
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onDelete={() => {
                setSearchQuery('');
              }}
              showFilterChip={false} // Hide filter chip for Home page
            />
          </div>

          <div className={styles.headerRight}>
            {/* Notification Icon with Dropdown */}
            <div className={styles.notificationContainer} ref={notificationDropdownRef}>
              <span
                className={styles.headerIcon}
                onClick={toggleNotificationMenu}
              >
                <Bell />
                {unreadCount > 0 && (
                  <div className={styles.notificationBadge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </span>

              {/* Notification Dropdown Menu */}
              {showNotificationMenu && (
                <div className={styles.notificationDropdown}>
                  {/* Header */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <h3 style={{
                      color: '#f5f0e9',
                      fontSize: '1rem',
                      fontWeight: '600',
                      margin: 0
                    }}>
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllAsRead();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ffe8a3',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '2rem 1.25rem',
                        textAlign: 'center',
                        color: '#8b9cb3'
                      }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: notification.is_read ? '#1d2a44' : '#223456',
                            cursor: 'pointer'
                          }}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <p style={{ margin: 0, color: '#ffe8a3' }}>{notification.message}</p>
                          <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                            {dayjs(notification.created_at).tz('Asia/Manila').format('MMM D, YYYY h:mm A')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bible Time Left Footer */}


                </div>
              )}
            </div>

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
                  <div className={styles.dropdownItem} onClick={() => { setShowEditProfileModal(true); setShowProfileMenu(false); }}>
                    <span><Profile /></span>
                    <span>View Profile</span>
                  </div>
                  <div className={styles.dropdownItem}
                    onClick={handleLogOut}>
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
          {/* Left Navigation Panel */}
          {(!isMobile || openSide === 'left') && (
            <div
              className={styles.mainLeft + (isMobile && openSide === 'left' ? ' ' + styles.mobileSidebar : '')}
              style={isMobile ? { position: 'fixed', top: 0, left: 0, height: '100vh', width: '80vw', background: '#1e2b48', zIndex: 1000, boxShadow: '2px 0 8px rgba(0,0,0,0.2)' } : {}}
            >
              <div className={styles.mainLeftUp}>
                <div className={styles.navItem}>
                  <div className={styles.navIcon}><Home /></div>
                  <span className={styles.navText}>Home</span>
                </div>

              <button className={styles.navItem} onClick={() => router.push('/PopularPage')}>
                <div className={styles.navIcon}><Fire /></div>
                <span className={styles.navText}>Popular</span>
              </button>

                <button className={styles.navItem} onClick={biblePage}>
                  <div className={styles.navIcon}><Bible /></div>
                  <span className={styles.navText}>Bible</span>
                </button>
              </div>

              <div className={styles.mainLeftBottom}>
                <button className={styles.navItem} onClick={() => router.push('/aboutPage')}>
                  <div className={styles.navIcon}><About /></div>
                  <span className={styles.navText}>About</span>
                </button>

                <button className={styles.navItem} onClick={goToHelp}>
                  <div className={styles.navIcon}><Help /></div>
                  <span className={styles.navText}>Help</span>
                </button>
              </div>
            </div>
          )}
          {/* Overlay for mobile popout */}
          {isMobile && openSide && (
            <div onClick={handleCloseOverlay} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />
          )}
          {/* Middle Content Area - Now Scrollable */}
          <div className={styles.mainMid}>
            {/* Verse of the Day */}
            <div className={styles.verseContainer}>
              <h2 className={styles.headingLargeVerse}>VERSE OF THE DAY</h2>
              <p className="paragraph">&ldquo;{verseOfTheDay.text}&rdquo; - {verseOfTheDay.reference}</p>
            </div>

            {/* Card Container */}
            <div className={styles.cardContainer}>
              <div className={styles.card} tabIndex={0} role="button" onClick={archivedPage}>
                <div className={styles.cardIcon}>
                  <Archive />
                </div>
                <h3 className={styles.cardTitle}>Archives</h3>
                <p className={styles.cardInfo}>Post Archive</p>
                <p className={styles.cardInfo}>{archivedCount} entries</p>
              </div>

              <div className={styles.card} tabIndex={0} role="button"
                onClick={() => {
                  localStorage.setItem('biblePageActiveView', 'saveChapter');
                  router.push('/biblePage');
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.cardIcon}>
                  <Bookmark />
                </div>
                <h3 className={styles.cardTitle}>Saved</h3>
                <p className={styles.cardInfo}>Saved Chapters</p>
                <p className={styles.cardInfo}>{savedCount} Chapters</p>
              </div>

              <div className={styles.card} tabIndex={0} role="button"
                onClick={() => {
                  localStorage.setItem('biblePageActiveView', 'daily');
                  router.push('/biblePage');
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.cardIcon}>
                  <Calendar />
                </div>
                <h3 className={styles.cardTitle}>Daily Readings</h3>
                <p className={styles.cardInfo}>Today&apos;s Quest</p>
                <p className={styles.cardInfo}>
                  {streakDone ? '✅ Done' : timeLeft}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '3rem', marginBottom: '3rem' }}>
              <h2 className="headingMedium" style={{ marginBottom: '1.5rem' }}>See what&apos;s going on...</h2>
              <div style={{
                backgroundColor: '#1E2B48',
                padding: '1.75rem',
                borderRadius: '12px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
              }}>

                <div>
                  {posts
                    .filter(post => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        post.topic.toLowerCase().includes(q) ||
                        post.content.toLowerCase().includes(q)
                      );
                    })
                    .map(post => (
                      <div key={post.id} style={{ border: '1px solid #333', margin: '1rem 0', padding: '1rem', borderRadius: '12px', background: '#112244', position: 'relative' }}>
                        {/* Archive button, always at top right, left of delete if owner */}
                        <button
                          onClick={() => handleArchive(post.id)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: post.user_id === session?.user?.id ? 50 : 10,
                            cursor: 'pointer',
                            color: archivedPostIds.has(post.id) ? '#ffe8a3' : '#aaa',
                            fontSize: '1.5rem',
                            margin: 4,
                            zIndex: 1
                          }}
                          title={archivedPostIds.has(post.id) ? 'Unarchive post' : 'Archive post'}
                        >
                          {archivedPostIds.has(post.id) ? <Archive /> : <UnArchive />}
                        </button>


                        {/* Delete button, only for post owner */}
                        {post.user_id === session?.user?.id && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            style={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'red',
                              fontSize: '1.5rem',
                              zIndex: 2
                            }}
                            title="Delete post"
                          >
                            <Delete />
                          </button>
                        )}
                        <div>
                          <strong>{post.topic}</strong> | {formatDate(post.created_at)}
                        </div>
                        <div>{post.content}</div>
                        {post.image_url && (
                          <Image
                            src={post.image_url}
                            alt="Post image"
                            width={0}
                            height={0}
                            sizes="100vw"
                            style={{ width: '100%', height: 'auto', marginTop: '1rem', borderRadius: '8px' }}
                          />
                        )}
                        <PostInteractions postId={post.id} currentUserId={session?.user?.id || ''} />
                        <CommentSection postId={post.id} currentUserId={session?.user?.id || ''} />
                      </div>
                    ))}
                </div>

              </div>
              <button
                className={styles.CreateButton}
                aria-label="Create Post"
                style={{ fontSize: '1.5rem', marginTop: '1.5rem' }}
                onClick={() => setShowCreateModal(true)}
              >
                <Create />
              </button>
            </div>
            {/* Modal for creating a post */}
            <CreatePostModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              username={session?.user?.name || ""}
            />
          </div>

          {/* Right Section (Streak Plant) */}
          {(!isMobile || openSide === 'right') && (
            <div
              className={styles.mainRight + (isMobile && openSide === 'right' ? ' ' + styles.mobileSidebar : '')}
              style={isMobile ? { position: 'fixed', top: 0, right: 0, height: '100vh', width: '80vw', background: '#1e2b48', zIndex: 1000, boxShadow: '-2px 0 8px rgba(0,0,0,0.2)' } : {}}
            >
              <div className={styles.rightContainer}>
                <h3 className="headingMedium">Streak Plant!</h3>
                {/* Glass Bell Component */}
                <div className={styles.glassBellContainer}>
                  <div className={styles.bellBase}></div>
                  <div className={styles.bellShadow}></div>
                  <div className={styles.streakPlantInBell}>
                    <StreakPlant stage={Stage} />
                  </div>
                  <div className={styles.glassBell} style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                    <div className={styles.bellTop}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Floating Streak Button for mobile */}
          {isMobile && (
            <>
              <button
                className={styles.fabStreak}
                aria-label="Open Streak Plant"
                onClick={() => setShowStreakModal(true)}
              >
                <span role="img" aria-label="Streak Plant">🌱</span>
              </button>
              {showStreakModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 2000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    background: '#1e2b48',
                    borderRadius: '18px',
                    padding: '2rem 1.5rem 1.5rem 1.5rem',
                    position: 'relative',
                    minWidth: '320px',
                    maxWidth: '90vw',
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <button
                      onClick={() => setShowStreakModal(false)}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 16,
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        fontSize: 32,
                        cursor: 'pointer',
                        zIndex: 10,
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                    <h2 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Streak Plant!</h2>
                    <div className={styles.glassBellContainer}>
                      <div className={styles.glassBell}></div>
                      <div className={styles.bellShadow}></div>
                      <div className={styles.bellBase}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
      {/* Modal for creating a post */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        username={session?.user?.name || ""}
      />
    </div>
  );
}
