'use client';

import React, { useState, useEffect } from 'react';
import styles from './CreatePostModal.module.css';
import { Image as ImageIcon, Edit, Close } from '@/app/components/svgs';
import supadata from '../lib/supabaseclient';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../homePage/cropImage';
import { amenityAlert } from "../components/amenityAlert";
import { Filter } from 'bad-words';
import Image from 'next/image';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

// Upload image and return public URL or null
async function uploadImage(file: File): Promise<string | null> {
  const filePath = `public/${Date.now()}_${file.name}`;
  const { data, error } = await supadata.storage
    .from('post-images')
    .upload(filePath, file);

  if (error || !data) {
    console.error('Image upload failed:', error?.message);
    return null;
  }

  const { data: publicUrlData } = supadata.storage
    .from('post-images')
    .getPublicUrl(data.path);

  return publicUrlData?.publicUrl || null;
}

// Add post to database
async function addPost(
  content: string,
  image_url: string | null,
  topic: string,
  usernameOrEmail: string
): Promise<boolean> {

  console.log("username: " + usernameOrEmail);
  const { data: userData, error: userError } = await supadata

    .from('Users_Accounts')
    .select('userId')
    .eq('username', usernameOrEmail);

  if (userError || !userData || userData.length === 0) {
    console.error('User lookup failed:', userError?.message);
    return false;
  }

  const user_id = userData[0].userId;
  const updatedAt = new Date().toISOString();

  const { error: postError } = await supadata.from('Posts').insert([
    {
      content: content,
      image_url: image_url,
      topic: topic,
      user_id,
      updated_at: updatedAt,
    },
  ]);

  if (postError) {
    console.error('Post insert error:', postError.message);
    return false;
  }

  return true;
}

const badWords = [
  'bad', 'word', 'example', 'inappropriate', 'profanity', 'curse', 'swear',
  'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'piss', 'cock', 'dick',
  'pussy', 'cunt', 'whore', 'slut', 'bastard', 'motherfucker', 'fucker',
  'fucking', 'shitty', 'asshole', 'dumbass', 'jackass', 'dickhead', 'prick',
  'twat', 'wanker', 'bollocks', 'bugger', 'bloody', 'chuff', 'stupid',
  'knob', 'knobhead', 'minge', 'minger', 'minging',
  'putangina', 'puta', 'gago', 'gaga', 'tanga', 'bobo', 'ulol', 'leche',
  'lintik', 'bwisit', 'hayop', 'pakyu', 'punyeta', 'tarantado', 'peste',
  'hindot', 'kantot', 'kantutan', 'salsal', 'jakol', 'bayag', 'puke',
  'etits', 'pekpek', 'utong', 'susuka', 'iputok', 'burat', 'puchu', 'ampota',
  'animal', 'buwisit', 'syet', 'syota', 'pakyut'
];

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, username }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filter = new Filter();
  filter.addWords(...badWords);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double click
    setIsSubmitting(true);

    let imageUrl: string | null = null;

    try {
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          alert('Image upload failed!');
          return;
        }
      }

// Filter topic and content
const cleanTopic = filter.clean(topic);
const cleanContent = filter.clean(content);

const success = await addPost(cleanContent, imageUrl, cleanTopic, username);


      if (success) {
        amenityAlert(
          "Post Created!",
          "Your post has been successfully created.",
          "success"
        );
        setContent('');
        setTopic('');
        setImageFile(null);
        setImagePreview(null);
        onClose();
      } else {
        amenityAlert(
          "Failed",
          "Failed to create post. Try again.",
          "error"
        );
      }
    } catch (error) {
      console.error('Submission error:', error);
      amenityAlert(
        "Error",
        "An error occurred while posting.",
        "error"
      );
    } finally {
      setIsSubmitting(false); // Reset after everything
    }
  };

  // Handler for crop complete
  const onCropComplete = (_: unknown, croppedAreaPixels: unknown) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // Handler for confirming crop
  const handleCropImage = async () => {
    if (!imagePreview || !croppedAreaPixels) return;
    const croppedUrl = await getCroppedImg(imagePreview, croppedAreaPixels);
    setImagePreview(croppedUrl);
    // Convert blob URL to File for upload
    const response = await fetch(croppedUrl);
    const blob = await response.blob();
    const file = new File([blob], imageFile?.name || 'cropped.jpg', { type: 'image/jpeg' });
    setImageFile(file);
    setShowCropModal(false);
  };

  return (
    <div className={styles.overlay} style={{ display: isOpen ? 'flex' : 'none' }} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.avatar}></div>
          <span className={styles.username}>{username}</span>
        </div>
        <input
          type="text"
          placeholder="Topic"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          className={styles.topicInput}
        />
        <textarea
          className={styles.textarea}
          placeholder="Write something..."
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        {/* Image preview */}
        {imagePreview && (
          <div style={{ margin: '1rem', textAlign: 'center', position: 'relative', display: 'inline-block' }}>
            {/* Edit (crop) button */}
            <button
              type="button"
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(78, 78, 78, 0.42)',
                border: 'none',
                borderRadius: '50%',
                padding: 4,
                cursor: 'pointer',
                zIndex: 2
              }}
              onClick={() => setShowCropModal(true)}
              aria-label="Edit image"
            >
              <Edit width={20} height={20} />
            </button>
            {/* Close (remove image) button */}
            <button
              type="button"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(255, 255, 255, 0)',
                border: 'none',
                borderRadius: '50%',
                padding: 4,
                cursor: 'pointer',
                zIndex: 2
              }}
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              aria-label="Remove image"
            >
              <Close width={20} height={20} />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 12, width: 200, height: 100 }}
            />
          </div>
        )}
        {/* Cropping modal placeholder */}
        {showCropModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, minWidth: 320, minHeight: 420, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
                onClick={() => setShowCropModal(false)}
                aria-label="Close crop modal"
              >
                ×
              </button>
              {/* Cropper UI */}
              <div style={{ position: 'relative', width: 300, height: 300, background: '#333' }}>
                <Cropper
                  image={imagePreview!}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              {/* Zoom slider */}
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ width: 200, margin: '16px 0' }}
              />
              {/* Crop/Cancel buttons */}
              <div style={{ display: 'flex', gap: 16 }}>
                <button onClick={handleCropImage} style={{ padding: '8px 16px', borderRadius: 6, background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer' }}>Crop</button>
                <button onClick={() => setShowCropModal(false)} style={{ padding: '8px 16px', borderRadius: 6, background: '#eee', color: '#333', border: 'none', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none', margin: '1rem' }}
          id="image-upload"
          onChange={handleImageChange}
        />
        <div className={styles.footer}>
          <button
            className={styles.postBtn}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
          <button
            className={styles.imageBtn}
            onClick={() => {
              const input = document.getElementById('image-upload') as HTMLInputElement | null;
              if (input) input.click();
            }}
          >
            <span><ImageIcon /></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
