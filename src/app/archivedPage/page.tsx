"use client";
import React, { useEffect, useState, useRef } from 'react';
import styles from '../homePage/HomePage.module.css';
import { useSession } from 'next-auth/react';
import supabase from '../lib/supabaseclient';
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
  Close,
} from '@/app/components/svgs';
import { useRouter } from 'next/navigation';
import FilteredSearchBar from '@/app/components/FilteredSearchBar';
import Image from 'next/image';

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

interface PostDetails {
  id: number;
  topic: string;
  content: string;
  image_url: string;
  created_at: string;
  user_id: string;
  post_comments: comment[];
}

interface ArchivedPost {
  id: number;
  post_id: number;
  created_at: string;
  Posts: PostDetails;
}


export default function ArchivedPage() {

  const router = useRouter();
  const { data: session } = useSession();
  const [archivedPosts, setArchivedPosts] = useState<ArchivedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const biblePage = () => router.push('/biblePage');
  const goToHelp = () => router.push('/helpPage');
  const logOut = () => router.push('/loginPage');
  const homePage = () => router.push('/homePage');
  const userId = session?.user.id;
  useEffect(() => {
      if (!userId) return;
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userId]);

  useEffect(() => {
    const fetchArchivedPosts = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('archived_posts')
        .select(`
          id,
          post_id,
          created_at,
          Posts (
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
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching archived posts:", error);
        setArchivedPosts([]);
      } else {
        setArchivedPosts(data as unknown as ArchivedPost[]);

      }

      setLoading(false);
    };

    fetchArchivedPosts();
  }, [session?.user?.id]);

  const handleRemove = async (id: number) => {
    const { error } = await supabase.from('archived_posts').delete().eq('id', id);
    if (!error) {
      setArchivedPosts(posts => posts.filter(post => post.id !== id));
    }
  };

  return (
    <div className={styles.body}>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <LOGO style={{ width: 100, height: 100 }} />
            <h3 className="headingMedium" style={{ fontFamily: "'Segoe Script', cursive" }}>Amenity</h3>
          </div>
          <div className={styles.headerMid}>
                <FilteredSearchBar
                  filterLabel="Archives"
                  placeholder="Search in Archives..."
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onDelete={() => router.push('/homePage')}
                />
          </div>
          <div className={styles.headerRight}>
            <span className={styles.headerIcon}><Bell /></span>
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
          <div className={styles.mainLeft}>
            <div className={styles.mainLeftUp}>
              <div className={styles.navItem} onClick={homePage}><div className={styles.navIcon}><Home /></div><span className={styles.navText}>Home</span></div>
              <div className={styles.navItem}><div className={styles.navIcon}><Fire /></div><span className={styles.navText}>Popular</span></div>
              <button className={styles.navItem} onClick={biblePage}><div className={styles.navIcon}><Bible /></div><span className={styles.navText}>Bible</span></button>
            </div>
            <div className={styles.mainLeftBottom}>
              <div className={styles.navItem}><div className={styles.navIcon}><About /></div><span className={styles.navText}>About</span></div>
              <button className={styles.navItem} onClick={goToHelp}><div className={styles.navIcon}><Help /></div><span className={styles.navText}>Help</span></button>
            </div>
          </div>

          <div className={styles.mainMid}>
            <div style={{ marginTop: '3rem', marginBottom: '3rem' }}>
              <h2 className="headingMedium" style={{ marginBottom: '1.5rem' }}>Your Archived Posts</h2>
              <div style={{ backgroundColor: '#1E2B48', padding: '1.75rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)' }}>
                {loading ? (
                  <div>Loading...</div>
                ) : archivedPosts.length === 0 ? (
                  <div>No archived posts yet.</div>
                ) : (
                  archivedPosts
                    .filter(post => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        post.Posts.topic.toLowerCase().includes(q) ||
                        post.Posts.content.toLowerCase().includes(q)
                      );
                    })
                    .map(post => (
                      <div key={post.id} style={{ border: '1px solid #333', margin: '1rem 0', padding: '1rem', borderRadius: '12px', background: '#112244', position: 'relative' }}>
                        <button
                          onClick={() => handleRemove(post.id)}
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ffe8a3',
                            fontSize: '1.5rem',
                            zIndex: 2
                          }}
                          title="Remove from archive"
                        >
                          <Close />
                        </button>

                        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
                          {post.Posts?.topic || 'Untitled'}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          {post.Posts?.content || 'No content available.'}
                        </div>
                        {post.Posts?.image_url && (
                          <Image
                            src={post.Posts.image_url}
                            alt="Post image"
                            width={600}
                            height={400}
                            style={{ maxWidth: '100%', marginTop: '1rem', borderRadius: 8 }}
                          />
                        )}
                        <div style={{ color: '#aaa', fontSize: 13, marginTop: 10 }}>
                          Archived at: {new Date(post.created_at).toLocaleString()}
                        </div>

                        {/* Comments and Replies */}
                        {post.Posts?.post_comments?.length > 0 && (
                          <div style={{ marginTop: '1rem', background: '#18213a', borderRadius: 8, padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <h4 style={{ marginBottom: 8 }}>Comments</h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#ffe8a3', fontWeight: 600 }}>
                                  {post.Posts.post_comments.length} comment{post.Posts.post_comments.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>

                            <div>
                              {post.Posts.post_comments.map(comment => (
                                <div key={comment.id} style={{ marginBottom: 12, padding: 8, background: '#22305a', borderRadius: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: 14, color: '#ffe8a3' }}>
                                      <span style={{ marginRight: 8 }}>[User]</span>
                                      <span style={{ color: '#aaa', fontSize: 12 }}>
                                        {new Date(comment.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ marginTop: 4 }}>{comment.content}</div>

                                  {/* Replies */}
                                  <div style={{ marginTop: 8 }}>
                                    {comment.comment_replies?.length === 0 ? (
                                      <div style={{ fontSize: 13, color: '#ccc' }}>No replies yet.</div>
                                    ) : (
                                      comment.comment_replies.map(reply => (
                                        <div
                                          key={reply.id}
                                          style={{
                                            background: '#2d3a5a',
                                            borderRadius: 6,
                                            padding: 6,
                                            marginTop: 6,
                                          }}
                                        >
                                          <div style={{ fontSize: 13, color: '#ffe8a3' }}>
                                            <span style={{ marginRight: 8 }}>[User]</span>
                                            <span style={{ color: '#aaa', fontSize: 11 }}>
                                              {new Date(reply.created_at).toLocaleString()}
                                            </span>
                                          </div>
                                          <div style={{ marginTop: 2 }}>{reply.content}</div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

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
        </div>
      </main>
    </div>
  );
}
