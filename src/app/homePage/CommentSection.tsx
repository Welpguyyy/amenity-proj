import React, { useEffect, useState, useCallback } from 'react';
import supadata from '../lib/supabaseclient';
import { Arrow, Comments, Delete } from '@/app/components/svgs';
import styles from './HomePage.module.css';
import { Filter } from 'bad-words';

interface Comment {
  id: number;
  created_at: string;
  content: string;
  post_id: number;
  user_id: string;
}

interface Reply {
  id: number;
  comment_id: number;
  user_id: string;
  content: string;
  created_at: string;
}

interface CommentSectionProps {
  postId: number;
  currentUserId: string;
}

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

const CommentSection: React.FC<CommentSectionProps> = ({ postId, currentUserId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [repliesMap, setRepliesMap] = useState<Record<number, Reply[]>>({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const filter = new Filter();
  filter.addWords(...badWords);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: commentsData, error: commentError } = await supadata
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentError) throw commentError;

      setComments(commentsData || []);

      const commentIds = (commentsData || []).map(c => c.id);
      await fetchReplies(commentIds);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchReplies = useCallback(async (commentIds: number[]) => {
    if (commentIds.length === 0) return;

    try {
      const { data, error } = await supadata
        .from('comment_replies')
        .select('*')
        .in('comment_id', commentIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const map: Record<number, Reply[]> = {};
      (data || []).forEach(reply => {
        if (!map[reply.comment_id]) map[reply.comment_id] = [];
        map[reply.comment_id].push(reply);
      });

      setRepliesMap(map);
    } catch (err) {
      console.error('Failed to fetch replies:', JSON.stringify(err, null, 2));
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
  if (!newComment.trim()) return;

  setLoading(true);
  setError(null);

  try {
    // Filter comment content
    const cleanComment = filter.clean(newComment);
    // Step 1: Insert the comment
    const { error: commentError } = await supadata.from('post_comments').insert([
      {
        content: cleanComment,
        post_id: postId,
        user_id: currentUserId,
        created_at: new Date().toISOString(),
      },
    ]);

    if (commentError) throw commentError;

    // Step 2: Fetch post owner
    const { data: postData, error: postError } = await supadata
      .from('Posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    const postOwnerId = postData?.user_id;

    // Step 3: Insert notification (if commenter is not the post owner)
    if (postOwnerId && postOwnerId !== currentUserId) {
      await supadata.from('notifications').insert([
        {
          type: 'comment',
          user_id: postOwnerId,
          post_id: postId,
          message: 'Someone commented on your post.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setNewComment('');
    await fetchComments();
  } catch (err) {
    console.error('Insert comment failed:', err);
    setError('Failed to post comment');
  } finally {
    setLoading(false);
  }
  };

  return (
    <div style={{ marginTop: '1rem', background: '#18213a', borderRadius: 8, padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setCommentsOpen((o: boolean) => !o)}>
        <h4 style={{ marginBottom: 8 }}>Comments</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Comments style={{ width: 22, height: 22 }} />
          <span style={{ color: '#ffe8a3', fontWeight: 600 }}>{comments.length}</span>
          <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: commentsOpen ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft: 8 }}>
            <Arrow style={{ width: 22, height: 22 }} />
          </span>
        </div>
      </div>
      <div className={`${styles.commentDropdown} ${commentsOpen ? styles.open : ''}`}>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <div>
          {comments.length === 0 ? (
            <div>No comments yet.</div>
          ) : (
            comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={repliesMap[comment.id] || []}
                currentUserId={currentUserId}
                onReplyAdded={fetchComments}
                onCommentDeleted={fetchComments}
              />
            ))
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newComment}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              borderRadius: 6,
              border: '1px solid #333',
              padding: 8,
              background: '#1e2b48',
              color: '#fff',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            style={{
              background: '#ffe8a3',
              color: '#22305a',
              border: 'none',
              borderRadius: 6,
              padding: '0 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            disabled={loading}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  replies: Reply[];
  currentUserId: string;
  onReplyAdded: () => void;
  onCommentDeleted: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, replies, currentUserId, onReplyAdded, onCommentDeleted }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repliesOpen, setRepliesOpen] = useState(false);

  const handleReplySubmit = async (e: React.FormEvent) => {
     e.preventDefault();
  if (!replyText.trim()) return;

  setLoading(true);
  setError(null);

  try {
    // 1. Insert the reply
    const { error: insertError } = await supadata.from('comment_replies').insert([
      {
        comment_id: comment.id,
        user_id: currentUserId,
        content: replyText,
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) throw insertError;

    // 2. Fetch comment owner and post ID from post_comments
    const { data: commentData, error: fetchError } = await supadata
      .from('post_comments')
      .select('user_id, post_id')
      .eq('id', comment.id)
      .single();

    if (fetchError) throw fetchError;

    const commentOwnerId = commentData?.user_id;
    const postIdForNotification = commentData?.post_id;

    // 3. Insert notification (only if not replying to your own comment)
    if (commentOwnerId && commentOwnerId !== currentUserId) {
      await supadata.from('notifications').insert([
        {
          type: 'reply',
          user_id: commentOwnerId, // notify the original comment owner
          post_id: postIdForNotification,
          message: 'Someone replied to your comment.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    // 4. Reset input and refresh
    setReplyText('');
    setShowReplyInput(false);
    onReplyAdded();
  } catch (err) {
    console.error('Reply insert failed:', err);
    setError('Failed to post reply');
  } finally {
    setLoading(false);
  }
  };

  const handleDeleteComment = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setLoading(true);
    setError(null);

    try {
      // First delete all replies to this comment
      const { error: repliesError } = await supadata
        .from('comment_replies')
        .delete()
        .eq('comment_id', comment.id);

      if (repliesError) throw repliesError;

      // Then delete the comment
      const { error: commentError } = await supadata
        .from('post_comments')
        .delete()
        .eq('id', comment.id);

      if (commentError) throw commentError;

      onCommentDeleted();
    } catch (err) {
      console.error('Delete comment failed:', err);
      setError('Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      const { error } = await supadata
        .from('comment_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      onReplyAdded();
    } catch (err) {
      console.error('Delete reply failed:', err);
      setError('Failed to delete reply');
    }
  };

  return (
    <div style={{ marginBottom: 12, padding: 8, background: '#22305a', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, color: '#ffe8a3' }}>
          <span style={{ marginRight: 8 }}>[User]</span>
          <span style={{ color: '#aaa', fontSize: 12 }}>{new Date(comment.created_at).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setRepliesOpen((o: boolean) => !o)}>
            <Comments style={{ width: 18, height: 18 }} />
            <span style={{ color: '#ffe8a3', fontWeight: 600 }}>{replies.length}</span>
            <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: repliesOpen ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft: 6 }}>
              <Arrow style={{ width: 18, height: 18 }} />
            </span>
          </div>
          {comment.user_id === currentUserId && (
            <button
              onClick={handleDeleteComment}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b6b',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Delete comment"
            >
              <Delete style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <CollapsibleText text={comment.content} maxLength={150} />
      </div>
      <div className={`${styles.replyDropdown} ${repliesOpen ? styles.open : ''}`}>
        {replies.length === 0 ? (
          <div>No replies yet.</div>
        ) : (
          replies.map(reply => (
            <div key={reply.id} style={{ background: '#2d3a5a', borderRadius: 6, padding: 6, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, color: '#ffe8a3' }}>
                  <span style={{ marginRight: 8 }}>[User]</span>
                  <span style={{ color: '#aaa', fontSize: 11 }}>{new Date(reply.created_at).toLocaleString()}</span>
                </div>
                {reply.user_id === currentUserId && (
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete reply"
                  >
                    <Delete style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              <div style={{ marginTop: 2 }}>
                <CollapsibleText text={reply.content} maxLength={100} />
              </div>
            </div>
          ))
        )}
      </div>
      {/* Reply Button and Input */}
      <button
        style={{
          marginTop: 6,
          background: 'none',
          color: '#ffe8a3',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
        }}
        onClick={() => setShowReplyInput(!showReplyInput)}
      >
        Reply
      </button>
      {showReplyInput && (
        <form onSubmit={handleReplySubmit} style={{ marginTop: 6, display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={replyText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            style={{
              flex: 1,
              borderRadius: 6,
              border: '1px solid #333',
              padding: 6,
              background: '#1e2b48',
              color: '#fff',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            style={{
              background: '#ffe8a3',
              color: '#22305a',
              border: 'none',
              borderRadius: 6,
              padding: '0 12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </form>
      )}
      {error && <div style={{ color: 'red', fontSize: 12 }}>{error}</div>}
    </div>
  );
};

export default CommentSection;
