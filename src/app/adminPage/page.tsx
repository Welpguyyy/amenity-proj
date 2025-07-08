'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './AdminPage.module.css';
import {
  About,
  Bell,
  Bible,
  Fire,
  Home,
  Logout,
  Profile,
  Sun,
  LOGO
} from '@/app/components/svgs';
import { useRouter } from 'next/navigation';
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import supadata from '../lib/supabaseclient';
import CreatePostModalStyles from '../homePage/CreatePostModal.module.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define interfaces for User, Post, Streak
interface User {
  username: string;
  email: string;
  password: string;
  last_login: string | null;
  status: 'active' | 'suspended';
  userId?: string; // for mapping
}

interface Post {
  id: number;
  user_id: string;
  topic: string;
  content: string;
  image_url?: string;
  created_at?: string;
  flagged?: boolean;
}

interface Streak {
  user_id: string;
  streaknum: number;
  date: string;
  user?: { username?: string; email?: string } | null;
}

// Helper to generate a random password
function generatePassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function HomePage() {
  const { data: session } = useSession();
  // State for profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserTable, setShowUserTable] = useState(false);
  const [showPostsTable, setShowPostsTable] = useState(false);
  const [showStreaksTable, setShowStreaksTable] = useState(false);
  const [showLoginStats, setShowLoginStats] = useState(false);
  const [showRegistrationStats, setShowRegistrationStats] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingStreaks, setLoadingStreaks] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<string | null>(null);
  const [flaggingPostId, setFlaggingPostId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [resettingStreak, setResettingStreak] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [loginStats, setLoginStats] = useState<{ [date: string]: number }>({});
  const [registrationStats, setRegistrationStats] = useState<{ [date: string]: number }>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [postFlagFilter, setPostFlagFilter] = useState<'all' | 'flagged'>('all');

  // Reference to the dropdown container
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLSpanElement>(null);

  const VALID_NOTIFICATION_TYPES = [
  'like',
  'comment',
  'post_flag',
  'post_delete',
  'bible_reminder',
  'streak_milestone',
  'trending_post',
  'admin_edit',
     'account_suspended',
    'account_unsuspended',
    'password_reset'

];

function validateNotificationType(type: string) {
  if (!VALID_NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid notification type: ${type}`);
  }
}

  // Toggle profile dropdown
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const userAccounts = async() => {
    setShowUserTable(true);
    setShowPostsTable(false);
    setShowStreaksTable(false);
    setShowLoginStats(false);
    setShowRegistrationStats(false);
    setLoadingUsers(true);
    const {data, error } = await supadata
        .from('Users_Accounts')
        .select('username, email, password, last_login, status');
    if (!error && data) {
        setUsers(data as User[]);
    }
    setLoadingUsers(false);
  }

  // Function to reset password and email the user
  const handleResetPassword = async (user: User) => {
    setResettingUser(user.username);
  setResetMessage(null);

  try {
      // Generate a new password
      const newPassword = generatePassword(12);
      
      // Update the password in the Users_Accounts table
      const { error: updateError } = await supadata
        .from('Users_Accounts')
        .update({ password: newPassword })
        .eq('username', user.username);
      
      if (updateError) {
        setResetMessage('Failed to update password in database.');
        setNotifications(prev => [
          `Failed to update password for ${user.username}.`,
          ...prev
        ]);
        return;
      }
      
      console.log('🔐 Attempting to send email to:', user.email);
      
      // Send email with the new password using the custom API
      const response = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: newPassword,
          username: user.username,
        }),
      });
      
      console.log('📧 Response status:', response.status);
      console.log('📧 Response ok:', response.ok);
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
          console.error('📧 Email API error data:', errorData);
        } catch (parseError) {
          console.error('📧 Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Fallback: show password even if email fails
        const errorMessage = (errorData as any)?.details || (errorData as any)?.error || `HTTP ${response.status}`;
        setResetMessage(`Password updated successfully! New password: ${newPassword} (Email sending failed: ${errorMessage})`);
        setNotifications(prev => [
          `Password updated for ${user.username}, but email failed.`,
          ...prev
        ]);
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.log('✅ Email sent successfully:', responseData);
        setResetMessage(`New password sent to ${user.email}. Password: ${newPassword}`);
        setNotifications(prev => [
          `Password reset for ${user.username} and emailed to ${user.email}.`,
          ...prev
        ]);
      }
      
      // Update the local state to reflect the new password
      setUsers((prev) => prev.map(u => u.username === user.username ? { ...u, password: newPassword } : u));
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setResetMessage('An error occurred while resetting the password.');
      setNotifications(prev => [
        `Error occurred while resetting password for ${user.username}.`,
        ...prev
      ]);
    }
    
  setResettingUser(null);
  };

  // Function to suspend or unsuspend a user
  const handleToggleSuspend = async (user: User) => {
     setSuspendingUser(user.username);

  const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
  const { error } = await supadata
    .from('Users_Accounts')
    .update({ status: newStatus })
    .eq('username', user.username);

  if (!error) {
    setUsers((prev) =>
      prev.map((u) =>
        u.username === user.username ? { ...u, status: newStatus } : u
      )
    );

  const { data, error } = await supadata
  .from('Users_Accounts') // ✅ watch casing: should match your Supabase table
  .select('userId')       // ✅ make sure it's really `userId` in your table
  .eq('username', user.username)
  .single();              // ⬅️ forces result to be a single object, not array

if (error || !data) {
  console.log("⚠️ Failed to fetch user ID for notification:", error?.message);
  return;
}

const userId = data.userId; // ✅ now this will work

    

    // ✅ Insert notification
    const notificationType = newStatus === 'suspended' ? 'account_suspended' : 'account_unsuspended';

    validateNotificationType(notificationType); // Optional: if you use this helper

    const { error: notifError } = await supadata.from('notifications').insert({
      user_id: userId,             // make sure this is the correct `id`, not username
      type: notificationType,
      post_id: null,                // no post related to this
      message: newStatus === 'suspended'
        ? `Your account has been suspended by the admin.`
        : `Your account has been reactivated by the admin.`,
      is_read: false,
      created_at: new Date().toISOString(),
      read_at: null,
    });

    if (notifError) {
      console.log("❌ Failed to insert suspend/unsuspend notification:", notifError.message);
    } else {
      console.log("✅ Suspend/unsuspend notification inserted");
    }
  } else {
    console.log("❌ Failed to update user status:", error.message);
  }

  setSuspendingUser(null);
  };

  // Handler to show posts
  const handleShowPosts = async () => {
    setShowUserTable(false);
    setShowPostsTable(true);
    setShowStreaksTable(false);
    setShowLoginStats(false);
    setShowRegistrationStats(false);
    setLoadingPosts(true);
    const { data, error } = await supadata
      .from('Posts')
      .select('*')
      .order('created_at', { ascending: false });
    // Fetch users for mapping userId to username
    const { data: usersData, error: usersError } = await supadata
      .from('Users_Accounts')
      .select('userId, username'); 
    if (!error && data) {
      setPosts(data as Post[]);
    }
    if (!usersError && usersData) {
      const map: { [userId: string]: string } = {};
      (usersData as User[]).forEach((user) => {
        if (user.userId && user.username) map[user.userId] = user.username;
      });
    }
    setLoadingPosts(false);
  };

  // Handler to show streaks
  const handleShowStreaks = async () => {
    setShowUserTable(false);
    setShowPostsTable(false);
    setShowStreaksTable(true);
    setShowLoginStats(false);
    setShowRegistrationStats(false);
    setLoadingStreaks(true);
    
    try {
      // Fetch all streaks
      const { data: streaksData, error: streaksError } = await supadata
        .from('streaks_input')
        .select('*')
        .order('streaknum', { ascending: false });
      if (streaksError) {
        console.error('Error fetching streaks:', streaksError);
        setLoadingStreaks(false);
        return;
      }
      // Fetch all users
      const { data: usersData, error: usersError } = await supadata
        .from('Users_Accounts')
        .select('userId, username, email');
      if (usersError) {
        console.error('Error fetching users:', usersError);
        setLoadingStreaks(false);
        return;
      }
      // Map users by userId
      const userMap = new Map<string, { username?: string; email?: string }>();
      (usersData || []).forEach((user: { userId: string; username?: string; email?: string }) => {
        userMap.set(user.userId, user);
      });
      // Attach user info to each streak (match user_id to user.userId)
      const streaksWithUsers: Streak[] = (streaksData || []).map((streak: any) => ({
        ...streak,
        user: userMap.get(streak.user_id) || null
      }));
      setStreaks(streaksWithUsers);
    } catch (error) {
      console.error('Error fetching streaks with users:', error);
    }
    setLoadingStreaks(false);
  };

  // Handler to reset a user's streak
  const handleResetStreak = async (userId: string) => {
    // Find the user info for confirmation
    const streak = streaks.find((s) => s.user_id === userId);
    const username = streak?.user?.username || userId;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to reset the streak for user "${username}"?\n\nThis will set their streak to 0 days.`
    );
    
    if (!confirmed) {
      return;
    }
    
    setResettingStreak(userId);
    
    try {
      const { error } = await supadata
        .from('streaks_input')
        .update({
          streaknum: 0,
          date: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (!error) {
        // Update local state
        setStreaks((prev) => prev.map(streak => 
          streak.user_id === userId 
            ? { ...streak, streaknum: 0, date: new Date().toISOString() }
            : streak
        ));
        alert(`Streak reset successfully for ${username}!`);
      } else {
        console.error('Error resetting streak:', error);
        alert('Failed to reset streak. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting streak:', error);
      alert('An error occurred while resetting the streak.');
    }
    
    setResettingStreak(null);
  };

  // Handler to delete a post
  const handleDeletePost = async (postId: number) => {
    setDeletingPostId(postId);

  const postToDelete = posts.find((p) => p.id === postId);

  if (!postToDelete) {
    console.error("⚠️ postToDelete is null — cannot insert delete notification.");
    setDeletingPostId(null);
    return;
  }

  console.log("🗑️ Preparing to delete post for user:", postToDelete.user_id);

  const type = 'post_delete';
  validateNotificationType(type);

  // 🔔 Insert notification first
  const { error: notifError } = await supadata.from('notifications').insert({
    user_id: postToDelete.user_id,
    type,
    post_id: null, // 👈 avoid FK violation
    message: `Your post titled "${postToDelete.topic}" was deleted by admin.`,
    is_read: false,
    created_at: new Date().toISOString(),
    read_at: null
  });

  if (notifError) {
    console.error("❌ Failed to insert delete notification:", notifError.message);
    setDeletingPostId(null);
    return;
  } else {
    console.log("✅ Delete notification inserted");
  }

  // 🗑️ Now delete the post
  const { error: deleteError } = await supadata
    .from('Posts')
    .delete()
    .eq('id', postId);

  if (deleteError) {
    console.error("❌ Supabase delete error:", deleteError.message);
    alert("Failed to delete post!");
  } else {
    setPosts(prev => prev.filter(post => post.id !== postId));
    console.log("✅ Post deleted");
  }

  setDeletingPostId(null);
};


  // Handler to flag or unflag a post as violation (toggle flagged field)
  const handleToggleFlagPost = async (postId: number, currentFlagged: boolean) => {
    setFlaggingPostId(postId);
    const postToFlag = posts.find((p) => p.id === postId);
    const { error } = await supadata
      .from('Posts')
      .update({ flagged: !currentFlagged })
      .eq('id', postId);

    if (!error) {
      setPosts(posts => posts.map(post => post.id === postId ? { ...post, flagged: !currentFlagged } : post));
      if (postToFlag) {
        // Insert notification
        await supadata
          .from('notifications')
          .insert({
            user_id: postToFlag.user_id,
            type: 'post_flag',
            post_id: postId,
            message: `Your post titled "${postToFlag.topic}" was flagged/unflagged by admin.`,
            is_read: false,
            created_at: new Date().toISOString(),
            read_at: null
          });
      } else {
        console.log('⚠️ postToFlag is null or undefined');
      }
    } else {
      alert('Failed to update flag status!');
    }
    setFlaggingPostId(null);
  };

  // Handler to show login statistics
  const handleShowLoginStats = async () => {
    setShowUserTable(false);
    setShowPostsTable(false);
    setShowStreaksTable(false);
    setShowLoginStats(true);
    setShowRegistrationStats(false);
    setLoadingStats(true);
    
    try {
      const { data, error } = await supadata
        .from('Users_Accounts')
        .select('last_login');
      
      if (error) {
        setLoginStats({});
        setLoadingStats(false);
        return;
      }
      
      const loginData: { [date: string]: number } = {};
      (data || []).forEach((user: any) => {
        if (user.last_login) {
          const loginDate = new Date(user.last_login).toISOString().slice(0, 10);
          loginData[loginDate] = (loginData[loginDate] || 0) + 1;
        }
      });
      
      setLoginStats(loginData);
    } catch (error) {
      console.error('Error fetching login statistics:', error);
    }
    
    setLoadingStats(false);
  };

  // Handler to show registration statistics
  const handleShowRegistrationStats = async () => {
    setShowUserTable(false);
    setShowPostsTable(false);
    setShowStreaksTable(false);
    setShowLoginStats(false);
    setShowRegistrationStats(true);
    setLoadingStats(true);
    
    try {
      const { data, error } = await supadata
        .from('Users_Accounts')
        .select('created_at');
      
      if (error) {
        setRegistrationStats({});
        setLoadingStats(false);
        return;
      }
      
      const registrationData: { [date: string]: number } = {};
      (data || []).forEach((user: any) => {
        if (user.created_at) {
          const regDate = new Date(user.created_at).toISOString().slice(0, 10);
          registrationData[regDate] = (registrationData[regDate] || 0) + 1;
        }
      });
      
      setRegistrationStats(registrationData);
    } catch (error) {
      console.error('Error fetching registration statistics:', error);
    }
    
    setLoadingStats(false);
  };


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

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Edit Post Modal component
  function EditPostModal({ isOpen, onClose, post, onSave }: { isOpen: boolean, onClose: () => void, post: Post, onSave: () => void }) {
    const [topic, setTopic] = useState(post?.topic || '');
    const [content, setContent] = useState(post?.content || '');
    const [imagePreview, setImagePreview] = useState<string | null>(post?.image_url || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    useEffect(() => {
      setTopic(post?.topic || '');
      setContent(post?.content || '');
      setImagePreview(post?.image_url || null);
      setImageFile(null);
    }, [post]);
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    };
    const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
  let imageUrl = post?.image_url || null;
  if (imageFile) {
    const filePath = `public/${Date.now()}_${imageFile.name}`;
    const { data, error } = await supadata.storage.from('post-images').upload(filePath, imageFile);
    if (!error && data) {
      const { data: publicUrlData } = supadata.storage.from('post-images').getPublicUrl(data.path);
      imageUrl = publicUrlData?.publicUrl || null;
    } else {
      alert('Image upload failed!');
      return;
    }
  }

  const { error } = await supadata.from('Posts').update({
    topic,
    content,
    image_url: imageUrl,
    updated_at: new Date().toISOString()
  }).eq('id', post.id);

  if (!error) {
    // ✅ Insert edit notification
    await supadata.from('notifications').insert({
      user_id: post.user_id,
      type:'post_edit',
      post_id: post.id,
      message: `Your post titled "${post.topic}" was edited by admin.`,
      is_read: false,
      created_at: new Date().toISOString(),
      read_at: null
    });

    onSave();
    onClose();
  } else {
    console.error('Failed to update post!', error);
    alert('Failed to update post!');
  }
    };
    if (!isOpen) return null;
    return (
      <div className={CreatePostModalStyles.overlay} onClick={onClose}>
        <div className={CreatePostModalStyles.modal} onClick={e => e.stopPropagation()}>
          <div className={CreatePostModalStyles.header}>
            <div className={CreatePostModalStyles.avatar}></div>
            <span className={CreatePostModalStyles.username}>{post?.user_id}</span>
          </div>
          <input
            type="text"
            placeholder="Topic"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className={CreatePostModalStyles.topicInput}
          />
          <textarea
            className={CreatePostModalStyles.textarea}
            placeholder="Write something..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          {imagePreview && (
            <div style={{ margin: '1rem', textAlign: 'center' }}>
              <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12 }} />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            id="edit-image-upload"
            onChange={handleImageChange}
          />
          <div className={CreatePostModalStyles.footer}>
            <button className={CreatePostModalStyles.postBtn} onClick={handleSubmit}>Save</button>
            <button
              className={CreatePostModalStyles.imageBtn}
              onClick={() => {
                const input = document.getElementById('edit-image-upload') as HTMLInputElement | null;
                if (input) input.click();
              }}
            >
              Change Image
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handler for profile modal open
  const handleOpenProfileModal = async () => {
    setShowProfileModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setProfileMessage('');
    setShowProfileMenu(false);
    if (session?.user && (session.user as any).id) {
      const { data, error } = await supadata
        .from('Users_Accounts')
        .select('email')
        .eq('userId', (session.user as any).id)
        .single();
      // if (!error && data?.email) setProfileEmail(data.email); // Commented out, setProfileEmail not defined
    }
  };

  // Handler for profile modal close
  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setNewPassword('');
    setConfirmPassword('');
    setProfileMessage('');
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setProfileMessage('Please fill in both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileMessage('Passwords do not match.');
      return;
    }
    const { error } = await supadata
      .from('Users_Accounts')
      .update({ password: newPassword })
      .eq('role', 'admin');
    if (error) {
      console.error('Supabase error:', error);
      setProfileMessage('Failed to update password.');
    } else {
      setProfileMessage('Password updated successfully!');
      setTimeout(() => handleCloseProfileModal(), 1200);
    }
  };

  return (
    <div className={styles.body}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <LOGO style={{ width: 100, height: 100 }} /><h3 className="headingMedium" style={{ fontFamily: "'Segoe Script', cursive" }}>Amenity</h3>
          </div>

          <div className={styles.headerMid}>
            {showUserTable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: 'white', fontSize: '14px' }}>Filter Users:</label>
                <select
                  value={userStatusFilter}
                  onChange={e => setUserStatusFilter(e.target.value as any)}
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #4f658c',
                    background: '#1E2B48',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
            </div>
            )}
            {showPostsTable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: 'white', fontSize: '14px' }}>Filter Posts:</label>
                <select
                  value={postFlagFilter}
                  onChange={e => setPostFlagFilter(e.target.value as any)}
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: 6, 
                    border: '1px solid #4f658c',
                    background: '#1E2B48',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Posts</option>
                  <option value="flagged">Flagged Only</option>
                </select>
              </div>
            )}
          </div>

          <div className={styles.headerRight}>
            {/* Notification Icon */}
            <span
              className={styles.headerIcon}
              ref={bellRef}
              onClick={() => setShowNotifications(v => !v)}
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              <Bell />
              {notifications.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#e57373',
                    color: 'white',
                    borderRadius: '50%',
                    width: 12,
                    height: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                >
                  {notifications.length}
                </span>
              )}
              {showNotifications && notifications.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '2.5rem',
                  right: 0,
                  background: '#1E2B48',
                  color: 'white',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  minWidth: 260,
                  maxWidth: 340,
                  zIndex: 1000,
                  padding: '0.5rem 0',
                  fontSize: '0.98rem',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    padding: '0 1rem 0.5rem 1rem',
                  }}>
                    <button
                      onClick={e => { e.stopPropagation(); setNotifications([]); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e57373',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                  {notifications.map((note, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem 1.25rem',
                      borderBottom: idx !== notifications.length - 1 ? '1px solid #333' : 'none',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}>
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </span>

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
                  <div className={styles.dropdownItem} onClick={handleOpenProfileModal}>
                    <span><Profile /></span>
                    <span>View Profile</span>
                  </div>
                  <div className={styles.dropdownItem}
                  onClick = {() => signOut({callbackUrl: "/loginPage"})}>
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
          <div className={styles.mainLeft}>
            <div className={styles.mainLeftUp}>

              <button className={styles.navItem} onClick={userAccounts}>
                <div className={styles.navIcon}><Home /></div>
                <span className={styles.navText}>Manage User Accounts</span>
              </button>

              <button className={styles.navItem} onClick={handleShowPosts}>
                <div className={styles.navIcon}><Fire /></div>
                <span className={styles.navText}>Posts</span>
              </button>

              <button className={styles.navItem} onClick={handleShowStreaks}>
                <div className={styles.navIcon}><Bible /></div>
                <span className={styles.navText}>Streaks</span>
              </button>

              <button 
                className={`${styles.navItem} ${styles.statisticsButton}`}
                onClick={handleShowLoginStats}
              >
                <div className={styles.navIcon}><Fire /></div>
                <span className={styles.navText}>Login Statistics</span>
              </button>

              <button 
                className={`${styles.navItem} ${styles.statisticsButton}`}
                onClick={handleShowRegistrationStats}
              >
                <div className={styles.navIcon}><Fire /></div>
                <span className={styles.navText}>Registration Statistics</span>
              </button>
            </div>

            <div className={styles.mainLeftBottom}>
              <div className={styles.navItem}>
                <div className={styles.navIcon}><About /></div>
                <span className={styles.navText}>About</span>
              </div>
            </div>
          </div>

          {/* Middle Content Area - Now Scrollable */}
          <div className={styles.mainMid}>
            <div className={styles.navContainer}>
              {showUserTable && (
                <div className={styles.userTableWrapper}>
                {loadingUsers ? (
                  <div className={styles.userTableLoading}>Loading...</div>
                ) : (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Password</th>
                        <th>Last Login</th>
                        <th>Status</th>
                        <th>Reset Password</th>
                        <th>Suspend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(user => {
                          if (userStatusFilter === 'all') return true;
                          return user.status === userStatusFilter;
                        })
                        .map((user, idx) => (
                        <tr key={idx}>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{user.password}</td>
                          <td>{user.last_login ? new Date(user.last_login).toLocaleString() : ''}</td>
                          <td>{user.status}</td>
                          <td>
                            <button
                              onClick={() => handleResetPassword(user)}
                              disabled={resettingUser === user.username}
                              style={{ padding: '4px 10px', borderRadius: '6px', background: '#4f658c', color: 'white', border: 'none', cursor: 'pointer' }}
                            >
                              {resettingUser === user.username ? 'Resetting...' : 'Reset Password'}
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleSuspend(user)}
                              disabled={suspendingUser === user.username}
                              style={{ padding: '4px 10px', borderRadius: '6px', background: user.status === 'suspended' ? '#e57373' : '#4caf50', color: 'white', border: 'none', cursor: 'pointer' }}
                            >
                              {suspendingUser === user.username ? (user.status === 'suspended' ? 'Unsuspending...' : 'Suspending...') : (user.status === 'suspended' ? 'Unsuspend' : 'Suspend')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {resetMessage && <div style={{ color: 'white', marginTop: '1rem' }}>{resetMessage}</div>}
              </div>
              )}
              {showPostsTable && (
                <div className={styles.userTableWrapper} style={{ overflowX: 'auto' }}>
                  {loadingPosts ? (
                    <div className={styles.userTableLoading}>Loading posts...</div>
                  ) : (
                    <table className={styles.userTable}>
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Topic</th>
                          <th>Content</th>
                          <th>Created At</th>
                          <th>Flagged</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts
                          .filter(post => {
                            if (postFlagFilter === 'all') return true;
                            return post.flagged === true;
                          })
                          .map((post) => (
                          <tr key={post.id} style={post.flagged ? { background: '#ffeaea' } : {}}>
                            <td style={{ wordBreak: 'break-all' }}>{post.user_id}</td>
                            <td style={{ wordBreak: 'break-all' }}>{post.topic}</td>
                            <td style={{ wordBreak: 'break-word' }}>{post.content}</td>
                            <td style={{ wordBreak: 'break-all' }}>{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</td>
                            <td>{post.flagged ? 'Yes' : 'No'}</td>
                            <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {/* Edit button */}
                                <button
                                  onClick={() => {
                                    setEditingPost(post);
                                    setEditModalOpen(true);
                                  }}
                                  style={{ color: 'white', background: '#e57373', border: 'none', borderRadius: 4, padding: '2px 8px', minWidth: 60, cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                {/* Delete button */}
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  disabled={deletingPostId === post.id}
                                  style={{ color: 'white', background: '#e57373', border: 'none', borderRadius: 4, padding: '2px 8px', minWidth: 60, cursor: 'pointer' }}
                                >
                                  {deletingPostId === post.id ? 'Deleting...' : 'Delete'}
                                </button>
                                {/* Flag as violation button */}
                                <button
                                  onClick={() => handleToggleFlagPost(post.id, Boolean(post.flagged))}
                                  disabled={flaggingPostId === post.id}
                                  style={{
                                    color: 'white',
                                    background: post.flagged ? '#4caf50' : '#ff9800',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '2px 8px',
                                    minWidth: 90,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {flaggingPostId === post.id
                                    ? (post.flagged ? 'Unflagging...' : 'Flagging...')
                                    : (post.flagged ? 'Unflag' : 'Flag as Violation')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {showStreaksTable && (
                 <div className={styles.userTableWrapper} style={{ overflowX: 'auto' }}>
                   {loadingStreaks ? (
                     <div className={styles.userTableLoading}>Loading streaks...</div>
                   ) : (
                     <table className={styles.userTable}>
                       <thead>
                         <tr>
                           <th>Username</th>
                           <th>Email</th>
                           <th>User ID</th>
                           <th>Current Streak</th>
                           <th>Last Active Date</th>
                           <th>Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {streaks.map((streak) => (
                           <tr key={streak.user_id}>
                             <td style={{ wordBreak: 'break-all' }}>
                               {streak.user?.username || 'Unknown User'}
                             </td>
                             <td style={{ wordBreak: 'break-all' }}>
                               {streak.user?.email || 'No email'}
                             </td>
                             <td style={{ wordBreak: 'break-all' }}>{streak.user_id}</td>
                             <td style={{ 
                               wordBreak: 'break-all', 
                               fontWeight: 'bold',
                               color: streak.streaknum > 0 ? '#4caf50' : '#666'
                             }}>
                               {streak.streaknum} {streak.streaknum === 1 ? 'day' : 'days'}
                             </td>
                             <td style={{ wordBreak: 'break-all' }}>
                               {streak.date ? new Date(streak.date).toLocaleDateString() : 'Never'}
                             </td>
                             <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                               <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                 {/* Reset streak button */}
                                 <button
                                   onClick={() => handleResetStreak(streak.user_id)}
                                   disabled={resettingStreak === streak.user_id}
                                   style={{ 
                                     color: 'white', 
                                     background: '#e57373', 
                                     border: 'none', 
                                     borderRadius: 4, 
                                     padding: '4px 12px', 
                                     minWidth: 80, 
                                     cursor: 'pointer',
                                     fontSize: '12px'
                                   }}
                                 >
                                   {resettingStreak === streak.user_id ? 'Resetting...' : 'Reset Streak'}
                                 </button>
            </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   )}
                   {!loadingStreaks && streaks.length === 0 && (
                     <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                       No streaks found. Users will appear here once they start using the daily reading feature.
                     </div>
                   )}
                 </div>
               )}
              {showLoginStats && (
                <div style={{ background: '#232b3b', borderRadius: 12, padding: 32, margin: 24, height: '100%', minHeight: 400, width: '100%' }}>
                  <div style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', fontSize: '2rem', color: 'white', marginBottom: 24 }}>
                    Login Statistics
                  </div>
                  {loadingStats ? (
                    <div style={{ color: 'white' }}>Loading statistics...</div>
                  ) : (
                    <div style={{ width: '100%', height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Object.keys(loginStats).length === 0 ? (
                        <div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>No login data found.</div>
                      ) : (
                        <Bar
                          data={{
                            labels: Object.keys(loginStats).sort(),
                            datasets: [
                              {
                                label: 'Logins',
                                data: Object.keys(loginStats).sort().map(date => loginStats[date]),
                                backgroundColor: 'rgba(75,192,192,0.6)',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              title: { display: false },
                            },
                            scales: {
                              x: { ticks: { color: 'white' }, grid: { color: '#444' } },
                              y: { ticks: { color: 'white' }, grid: { color: '#444' } },
                            },
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              {showRegistrationStats && (
                <div style={{ background: '#232b3b', borderRadius: 12, padding: 32, margin: 24, height: '100%', minHeight: 400, width: '100%' }}>
                  <div style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', fontSize: '2rem', color: 'white', marginBottom: 24 }}>
                    Registration Statistics
                  </div>
                  {loadingStats ? (
                    <div style={{ color: 'white' }}>Loading statistics...</div>
                  ) : (
                    <div style={{ width: '100%', height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {Object.keys(registrationStats).length === 0 ? (
                        <div style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>No registration data found.</div>
                      ) : (
                        <Bar
                          data={{
                            labels: Object.keys(registrationStats).sort(),
                            datasets: [
                              {
                                label: 'Registrations',
                                data: Object.keys(registrationStats).sort().map(date => registrationStats[date]),
                                backgroundColor: 'rgba(255,99,132,0.6)',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              title: { display: false },
                            },
                            scales: {
                              x: { ticks: { color: 'white' }, grid: { color: '#444' } },
                              y: { ticks: { color: 'white' }, grid: { color: '#444' } },
                            },
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Post Modal */}
      {editModalOpen && editingPost && (
        <EditPostModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          post={editingPost as Post}
          onSave={() => handleShowPosts()}
        />
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={handleCloseProfileModal}
        >
          <div
            style={{ background: '#232b3b', borderRadius: 16, padding: 32, minWidth: 350, maxWidth: 400, color: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Change Password</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #444', background: '#1E2B48', color: 'white', marginTop: 4 }}
                placeholder="Enter new password"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500 }}>Confirm New Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #444', background: '#1E2B48', color: 'white', marginTop: 4 }}
                placeholder="Confirm new password"
              />
            </div>
            {profileMessage && <div style={{ color: profileMessage.includes('success') ? '#4caf50' : '#e57373', marginBottom: 12 }}>{profileMessage}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={handleCloseProfileModal} style={{ padding: '8px 18px', borderRadius: 6, background: '#888', color: 'white', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpdatePassword} style={{ padding: '8px 18px', borderRadius: 6, background: '#4f658c', color: 'white', border: 'none', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
