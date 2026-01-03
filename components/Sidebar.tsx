import React, { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Types
interface ChatHistoryItem {
  id: string;
  preview: string;
  mood?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: { email?: string } | null;
  chatHistory: ChatHistoryItem[];
  isLoadingChatHistory: boolean;
  onLoadConversation: (id: string) => Promise<unknown>;
  onStartNewConversation: () => Promise<void>;
  onConversationSelected: (id: string | null) => void;
  onSignOut: () => void;
  onSignIn: () => void;
  Logo: React.ComponentType<{ className?: string }>;
}

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
} as const;

const sidebarVariants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring' as const,
      damping: 30,
      stiffness: 300
    }
  },
  exit: {
    x: '-100%',
    transition: {
      type: 'spring' as const,
      damping: 30,
      stiffness: 300
    }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03 }
  })
};

// Icons - minimal line style like ChatGPT
const Icons = {
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  NewChat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  HowItWorks: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v.01M12 8a2 2 0 012 2c0 1-1 1.5-1.5 2s-.5 1-.5 1.5" />
    </svg>
  ),
  Library: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  Templates: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Voice: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  ),
  SignOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  SignIn: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <polyline points="10,17 15,12 10,7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
};

// Menu item component
const MenuItem = memo(({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  variant = 'default'
}: {
  icon: React.ComponentType;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  variant?: 'default' | 'danger' | 'accent';
}) => {
  const baseStyles = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150";
  const variantStyles = {
    default: `text-slate-300 hover:text-white hover:bg-white/[0.06] ${isActive ? 'bg-white/[0.08] text-white' : ''}`,
    danger: 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/[0.06]',
    accent: 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/[0.08]'
  };

  return (
    <button onClick={onClick} className={`${baseStyles} ${variantStyles[variant]}`}>
      <Icon />
      <span>{label}</span>
    </button>
  );
});

MenuItem.displayName = 'MenuItem';

// Chat history item component
const ChatItem = memo(({
  item,
  onClick,
  index
}: {
  item: ChatHistoryItem;
  onClick: () => void;
  index: number;
}) => (
  <m.button
    custom={index}
    variants={listItemVariants}
    initial="hidden"
    animate="visible"
    onClick={onClick}
    className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 hover:bg-white/[0.04]"
  >
    <span className="flex-shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors">
      <Icons.Chat />
    </span>
    <span className="flex-1 text-[13px] text-slate-400 group-hover:text-slate-200 truncate transition-colors">
      {item.preview}
    </span>
    {item.mood && (
      <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400/80 font-medium uppercase tracking-wide">
        {item.mood}
      </span>
    )}
  </m.button>
));

ChatItem.displayName = 'ChatItem';

// Main Sidebar component
export const Sidebar = memo(({
  isOpen,
  onClose,
  user,
  chatHistory,
  isLoadingChatHistory,
  onLoadConversation,
  onStartNewConversation,
  onConversationSelected,
  onSignOut,
  onSignIn,
  Logo
}: SidebarProps) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleNewChat = async () => {
    await onStartNewConversation();
    onConversationSelected(null);
    onClose();
  };

  const handleLoadChat = async (id: string) => {
    const conversation = await onLoadConversation(id);
    if (conversation) {
      onConversationSelected(id);
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />

          {/* Sidebar Panel */}
          <m.aside
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 left-0 h-full w-[280px] z-[95] flex flex-col bg-[#0a0f1a] border-r border-white/[0.04]"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.04]">
              <button
                onClick={() => { handleNavigation('/'); }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Logo className="h-5 text-white" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <Icons.Close />
              </button>
            </div>

            {/* New Chat Button */}
            {user && (
              <div className="px-3 py-3">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 text-[13px] font-medium hover:bg-white/[0.06] hover:border-cyan-500/20 hover:text-white transition-all duration-150"
                >
                  <Icons.NewChat />
                  <span>New chat</span>
                </button>
              </div>
            )}

            {/* Navigation */}
            <nav className="px-3 py-2 space-y-0.5">
              <MenuItem
                icon={Icons.HowItWorks}
                label="How it works"
                onClick={() => handleNavigation('/how-it-works')}
              />
              <MenuItem
                icon={Icons.Library}
                label="Library"
                onClick={() => handleNavigation('/library')}
              />
              <MenuItem
                icon={Icons.Templates}
                label="Templates"
                onClick={() => handleNavigation('/templates')}
              />
              <MenuItem
                icon={Icons.Voice}
                label="Voice"
                onClick={() => handleNavigation('/voice')}
              />
            </nav>

            {/* Divider */}
            <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* Chat History Section */}
            <div className="flex-1 flex flex-col min-h-0 px-3">
              <div className="flex items-center justify-between py-2 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Recent
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
                {user ? (
                  isLoadingChatHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                  ) : chatHistory.length > 0 ? (
                    chatHistory.slice(0, 20).map((item, index) => (
                      <ChatItem
                        key={item.id}
                        item={item}
                        index={index}
                        onClick={() => handleLoadChat(item.id)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[13px] text-slate-500">No conversations yet</p>
                      <p className="text-[11px] text-slate-600 mt-1">Start a new chat above</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 px-4">
                    <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                      <Icons.User />
                    </div>
                    <p className="text-[13px] text-slate-400 mb-3">Sign in to save your history</p>
                    <button
                      onClick={() => { onClose(); onSignIn(); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[12px] font-medium hover:bg-cyan-500/20 transition-all"
                    >
                      <Icons.SignIn />
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-3 border-t border-white/[0.04] space-y-1">
              {user ? (
                <>
                  {/* User info */}
                  <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-cyan-400">
                      <Icons.User />
                    </div>
                    <span className="flex-1 text-[12px] text-slate-400 truncate">
                      {user.email}
                    </span>
                  </div>
                  <MenuItem
                    icon={Icons.SignOut}
                    label="Sign out"
                    onClick={() => { onClose(); onSignOut(); }}
                    variant="danger"
                  />
                </>
              ) : null}

              {/* Footer links */}
              <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-slate-500">
                <button onClick={() => handleNavigation('/about')} className="hover:text-slate-300 transition-colors">
                  About
                </button>
                <span className="text-slate-700">·</span>
                <button onClick={() => handleNavigation('/terms')} className="hover:text-slate-300 transition-colors">
                  Terms
                </button>
                <span className="text-slate-700">·</span>
                <button onClick={() => handleNavigation('/privacy')} className="hover:text-slate-300 transition-colors">
                  Privacy
                </button>
              </div>
              <p className="text-[9px] text-slate-600 text-center pt-1">© {new Date().getFullYear()} INrVO</p>
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
