'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BiblePage.module.css';
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
  SaveChapIcon,
  Bookmark,
  LOGO,
  Plus,
} from '@/app/components/svgs';
import { useRouter } from 'next/navigation';
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import BibleDisplay from '../bibleAPI/BibleDisplay';
import NotificationItem from '../components/NotificationItem';
import { useNotifications } from '../hooks/useNotifications';
import supadata from '../lib/supabaseclient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import FilteredSearchBar from '@/app/components/FilteredSearchBar';
import StreakPlant from '../components/StreakPlant';
import { getUserStreakAndHP, finishReading } from '../lib/streakService';

dayjs.extend(utc);
dayjs.extend(timezone);

const bibleBooks: Record<string, number> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
};

// Helper: Deterministic random number generator (seeded)
function mulberry32(a: number): () => number {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Helper: Get daily chapters
function getDailyChapters(
  chapterCounts: Record<string, number>,
  numChapters = 3
): { book: string; chapter: number }[] {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rand = mulberry32(seed);
  const books = Object.keys(chapterCounts);
  const selected: { book: string; chapter: number }[] = [];
  const usedBooks = new Set<string>();
  while (selected.length < numChapters && usedBooks.size < books.length) {
    const bookIdx = Math.floor(rand() * books.length);
    const book = books[bookIdx];
    if (usedBooks.has(book)) continue;
    usedBooks.add(book);
    const maxChapter = chapterCounts[book];
    const chapter = Math.floor(rand() * maxChapter) + 1;
    selected.push({ book, chapter });
  }
  return selected;
}

// Component to fetch and display a single chapter
interface DailyChapterProps {
  book: string;
  chapter: number;
}
interface Verse {
  chapter: number;
  verse: number;
  text: string;
}
function DailyChapter({ book, chapter }: DailyChapterProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => setVerses(data.verses || []))
      .catch(err => setError('Failed to fetch Bible data. Please try again later.'))
      .finally(() => setLoading(false));
  }, [book, chapter]);
  if (loading) return <p className="paragraph">Loading {book} {chapter}...</p>;
  if (error) return <p className="paragraph" style={{ color: 'salmon' }}>{error}</p>;
  if (!verses.length) return <p className="paragraph">No data available for {book} {chapter}.</p>;
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>{book} Chapter {chapter}</h3>
      <p className="paragraph">
        {verses.map(v => (
          <span key={v.verse}><sup>{v.verse}</sup> {v.text} </span>
        ))}
      </p>
    </div>
  );
}
async function addbookmark(book: string, Chapter: number, userid: string): Promise<boolean> {

  const updatedAt = new Date().toISOString();



  const { data, error } = await supadata
    .from('bookmarking')
    .insert([
      {
        Book_name: book,
        chapter_number: Chapter,
        user_id: userid,
        saved_at: updatedAt
      }

    ])


  if (error) {
    console.log("Sending insert:", {
      Book_name: book,
      chapter_number: Chapter,
      user_id: userid,
      saved_at: updatedAt
    });
    console.log("Insert failed (full error):");
    console.dir(error, { depth: null });
    return false;
  }
  console.log('Insert success:', data);
  return true;

}




export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Notification hook
  const { 
    notifications, 
    unreadCount, 
    bibleTimeLeft, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  
  // State for profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // State for notification dropdown
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState("Genesis");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);

  // Reference to the dropdown containers
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const [activeView, setActiveView] = useState<'bible' | 'daily' | 'book' | 'saveChapter'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('biblePageActiveView');
      if (stored === 'saveChapter') {
        localStorage.removeItem('biblePageActiveView');
        return 'saveChapter';
      }
      if (stored === 'daily') {
        localStorage.removeItem('biblePageActiveView');
        return 'daily';
      }
    }
    return 'bible';
  });
  const dailyChapters = getDailyChapters(bibleBooks, 3);
  const [savedChapters, setSavedChapters] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<{ [id: number]: { loading: boolean, verses: any[] } }>({});
  const [searchSavedChapters, setSearchSavedChapters] = useState('');

  // --- Streak Plant State ---
  const [Stage, setStage] = useState<1 | 2 | 3 | 4>(1); // Default to stage 0

useEffect(() => {
  if (!session?.user?.id) return;
  getUserStreakAndHP(session.user.id).then(data => {
    setStage(data?.Stage ?? 1);
  });
}, [session]);

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

  const handleBibleClick = () => {
    setActiveView('bible');
  };

  const handleBookClick = (book: string, chapter?: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter || 1);
    setActiveView('bible');
  };

  const handleDailyClick = () => {
    setActiveView('daily');
  };

  const handleSavedChapterClick = () => {
    setActiveView('saveChapter');
  }

  const homePage = () => {
    router.push('/homePage');
  }

  const handleLogOut = async () => {
    try {
      await signOut({ callbackUrl: '/loginPage' });
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/loginPage');
    }
  };

  const goToHelp = () => {
    router.push('/helpPage');
  };

  

const Popularpage = () => {

    router.push('PopularPage');

  }

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
  const handleBookmark = async (book: string, chapter: number, username: string) => {
    const success = await addbookmark(book, chapter, username)
    if (success) {
      console.log("Successful!");
      alert("Bookmarked: " + book + chapter)
    } else {

      alert("Failed!")

    }
  };

  // Fetch saved chapters/bookmarks when activeView changes to 'saveChapter'
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (activeView === 'saveChapter' && session?.user?.id) {
        setLoadingSaved(true);
        const { data, error } = await supadata
          .from('bookmarking')
          .select('*')
          .eq('user_id', session.user.id)
          .order('saved_at', { ascending: false });
        if (!error) setSavedChapters(data || []);
        setLoadingSaved(false);
      }
    };
    fetchBookmarks();
  }, [activeView, session]);

  // Delete a bookmark
  const handleDeleteBookmark = async (id: number) => {
    const { error } = await supadata.from('bookmarking').delete().eq('id', id);
    if (!error) {
      setSavedChapters((prev) => prev.filter((item) => item.id !== id));
    } else {
      alert('Failed to delete bookmark. Please try again.');
    }
  };

  // Toggle expand/collapse and fetch content if needed
  const handleToggleExpand = async (item: any) => {
    setExpandedChapters((prev) => {
      if (prev[item.id]) {
        // Collapse if already expanded
        const { [item.id]: _, ...rest } = prev;
        return rest;
      } else {
        // Expand and fetch content
        return { ...prev, [item.id]: { loading: true, verses: [] } };
      }
    });
    if (!expandedChapters[item.id]) {
      // Fetch verses
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(item.Book_name)}+${item.chapter_number}`);
      const data = await res.json();
      setExpandedChapters((prev) => ({
        ...prev,
        [item.id]: { loading: false, verses: data.verses || [] }
      }));
    }
  };

 const handleStreaks = async (userId: string) => {
  const today = dayjs().format('YYYY-MM-DD'); // Local date string

  // 1. Fetch the user's streak
  const { data: streak, error } = await supadata
    .from('streaks_input')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching streak:', error.message);
    return;
  }

  if (!streak) {
    // 2. No streak yet — insert new
    const { error: insertError } = await supadata.from('streaks_input').insert({
      user_id: userId,
      streaknum: 1,
      date: today,
    });

    if (insertError) {
      console.error('Error inserting streak:', insertError.message);
    } else {
      console.log('New streak started for user:', userId);
    }

    return;
  }

  const lastActiveDate = dayjs(streak.date).format('YYYY-MM-DD');

  // 3. If already updated today, do nothing
  if (lastActiveDate === today) {
    console.log('Streak already updated today.');
    return;
  }

  // 4. Determine if streak should continue or reset
  const isYesterday =
    dayjs(streak.date).add(1, 'day').format('YYYY-MM-DD') === today;

  const newCount = isYesterday ? streak.streaknum + 1 : 1;

  // 5. Update streak
  const { error: updateError } = await supadata
    .from('streaks_input')
    .update({
      streaknum: newCount,
      date: today,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating streak:', updateError.message);
  } else {
    console.log(`Streak ${isYesterday ? 'continued' : 'reset'} for user:`, userId);
  }
};

const [isMobile, setIsMobile] = useState(false);
const [openSide, setOpenSide] = useState<'left' | 'right' | null>(null);

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

const [showBookDropdown, setShowBookDropdown] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);

// Close dropdown when clicking outside
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowBookDropdown(false);
    }
  }
  if (showBookDropdown) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showBookDropdown]);

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
              {openSide === 'left' ? null : (
                <span>&#9776;</span> // Hamburger icon
              )}
            </button>
          )}
          <div className={styles.headerLeft} style={isMobile ? { justifyContent: 'center', width: '100%' } : {}}>
            <LOGO style={{ width: 100, height: 100 }} /><h3 className="headingMedium" style={{ fontFamily: "'Segoe Script', cursive" }}>Amenity</h3>
          </div>

          <div className={styles.headerMid}>
            <div className={styles.searchContainer}>
              {activeView === 'saveChapter' && (
                <FilteredSearchBar
                  filterLabel="Saved Chapters"
                  placeholder="Search in Saved Chapters..."
                  searchQuery={searchSavedChapters}
                  setSearchQuery={setSearchSavedChapters}
                  onDelete={() => setSearchSavedChapters('')}
                  showFilterChip={true}
                />
              )}
            </div>
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
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                        />
                      ))
                    )}
                  </div>
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
                  <div className={styles.dropdownItem}>
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
          {/* Mobile: show/hide left nav as sidebar, floating streak button */}
          {isMobile && openSide && (
            <div onClick={handleCloseOverlay} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />
          )}
          {isMobile && openSide === 'left' && (
            <div
              className={styles.mainLeft + ' ' + styles.mobileSidebar}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                width: '80vw',
                background: '#1e2b48',
                zIndex: 1000,
                boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              {/* Close button */}
              <button
                onClick={handleCloseOverlay}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFE8A3',
                  fontSize: '2rem',
                  position: 'absolute',
                  left: 16,
                  top: 16,
                  zIndex: 1001,
                  cursor: 'pointer'
                }}
                aria-label="Close Menu"
              >
                &#10005;
              </button>
              <div style={{ marginTop: '3.5rem' }}>
                <button className={styles.navItem} onClick={homePage}>
                  <div className={styles.navIcon}><Home /></div>
                  <span className={styles.navText}>Home</span>
                </button>
                <button className={styles.navItem} onClick={Popularpage}>
                  <div className={styles.navIcon}><Fire /></div>
                  <span className={styles.navText}>Popular</span>
                </button>
                <button className={styles.navItem} onClick={handleBibleClick}>
                  <div className={styles.navIcon}><Bible /></div>
                  <span className={styles.navText}>Bible</span>
                </button>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <button className={styles.navItem}>
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
          {!isMobile && (
          <div className={styles.mainLeft}>
            <div className={styles.mainLeftUp}>
              <button className={styles.navItem} onClick={homePage}>
                <div className={styles.navIcon}><Home /></div>
                <span className={styles.navText}>Home</span>
              </button>
              <div className={styles.navItem} onClick={Popularpage}>
                <div className={styles.navIcon}><Fire /></div>
                <span className={styles.navText}>Popular</span>
              </div>
              <div className={styles.navItem}>
                <div className={styles.navIcon}><Bible /></div>
                <span className={styles.navText}>Bible</span>
              </div>
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
          {/* Middle Content Area - Now Scrollable */}
          <div className={styles.mainMid}>
            <div className={styles.navContainer}>
              <div className={styles.navLeft}>
                <button className={`${styles.navBibleOp} ${activeView === 'bible' || activeView === 'book' ? styles.active : ''}`} onClick={handleBibleClick}>
                  <span className={styles.navText}>Bible</span>
                </button>
                <button className={`${styles.navBibleOp} ${activeView === 'daily' ? styles.active : ''}`} onClick={handleDailyClick}>
                  <span className={styles.navText}>Daily Reading</span>
                </button>
                <button className={`${styles.navBibleOpSavedChapter} ${activeView === 'saveChapter' ? styles.active : ''}`} onClick={handleSavedChapterClick}>
                  <span className={styles.navText}>Saved Chapters</span>
                  <div className={styles.navIcon}><SaveChapIcon /></div>
                </button>
                <div className={styles.dropdown} ref={dropdownRef}>
                  <button
                    className={styles.navBibleOp}
                    onClick={e => {
                      if (isMobile) {
                        e.stopPropagation();
                        setShowBookDropdown(prev => !prev);
                      }
                    }}
                    type="button"
                  >
                    <span className={styles.navText}>Book ▾</span>
                  </button>
                  <div
                    className={styles.dropdownMenu}
                    style={{
                      display: isMobile ? (showBookDropdown ? 'block' : 'none') : undefined
                    }}
                  >
                    {Object.keys(bibleBooks).map((book) => (
                      <div
                        key={book}
                        className={styles.dropdownItem}
                        onMouseEnter={() => { if (!isMobile) setHoveredBook(book); }}
                        onMouseLeave={() => { if (!isMobile) setHoveredBook(null); }}
                        onClick={() => {
                          if (isMobile) setHoveredBook(book);
                        }}
                        style={{ position: 'relative', display: 'block' }}
                      >
                        <div style={{ fontWeight: hoveredBook === book ? 'bold' : 'normal' }}>{book}</div>
                        {hoveredBook === book && (
                          <div className={styles.chapterGrid} style={{ marginTop: '0.5rem' }}>
                            {Array.from({ length: bibleBooks[book] }, (_, i) => i + 1).map((chapter) => (
                              <div
                                key={chapter}
                                className={`${styles.chapterItem} ${selectedBook === book && selectedChapter === chapter ? styles.selectedChapter : ''}`}
                                onClick={() => {
                                  handleBookClick(book, chapter);
                                  setHoveredBook(null);
                                  setShowBookDropdown(false); // Close dropdown after selection
                                }}
                              >
                                {chapter}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {activeView !== 'daily' && activeView !== 'saveChapter' && (
                  <button className={styles.bookmarkbutton} onClick={() => handleBookmark(selectedBook, selectedChapter, session!.user!.id)}>
                    <div className={styles.navIcon}><Bookmark /></div>
                  </button>
                )}
              </div>
            </div>
            {/* Verse of the Day */}
            <div className={styles.verseContainer}>
              {activeView === 'bible' && (
                <>
                  <h2 className="headingLarge">BIBLE</h2>

                  <BibleDisplay selectedBook={selectedBook} selectedChapter={selectedChapter} />

                </>

              )}
              {activeView === 'daily' && (
                <>
                  <h2 className="headingLarge">Daily Reading</h2>
                  {dailyChapters.map(({ book, chapter }) => (
                    <DailyChapter key={book + chapter} book={book} chapter={chapter} />
                  ))}
<button className={styles.finishReadingBtn} onClick={async () => {
  if (session?.user?.id) {
    await finishReading(session.user.id);
    const data = await getUserStreakAndHP(session.user.id);
    setStage(data?.Stage ?? 1);
  }
}}>
  Finish Reading
</button>

                </>
              )}
              {activeView === 'saveChapter' && (
                <>
                  <h2 className={styles.headingLarge}>Saved Chapters</h2>
                  {loadingSaved ? (
                    <p>Loading...</p>
                  ) : savedChapters.length === 0 ? (
                    <p>No saved chapters found.</p>
                  ) : (
                    <div className={styles.savedChaptersContainer}>
                      {savedChapters
                        .filter((item) => {
                          if (!searchSavedChapters) return true;
                          const q = searchSavedChapters.toLowerCase();
                          return (
                            (item.Book_name && item.Book_name.toLowerCase().includes(q)) ||
                            (item.note && item.note.toLowerCase().includes(q))
                          );
                        })
                        .map((item) => (
                          <div key={item.id} className={styles.savedChapterItem}>
                            <div
                              className={styles.savedChapterHeader}
                              onClick={() => handleToggleExpand(item)}
                              role="button"
                              tabIndex={0}
                              style={{ userSelect: 'none' }}
                            >
                              <span className={styles.savedChapterTitle}>
                                <button
                                  className={styles.expandButton}
                                  title="Show/Hide Content"
                                  style={{
                                    transition: 'transform 0.2s',
                                    transform: expandedChapters[item.id] ? 'rotate(45deg)' : 'none',
                                  }}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                >
                                  <Plus />
                                </button>
                                {item.Book_name} | Chapter {item.chapter_number}
                              </span>
                              <button onClick={e => { e.stopPropagation(); handleDeleteBookmark(item.id); }} className={styles.deleteButton} title="Delete">
                                ×
                              </button>
                            </div>
                            <div className={
                              expandedChapters[item.id]
                                ? `${styles.savedChapterVerses} ${styles.open}`
                                : styles.savedChapterVerses
                            }>
                              {expandedChapters[item.id] && (
                                expandedChapters[item.id].loading ? (
                                  <div>Loading...</div>
                                ) : (
                                  expandedChapters[item.id].verses.map((v: any) => (
                                    <span key={v.verse}><sup>{v.verse}</sup> {v.text} </span>
                                  ))
                                )
                              )}
                            </div>
                            {item.note && (
                              <div className={styles.savedChapterNote}>{item.note}</div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
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
                {/* Shadow and Base at the bottom */}
                <div className={styles.bellBase}></div>
                
                <div className={styles.bellShadow}></div>
                {/* Streak Plant above the base and shadow */}
                <div className={styles.streakPlantInBell}>
                  <StreakPlant stage={Stage}/>
                </div>
                {/* Glass dome above everything, but visually transparent */}
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
                    width: '90vw',
                    maxWidth: 400,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <button
                      onClick={() => setShowStreakModal(false)}
                      style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        fontSize: '2rem',
                        cursor: 'pointer',
                        zIndex: 10,
                      }}
                      aria-label="Close Streak Plant"
                    >
                      &#10005;
                    </button>
                    <h3 className="headingMedium" style={{ color: '#fff', marginBottom: '1.5rem' }}>Streak Plant!</h3>
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
    </div>
  );
}
