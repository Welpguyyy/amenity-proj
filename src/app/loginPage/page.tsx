"use client";
import React, { useState, useEffect } from 'react';
import styles from "./index.module.css";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import Image from 'next/image';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { BsBoxArrowLeft } from 'react-icons/bs';
import supadata from '../lib/supabaseclient';


console.log("type of: ", supadata);
async function addData(username: string, password: string, email: string): Promise<boolean> {
 const {data,error} = await supadata
 .from('Users_Accounts')
 .insert([
{
  username:username,
  password: password,
  email: email,
  role: "user",
}

    ])

  const { error: authError } = await supadata.auth.signUp({
    email,
    password,


  })

  if (authError) {
    console.log("Auth signup failesd: ", authError.message);
    return false;
  }

  if (error) {
    console.log("Sending insert:", {
      username: username,
      password: password,
      email: email,
    });
    console.log("Insert failed (full error):");
    console.dir(error, { depth: null });
    return false;
  }
  console.log('Insert success:', data);
  return true;

}


// Types
interface FormState {
  username: string;
  password: string;
  remember: boolean;
}

interface SignUpFormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Login form component
const LogInForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    username: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev: FormState) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setError("Username and password are required.");
      return;
    }

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username: form.username,
        password: form.password,
      });

      if (res?.ok) {
        // Fetch session to get user role
        const session = await getSession();
        setForm({
          username: '',
          password: '',
          remember: false,
        });
        setError("");
        if (session?.user && (session.user as any).role === 'admin') {
          router.push('/adminPage');
        } else {
          router.push('/homePage');
        }
      } else {
        setForm({
          username: '',
          password: '',
          remember: false,
        });
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/homePage' });
  };

  return (
    <div className={styles.formContainer}>
      <h1 className={styles.loginTitle}>Login</h1>

      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <div className={styles.passwordInput}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ?
                <FaEyeSlash className={styles.hidePasswordIcon} /> :
                <FaEye className={styles.showPasswordIcon} />
              }
            </button>
          </div>
        </div>

        <div className={styles.formOptions}>
          <div className={styles.rememberMe}>
            <input
              type="checkbox"
              id="remember"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <label htmlFor="remember" className={styles.yellowText}>Remember me</label>
          </div>
          <button
            type="button"
            className={`${styles.forgotPassword} ${styles.yellowText}`}
            onClick={(e) => router.push('/forgotpassword')}
          >
            Forgot Password?
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.googleButtonWrapper}>
          <button
            type="button"
            className={styles.googleSignInButton}
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className={styles.googleIcon} /> Sign in with Google
          </button>
        </div>

        <button type="submit" className={styles.loginButton}>LOGIN</button>
      </form>
    </div>
  );
};

// Sign up form component
const SignUpForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const [form, setForm] = useState<SignUpFormState>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

  if (!form.username || !form.email || !form.password || !form.confirmPassword) {
    setError("All fields are required.");
    return;
  }

  if (form.password !== form.confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  // ✅ Check for existing email
  const { data: existingEmail, error: emailError } = await supadata
    .from('Users_Accounts')
    .select('*')
    .eq('email', form.email)
    .maybeSingle();

  if (existingEmail) {
    setError("An account with this email already exists.");
    return;
  }

  if (emailError && emailError.code !== 'PGRST116') {
    console.error("Error checking email:", emailError.message);
    setError("Error checking email.");
    return;
  }

  // ✅ Check for existing username
  const { data: existingUsername, error: usernameError } = await supadata
    .from('Users_Accounts')
    .select('*')
    .eq('username', form.username)
    .maybeSingle();

  if (existingUsername) {
    setError("Username already taken.");
    return;
  }

  if (usernameError && usernameError.code !== 'PGRST116') {
    console.error("Error checking username:", usernameError.message);
    setError("Error checking username.");
    return;
  }

  // ✅ Proceed with registration
  const data_insertion = await addData(form.username, form.password, form.email);

  console.log('Insert result: ', data_insertion);
  if (data_insertion) {
    setForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setError("Sign up successful!");
  } else {
    setForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setError("Failed to sign up.");
  }
  };

  return (
    <div className={styles.formContainer}>
      <h1 className={styles.signUpTitle}>Sign Up</h1>

      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="signup-username">Username</label>
          <input
            type="text"
            id="signup-username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
            maxLength={12}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email Address"
          />
        </div>

        <div className={styles.passwordRow}>
          <div className={styles.passwordColumn}>
            <label htmlFor="signup-password">Password</label>
            <div className={styles.passwordInput}>
              <input
                type={showPassword ? "text" : "password"}
                id="signup-password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                maxLength={12}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ?
                  <FaEyeSlash className={styles.hidePasswordIcon} /> :
                  <FaEye className={styles.showPasswordIcon} />
                }
              </button>
            </div>
          </div>

          <div className={styles.passwordColumn}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={styles.passwordInput}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                maxLength={12}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ?
                  <FaEyeSlash className={styles.hidePasswordIcon} /> :
                  <FaEye className={styles.showPasswordIcon} />
                }
              </button>
            </div>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button type="submit" className={styles.createAccountButton}>CREATE ACCOUNT</button>
      </form>
    </div>
  );
};

// Main authentication page component
const AuthPage = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Initialize component state after mount to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleBackToLanding = () => {
    router.push('/landingPage');
  };

  // Handle switch between login and signup
  const handleSwitchForm = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogin(!showLogin);
  };

  // Simple loading state while client rendering is ready
  if (!isClient) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authContainer}>
        <div className={styles.leftBox}>
          <div className={styles.logoContainer}>
            <div className={styles.logoWrapper}>
              <Image
                src="/images/tree.png"
                alt="Amenity Logo"
                width={400}
                height={400}
                className={styles.logo}
                priority
              />
            </div>
            <h1 className={styles.brandName}>Amenity</h1>
          </div>

          <div className={styles.bottomText}>
            {showLogin ? (
              <p className={styles.alreadyAccountText}>Don't have an account? <button className={styles.linkButton} onClick={handleSwitchForm}>Sign Up</button></p>
            ) : (
              <p className={styles.alreadyAccountText}>Already have an account? <button className={styles.linkButton} onClick={handleSwitchForm}>Login</button></p>
            )}
          </div>
        </div>

        <div className={styles.rightBox}>
          {showLogin ? (
            <LogInForm onSwitch={() => setShowLogin(false)} />
          ) : (
            <SignUpForm onSwitch={() => setShowLogin(true)} />
          )}
        </div>
      </div>

      <button
        className={styles.backButton}
        onClick={handleBackToLanding}
        aria-label="Back to landing page"
      >
        <BsBoxArrowLeft className={styles.backButtonIcon} />
      </button>
    </div>
  );
};
export default AuthPage;
