'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supadata from '../lib/supabaseclient';
import './resetpass.css'; // ⬅️ Add this line to use styles

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const userid = localStorage.getItem('resetUserId');

    if (!userid) {
      setMessage('User not logged in');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    const { error } = await supadata
      .from('Users_Accounts')
      .update({ password: newPassword })
      .eq('userId', userid);

    console.log("id to update:", userid);
    console.log("new password is:", newPassword);

    if (error) {
      setMessage('Failed to update password');
    } else {
      setMessage('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/loginPage'), 1500);
    }
  };

  return (
    <div className="reset-container">
      <form onSubmit={handleChangePassword} className="reset-card">
        <h2>Reset Your Password</h2>

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit">Update Password</button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
