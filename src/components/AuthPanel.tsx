import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export function AuthPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <div className="pointer-events-auto bg-[#111318] border border-[#2a2d35] shadow-2xl p-4 rounded-xl max-w-sm mb-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#08DDDD] to-transparent opacity-50"></div>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-[#8E9299] font-mono">Operator Status</h2>
          {user ? (
            <p className="text-sm text-white font-mono truncate max-w-[150px]">{user.email}</p>
          ) : (
            <p className="text-sm text-[#ff3333] font-mono">OFFLINE</p>
          )}
        </div>
        
        {user ? (
            <button 
                onClick={logout}
                className="px-3 py-1 text-xs font-mono border border-[#2a2d35] text-[#8E9299] rounded hover:text-white hover:border-white transition-colors"
            >
                DISCONNECT
            </button>
        ) : (
            <button 
                onClick={loginWithGoogle}
                className="px-3 py-1 text-xs font-mono border border-[#08DDDD] text-[#08DDDD] rounded hover:bg-[#08DDDD] hover:text-black transition-colors shadow-[0_0_10px_rgba(8,221,221,0.2)]"
            >
                AUTH REQUIRED
            </button>
        )}
      </div>
    </div>
  );
}
