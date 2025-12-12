// Auth Modal - Login/Signup UI Component

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@auth/store';
import { isSupabaseConfigured } from '@auth/supabase';
import { SIGNUP_BONUS_CREDITS, FEATURE_CREDIT_COSTS } from '@auth/types';
import type { FeatureType } from '@auth/types';
import styles from './AuthModal.module.css';

// ============================================================================
// AUTH MODAL
// ============================================================================

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps): React.ReactElement | null {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { signIn, signUp, resendVerificationEmail, isLoading, error, clearError } = useAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setLocalError(null);
      setSuccess(null);
      setPendingVerificationEmail(null);
      clearError();
    }
  }, [isOpen, clearError]);

  // Update mode when initialMode changes
  useEffect(() => {
    setMode(initialMode);
    setLocalError(null);
    setSuccess(null);
    setPendingVerificationEmail(null);
  }, [initialMode]);

  if (!isOpen) return null;

  if (!isSupabaseConfigured()) {
    const handleSetupOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains(styles.overlay)) {
        const handleMouseUp = (upEvent: MouseEvent) => {
          const upTarget = upEvent.target as HTMLElement;
          if (upTarget.classList.contains(styles.overlay)) {
            onClose();
          }
          document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mouseup', handleMouseUp);
      }
    };

    return (
      <div className={styles.overlay} onMouseDown={handleSetupOverlayMouseDown}>
        <div className={styles.modalWrapper} onClick={e => e.stopPropagation()}>
          <div className={styles.modal}>
            <div className={styles.header}>
              <h2 className={styles.title}>⚠️ Setup Required</h2>
              <p className={styles.subtitle}>
                Supabase is not configured. Please set the environment variables:
              </p>
            </div>
            <div className={styles.error}>
              <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
            </div>
            <button className={styles.submitButton} onClick={onClose} style={{ marginTop: '16px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(null);

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return;
      }

      const result = await signUp(email, password);
      if (result.error) {
        setLocalError(result.error);
        setPendingVerificationEmail(null);
      } else if (result.needsEmailConfirmation) {
        setPendingVerificationEmail(result.email || email);
        setSuccess(
          `✉️ Verification email sent to ${result.email}! Please check your inbox and click the confirmation link to activate your account.`
        );
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setPendingVerificationEmail(null);
        setSuccess('Account created successfully! You can now sign in.');
        // Auto-close after a short delay if no verification needed
        setTimeout(() => onClose(), 1500);
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) {
        setLocalError(result.error);
      } else {
        onClose();
      }
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    
    setIsResending(true);
    setLocalError(null);
    
    const result = await resendVerificationEmail(pendingVerificationEmail);
    
    if (result.error) {
      setLocalError(result.error);
    } else {
      setSuccess(`✉️ Verification email resent to ${pendingVerificationEmail}!`);
    }
    
    setIsResending(false);
  };

  const displayError = localError || error;

  // Handle click outside - only close if both mousedown and mouseup happen on overlay
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      const handleMouseUp = (upEvent: MouseEvent) => {
        if (upEvent.target === overlayRef.current) {
          onClose();
        }
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  return (
    <div className={styles.overlay} ref={overlayRef} onMouseDown={handleOverlayMouseDown}>
      <div className={styles.modalWrapper} onClick={e => e.stopPropagation()}>
        <div className={styles.modal}>
          <button className={styles.closeButton} onClick={onClose}>×</button>

          <div className={styles.header}>
            <h2 className={styles.title}>
              {mode === 'signin' ? '👋 Welcome Back' : '✨ Create Account'}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to access AI features'
                : `Get ${SIGNUP_BONUS_CREDITS} free credits on signup!`}
            </p>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`}
              onClick={() => setMode('signin')}
            >
              Sign In
            </button>
            <button
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {displayError && <div className={styles.error}>{displayError}</div>}
          {success && (
            <div className={styles.success}>
              {success}
              {pendingVerificationEmail && (
                <button
                  className={styles.resendButton}
                  onClick={handleResendVerification}
                  disabled={isResending}
                  type="button"
                >
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'signup' && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading
                ? 'Loading...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// USER MENU (for toolbar)
// ============================================================================

interface UserMenuProps {
  onSignInClick: () => void;
}

export function UserMenu({ onSignInClick }: UserMenuProps): React.ReactElement {
  const { user, profile, credits, signOut, updateProfile, isAuthenticated, isLoading, isInitialized } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  // Only show loading if not yet initialized
  if (!isInitialized && isLoading) {
    return (
      <div className={styles.userButton} style={{ opacity: 0.5 }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button className={styles.loginButton} onClick={onSignInClick}>
        <span>🔑</span> Sign In
      </button>
    );
  }

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <div className={styles.userMenu}>
      <button
        ref={buttonRef}
        className={styles.userButton}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <div className={styles.avatar}>{initial}</div>
        <span>{displayName}</span>
        <div className={styles.creditBadge}>
          <span className={styles.creditIcon}>⚡</span>
          {credits?.balance ?? 0}
        </div>
      </button>

      {isOpen && createPortal(
        <div 
          className={styles.dropdown} 
          onClick={e => e.stopPropagation()}
          style={{ 
            position: 'fixed',
            top: dropdownPosition.top, 
            right: dropdownPosition.right 
          }}
        >
          {showProfileEdit ? (
            // Profile editing view
            <div className={styles.profileEdit}>
              <div className={styles.profileEditHeader}>
                <span>Edit Profile</span>
                <button 
                  className={styles.profileEditBack}
                  onClick={() => {
                    setShowProfileEdit(false);
                    setSaveError(null);
                  }}
                >
                  ←
                </button>
              </div>
              
              <div className={styles.profileEditForm}>
                <label className={styles.profileEditLabel}>Display Name</label>
                <input
                  type="text"
                  className={styles.profileEditInput}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  placeholder="Enter display name"
                />
                
                {saveError && (
                  <div className={styles.profileEditError}>{saveError}</div>
                )}
                
                <button
                  className={styles.profileEditSave}
                  disabled={isSaving || !editingName.trim()}
                  onClick={async () => {
                    setIsSaving(true);
                    setSaveError(null);
                    const result = await updateProfile({ displayName: editingName.trim() });
                    setIsSaving(false);
                    if (result.error) {
                      setSaveError(result.error);
                    } else {
                      setShowProfileEdit(false);
                    }
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            // Normal dropdown view
            <>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownEmail}>{user?.email}</div>
                <div className={styles.dropdownCredits}>
                  <span className={styles.creditIcon}>⚡</span>
                  <strong>{credits?.balance ?? 0}</strong> credits available
                </div>
              </div>

              <button 
                className={styles.dropdownItem}
                onClick={() => {
                  setEditingName(profile?.displayName || '');
                  setShowProfileEdit(true);
                }}
              >
                <span>👤</span> Profile
              </button>

              <div className={styles.dropdownDivider} />

              <button
                className={`${styles.dropdownItem} ${styles.signOutButton}`}
                onClick={async () => {
                  await signOut();
                  setIsOpen(false);
                }}
              >
                <span>🚪</span> Sign Out
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ============================================================================
// CREDIT DISPLAY
// ============================================================================

interface CreditDisplayProps {
  showLabel?: boolean;
}

export function CreditDisplay({ showLabel = true }: CreditDisplayProps): React.ReactElement {
  const { credits, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <></>;
  }

  const balance = credits?.balance ?? 0;
  const isLow = balance < 10;

  return (
    <div className={styles.creditDisplay}>
      <span className={styles.creditIcon}>⚡</span>
      <span className={`${styles.creditAmount} ${isLow ? styles.lowCredits : ''}`}>
        {balance}
      </span>
      {showLabel && <span className={styles.creditLabel}>credits</span>}
    </div>
  );
}

// ============================================================================
// AUTH REQUIRED GATE
// ============================================================================

interface AuthRequiredProps {
  children: React.ReactNode;
  feature?: FeatureType;
  onSignInClick: () => void;
}

export function AuthRequired({ children, feature, onSignInClick }: AuthRequiredProps): React.ReactElement {
  const { isAuthenticated, credits, hasEnoughCredits } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className={styles.authRequired}>
        <div className={styles.authRequiredIcon}>🔐</div>
        <h3 className={styles.authRequiredTitle}>Sign In Required</h3>
        <p className={styles.authRequiredText}>
          Create a free account to access AI features and get {SIGNUP_BONUS_CREDITS} credits to start.
        </p>
        <button className={styles.authRequiredButton} onClick={onSignInClick}>
          Sign In / Sign Up
        </button>
      </div>
    );
  }

  // Check credits if feature is specified
  if (feature && !hasEnoughCredits(feature)) {
    const cost = FEATURE_CREDIT_COSTS[feature];
    return (
      <div className={styles.authRequired}>
        <div className={styles.authRequiredIcon}>⚡</div>
        <h3 className={styles.authRequiredTitle}>Insufficient Credits</h3>
        <p className={styles.authRequiredText}>
          This feature requires {cost} credits. You have {credits?.balance ?? 0} credits.
        </p>
        <button className={styles.authRequiredButton} onClick={() => {/* TODO: Open buy credits modal */}}>
          Buy Credits
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
