'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import supadata from '../lib/supabaseclient';
import './forgotpass.css'; // ⬅️ Add this line to include the styles

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await signIn('credentials', {
      redirect: false,
      email,
      mode: 'resetpassword',
    });

    if (res?.ok === false && res?.error !== 'CredentialsSignin') {
      alert('Could not send reset email.');
    } else {
      alert('Password reset email sent! Check your inbox.');
    }

    localStorage.setItem('resetEmail', email);

    const { data } = await supadata
      .from('Users_Accounts')
      .select('userId')
      .eq('email', email)
      .single();

    if (data?.userId) {
      localStorage.setItem('resetUserId', data.userId);
    }
  };

  return (
    <div className="forgot-container">
      <form onSubmit={handleSubmit} className="forgot-card">
        <h2>Forgot Password</h2>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
    </div>
  );
}
