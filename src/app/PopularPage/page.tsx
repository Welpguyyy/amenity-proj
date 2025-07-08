'use client';
import React, { useEffect, useState, useRef } from 'react';
import styles from '../homePage/HomePage.module.css';
import popularStyles from './PopularPage.module.css';
import supabase from '../lib/supabaseclient';
import {
  About, Bell, Bible, Fire, Help, Home, Logout, Profile, Sun, LOGO, Like, Arrow, Comments,
} from '@/app/components/svgs';
import { useRouter } from 'next/navigation';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from '../components/NotificationItem';
import StreakPlant from '../components/StreakPlant';
import { getUserStreakAndHP } from '../lib/streakService';
import { useSession } from 'next-auth/react';

interface reply {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
}

interface comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  comment_replies: reply[];
}

interface Post {
  id: number;
  topic: string;
  content: string;
  image_url: string;
  created_at: string;
  user_id: string;
  post_comments: comment[];
  post_interactions: {
    likes: number;
  };
  totalEngagement?: number;
}

type ViewMode = 'trending' | 'liked';

// CollapsibleText component for long content
interface CollapsibleTextProps {
  text: string;
  maxLength?: number;
}

const CollapsibleText: React.FC<CollapsibleTextProps> = ({ text, maxLength = 150 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <div>{text}</div>;
  }

  return (
    <div>
      {isExpanded ? (
        <div>
          {text}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffe8a3',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '8px',
              textDecoration: 'underline',
            }}
          >
            Show less
          </button>
        </div>
      ) : (
        <div>
          {text.substring(0, maxLength)}...
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffe8a3',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '8px',
              textDecoration: 'underline',
            }}
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
};

// CollapsibleCommentsSection component
interface CollapsibleCommentsSectionProps {
  comments: comment[];
}

const CollapsibleCommentsSection: React.FC<CollapsibleCommentsSectionProps> = ({ comments }) => {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <div className={popularStyles.commentsSection}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          marginBottom: 8
        }}
        onClick={() => setCommentsOpen(!commentsOpen)}
      >
        <h4 style={{ marginBottom: 0 }}>Comments</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Comments style={{ width: 22, height: 22 }} />
          <span style={{ color: '#ffe8a3', fontWeight: 600 }}>{comments.length}</span>
          <span style={{ 
            display: 'inline-block', 
            transition: 'transform 0.2s', 
            transform: commentsOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            marginLeft: 8 
          }}>
            <Arrow style={{ width: 22, height: 22 }} />
          </span>
        </div>
      </div>
      <div className={`${popularStyles.commentDropdown} ${commentsOpen ? popularStyles.open : ''}`}>
        {comments.map(comment => (
          <CollapsibleComment key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};

// CollapsibleComment component
interface CollapsibleCommentProps {
  comment: comment;
}

const CollapsibleComment: React.FC<CollapsibleCommentProps> = ({ comment }) => {
  const [repliesOpen, setRepliesOpen] = useState(false);

  return (
    <div className={popularStyles.commentItem}>
      <div className={popularStyles.userInfo}>
        <span style={{ marginRight: 8 }}>[User]</span>
        <span style={{ color: '#aaa', fontSize: 12 }}>
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      <div className={popularStyles.commentContent}>
        <CollapsibleText text={comment.content} maxLength={150} />
      </div>

      {comment.comment_replies && comment.comment_replies.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              cursor: 'pointer',
              marginBottom: 8
            }} 
            onClick={() => setRepliesOpen(!repliesOpen)}
          >
            <Comments style={{ width: 18, height: 18 }} />
            <span style={{ color: '#ffe8a3', fontWeight: 600 }}>{comment.comment_replies.length}</span>
            <span style={{ 
              display: 'inline-block', 
              transition: 'transform 0.2s', 
              transform: repliesOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
              marginLeft: 6 
            }}>
              <Arrow style={{ width: 18, height: 18 }} />
            </span>
          </div>
          <div className={`${popularStyles.replyDropdown} ${repliesOpen ? popularStyles.open : ''}`}>
            {comment.comment_replies.map(reply => (
              <div key={reply.id} className={popularStyles.replyItem}>
                <div className={popularStyles.userInfo}>
                  <span style={{ marginRight: 8 }}>[User]</span>
                  <span style={{ color: '#aaa', fontSize: 11 }}>
                    {new Date(reply.created_at).toLocaleString()}
                  </span>
                </div>
                <div className={popularStyles.commentContent}>
                  <CollapsibleText text={reply.content} maxLength={100} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// If Notification type is imported from notificationService, redefine locally for compatibility:
type Notification = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  title?: string;
  icon?: string;
  timestamp?: Date | string | number;
  isRead?: boolean;
  actionUrl?: string;
};

export default function PopularPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // --- Streak Plant State ---
  const [Stage, setStage] = useState<1 | 2 | 3 | 4>(1); // Default to stage 1

  useEffect(() => {
    if (!session?.user?.id) return;
    getUserStreakAndHP(session.user.id).then(data => {
      setStage(data?.Stage ?? 1);
    });
  }, [session]);

  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('trending');
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const [openSide, setOpenSide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery] = useState('');

  // Add state for streak modal
  const [showStreakModal, setShowStreakModal] = useState(false);

  const biblePage = () => router.push('/biblePage');
  const goToHelp = () => router.push('/helpPage');
  const logOut = () => router.push('/loginPage');
  const homePage = () => router.push('/homePage');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenSide = () => setOpenSide(true);
  const handleCloseOverlay = () => setOpenSide(false);

  const fetchPopularPosts = async () => {
    setLoading(true);

    const { data: interactions, error } = await supabase
      .from('post_interactions')
      .select('post_id')
      .eq('likes', 1);

    if (error) {
      console.error('Error fetching interactions:', error);
      setPopularPosts([]);
      return;
    }

    const likeCountMap: Record<number, number> = {};
    interactions?.forEach(({ post_id }) => {
      likeCountMap[post_id] = (likeCountMap[post_id] || 0) + 1;
    });

    const topPostIds = Object.entries(likeCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([postId]) => Number(postId));

    if (topPostIds.length === 0) {
      setPopularPosts([]);
      setLoading(false);
      return;
    }

    const { data: postsData, error: postsError } = await supabase
      .from('Posts')
      .select(`
        id,
        topic,
        content,
        image_url,
        created_at,
        user_id,
        post_comments (
          id,
          content,
          created_at,
          user_id,
          comment_replies (
            id,
            content,
            created_at,
            user_id
          )
        )
      `)
      .in('id', topPostIds);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      setPopularPosts([]);
      return;
    }

    const postsWithLikes: Post[] = postsData.map(post => ({
      ...post,
      post_interactions: {
        likes: likeCountMap[post.id] || 0,
      },
    }));

    postsWithLikes.sort((a, b) => b.post_interactions.likes - a.post_interactions.likes);
    setPopularPosts(postsWithLikes);
    setLoading(false);
  };

  const fetchTrendingPosts = async () => {
    const { data: likesData, error: likesError } = await supabase
      .from('post_interactions')
      .select('post_id')
      .eq('likes', 1);

    const { data: commentsData, error: commentsError } = await supabase
      .from('post_comments')
      .select('post_id');

    const { data: repliesData, error: repliesError } = await supabase
      .from('comment_replies')
      .select('comment_id, post_comments (post_id)');

    if (likesError || commentsError || repliesError) {
      console.error('Error fetching trending data');
      return;
    }

    const engagementMap: Record<number, number> = {};

    likesData?.forEach(({ post_id }) => {
      engagementMap[post_id] = (engagementMap[post_id] || 0) + 1;
    });

    commentsData?.forEach(({ post_id }) => {
      engagementMap[post_id] = (engagementMap[post_id] || 0) + 1;
    });

    repliesData?.forEach(reply => {
      const pid = reply.post_comments?.[0]?.post_id;
      if (pid) {
        engagementMap[pid] = (engagementMap[pid] || 0) + 1;
      }
    });

    const topEngagedIds = Object.entries(engagementMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => Number(id));

    const { data: postsData, error: postsError } = await supabase
      .from('Posts')
      .select(`
        id,
        topic,
        content,
        image_url,
        created_at,
        user_id,
        post_comments (
          id,
          content,
          created_at,
          user_id,
          comment_replies (
            id,
            content,
            created_at,
            user_id
          )
        )
      `)
      .in('id', topEngagedIds);

    if (postsError) {
      console.error('Error fetching trending posts:', postsError);
      return;
    }

    const posts: Post[] = postsData.map(post => ({
      ...post,
      post_interactions: {
        likes: likesData?.filter(l => l.post_id === post.id).length || 0,
      },
      totalEngagement: engagementMap[post.id],
    }));

    posts.sort((a, b) => (b.totalEngagement || 0) - (a.totalEngagement || 0));
    setTrendingPosts(posts);
  };

  useEffect(() => {
    fetchPopularPosts();
    fetchTrendingPosts();
  }, []);

  const renderPosts = (posts: Post[], title: string, key: string) => (
    <div style={{ marginBottom: '3rem' }}>
      <h2 className="headingMedium" style={{ marginBottom: '1.5rem' }}>{title}</h2>
      <div className={popularStyles.postsContainer}>
        {loading ? (
          <div className={popularStyles.loadingText}>Loading...</div>
        ) : posts.length === 0 ? (
          <div className={popularStyles.noPostsText}>No posts to display.</div>
        ) : (
          posts
            .filter(post => {
              const q = searchQuery.toLowerCase();
              return (
                post.topic.toLowerCase().includes(q) ||
                post.content.toLowerCase().includes(q)
              );
            })
            .map(post => (
              <div key={`${key}-${post.id}`} className={popularStyles.postCard}>
                <div className={popularStyles.postTitle}>
                  {post.topic}
                </div>
                <div className={popularStyles.postContent}>
                  <CollapsibleText text={post.content} maxLength={200} />
                </div>
                {post.image_url && (
                  <img src={post.image_url} alt="Post" className={popularStyles.postImage} />
                )}
                <div className={popularStyles.postStats}>
                  <span>Likes: {post.post_interactions.likes}</span>
                  {post.totalEngagement !== undefined && (
                    <span className={popularStyles.engagementScore}>
                      Engagement Score: {post.totalEngagement}
                    </span>
                  )}
                </div>
                <div className={popularStyles.postDate}>
                  Created at: {new Date(post.created_at).toLocaleString()}
                </div>

                                {post.post_comments && post.post_comments.length > 0 && (
                  <CollapsibleCommentsSection comments={post.post_comments} />
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderToggleButtons = () => (
    <div className={popularStyles.toggleContainer}>
      <button
        onClick={() => setViewMode('trending')}
        className={`${popularStyles.toggleButton} ${viewMode === 'trending' ? popularStyles.toggleButtonActive : popularStyles.toggleButtonInactive}`}
      >
        <Fire style={{ width: 20, height: 20 }} />
        Trending
      </button>
      <button
        onClick={() => setViewMode('liked')}
        className={`${popularStyles.toggleButton} ${viewMode === 'liked' ? popularStyles.toggleButtonActive : popularStyles.toggleButtonInactive}`}
      >
        <Like style={{ width: 20, height: 20 }} />
        Most Liked
      </button>
    </div>
  );

  const toggleNotificationMenu = () => {
    setShowNotificationMenu(!showNotificationMenu);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotificationMenu(false);
      }
    }
    if (showNotificationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationMenu]);

  return (
    <div className={styles.body}>
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
            <div className={styles.notificationContainer} ref={notificationDropdownRef}>
              <span className={styles.headerIcon} onClick={toggleNotificationMenu}>
                <Bell />
                {unreadCount > 0 && (
                  <div className={styles.notificationBadge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </span>
              {showNotificationMenu && (
                <div className={styles.notificationDropdown}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: '#f5f0e9', fontSize: '1rem', fontWeight: '600', margin: 0 }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); markAllAsRead(); }}
                        style={{ background: 'none', border: 'none', color: '#ffe8a3', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#8b9cb3' }}>No notifications</div>
                    ) : (
                      notifications.map(notification => (
                        <NotificationItem key={notification.id} notification={notification as Notification} onMarkAsRead={markAsRead} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.profileContainer} ref={profileDropdownRef}>
              <span className={styles.headerIcon} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <Profile />
              </span>
              {showProfileMenu && (
                <div className={styles.profileDropdown}>
                  <div className={styles.dropdownItem}><span><Profile /></span><span>View Profile</span></div>
                  <div className={styles.dropdownItem} onClick={logOut}><span><Logout /></span><span>Log Out</span></div>
                  <div className={styles.dropdownItem}><span><Sun /></span><span>Light Mode</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
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
            <div className={styles.mainLeftUp}>
              <div className={styles.navItem} onClick={homePage}><div className={styles.navIcon}><Home /></div><span className={styles.navText}>Home</span></div>
              <div className={styles.navItem}><div className={styles.navIcon}><Fire /></div><span className={styles.navText}>Popular</span></div>
              <button className={styles.navItem} onClick={biblePage}><div className={styles.navIcon}><Bible /></div><span className={styles.navText}>Bible</span></button>
            </div>
            <div className={styles.mainLeftBottom}>
              <button className={styles.navItem} onClick={() => router.push('/aboutPage')}>
                <div className={styles.navIcon}><About /></div>
                <span className={styles.navText}>About</span>
              </button>
              <button className={styles.navItem} onClick={goToHelp}><div className={styles.navIcon}><Help /></div><span className={styles.navText}>Help</span></button>
            </div>
          </div>
          )}
          {/* Overlay for mobile popout */}
          {isMobile && openSide && (
            <div onClick={handleCloseOverlay} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />
          )}
          <div className={styles.mainMid}>
            {renderToggleButtons()}
            {viewMode === 'trending' && renderPosts(trendingPosts, 'Top 10 Trending Posts', 'trending')}
            {viewMode === 'liked' && renderPosts(popularPosts, 'Top 10 Most Liked Posts', 'liked')}
          </div>
          {/* Only show right sidebar on desktop/tablet, not on mobile */}
          {!isMobile && (
          <div className={styles.mainRight}>
            <div className={styles.rightContainer}>
              <h3 className="headingMedium">Streak Plant!</h3>
              <div className={styles.glassBellContainer}>
                <div className={styles.glassBell}></div>
                <div className={styles.bellShadow}></div>
                <div className={styles.bellBase}></div>
              </div>
            </div>
          </div>
          )}
        </div>
        {/* Floating Streak Plant Button for Mobile */}
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
                    <div className={styles.streakPlantInBell}>
                      <StreakPlant stage={Stage} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
