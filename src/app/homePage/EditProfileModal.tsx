import React, { useState, useRef } from 'react';
import styles from './EditProfileModal.module.css';
import supadata from '../lib/supabaseclient';
import { useSession } from 'next-auth/react';
import { Profile } from '@/app/components/svgs'; // Assuming Profile is in your svgs barrel file
import Image from 'next/image';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Get current image_url from session or user (if available)
  const currentImageUrl = (session?.user as any)?.image_url || null;

  if (!isOpen) return null;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  async function uploadProfileImage(file: File): Promise<string | null> {
    const filePath = `profile-pictures/${session?.user?.id}_${Date.now()}_${file.name}`;
    setUploading(true);
    const { data, error } = await supadata.storage
      .from('profile-pictures')
      .upload(filePath, file, { upsert: true });
    setUploading(false);
    if (error || !data) {
      alert('Image upload failed!');
      return null;
    }
    const { data: publicUrlData } = supadata.storage
      .from('profile-pictures')
      .getPublicUrl(data.path);
    return publicUrlData?.publicUrl || null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Passwords don't match.");
      return;
    }

    try {
      let uploadedImageUrl = null;
      if (imageFile) {
        uploadedImageUrl = await uploadProfileImage(imageFile);
        if (!uploadedImageUrl) return;
      }
      // Username and image_url update
      if (newUsername || uploadedImageUrl) {
        if (!session?.user?.id) {
          alert("User not authenticated.");
          return;
        }
        const updateObj: any = {};
        if (newUsername) updateObj.username = newUsername;
        if (uploadedImageUrl) updateObj.image_url = uploadedImageUrl;
        const { error: usernameError } = await supadata
          .from('Users_Accounts')
          .update(updateObj)
          .eq('userId', session.user.id);
        if (usernameError) throw usernameError;
      }
      // Password update (uses the new API route)
     if (newPassword) {
  const response = await fetch('/api/updatepass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      newPassword,
      userId: session?.user?.id,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to update password';
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      errorMessage = result.error || errorMessage;
    } else {
      errorMessage = `Server error: Received an unexpected response. Status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }
}

      alert('Profile updated successfully! Please log in again if you changed your credentials.');
      onClose();
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.profileIcon} onClick={handleImageClick} style={{ cursor: 'pointer', position: 'relative' }}>
            {imagePreview ? (
              <Image src={imagePreview} alt="Profile Preview" className={styles.profileImg} width={80} height={80} />
            ) : currentImageUrl ? (
              <Image src={currentImageUrl} alt="Profile" className={styles.profileImg} width={80} height={80} />
            ) : (
              <Profile />
            )}
            {uploading && <span className={styles.uploading}>Uploading...</span>}
          </span>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="newUsername" className={styles.label}>New Username</label>
            <input
              id="newUsername"
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="newPassword" className={styles.label}>New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.footer}>
            <button type="submit" className={styles.updateButton} disabled={uploading}>Update Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal; 