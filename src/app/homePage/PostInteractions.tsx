'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Like } from '@/app/components/svgs';
import supadata from '../lib/supabaseclient';

interface PostInteractionsProps {
  postId: number;
  currentUserId: string;
}

const PostInteractions: React.FC<PostInteractionsProps> = ({ postId, currentUserId }) => {
  const [likeCount, setLikeCount] = useState(0);
  const [userLike, setUserLike] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInteractionState = useCallback(async () => {
    const { data: interactions } = await supadata
      .from('post_interactions')
      .select('likes, user_id')
      .eq('post_id', postId);

    if (interactions) {
      setLikeCount(interactions.filter(i => i.likes === 1).length);
      const user = interactions.find(i => i.user_id === currentUserId);
      setUserLike(user?.likes === 1);
    }
  }, [postId, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchInteractionState();
  }, [fetchInteractionState]);

  const sendLikeNotification = async () => {
    const { data: postData, error: postError } = await supadata
      .from('Posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!postError && postData && postData.user_id !== currentUserId) {
      await supadata.from('notifications').insert([
        {
          user_id: postData.user_id,
          post_id: postId,
          type: 'like',
          message: `Someone liked your post.`,
          is_read: false,
          created_at: new Date(),
        },
      ]);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: existing } = await supadata
      .from('post_interactions')
      .select('id, likes')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (existing) {
      if (existing.likes === 1) {
        // Already liked, remove like
        await supadata.from('post_interactions').delete().eq('id', existing.id);
        setUserLike(false);
        setLikeCount(prev => Math.max(prev - 1, 0));
      } else {
        // Was neutral, switch to like
        await supadata
          .from('post_interactions')
          .update({ likes: 1 })
          .eq('id', existing.id);

        setUserLike(true);
        setLikeCount(prev => prev + 1);
        await sendLikeNotification();
      }
    } else {
      // No interaction yet, insert like
      await supadata.from('post_interactions').insert([
        { post_id: postId, user_id: currentUserId, likes: 1 },
      ]);
      setUserLike(true);
      setLikeCount(prev => prev + 1);
      await sendLikeNotification();
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
      <button
        onClick={handleLike}
        disabled={loading}
        style={{
          background: 'none',
          border: 'none',
          color: userLike ? '#ffe8a3' : '#fff',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 16,
          padding: '8px 12px',
          borderRadius: '8px',
          transition: 'all 0.2s ease-in-out',
          transform: 'scale(1)',
          left: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.background = 'rgba(255, 232, 163, 0.1)';
          e.currentTarget.style.color = '#ffe8a3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = userLike ? '#ffe8a3' : '#fff';
        }}
        aria-label="Like"
      >
        <Like style={{ width: 24, height: 24, marginRight: 6 }} />
        <span>{likeCount}</span>
      </button>
    </div>
  );
};

export default PostInteractions;
