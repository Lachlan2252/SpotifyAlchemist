interface HeaderProps {
  user: {
    displayName?: string;
    imageUrl?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center">
        <div className="flex items-center spotify-gray rounded-full py-2 px-4">
          <img 
            src={user.imageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32"} 
            alt="User profile" 
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="ml-3 text-sm font-medium">{user.displayName || 'User'}</span>
          <i className="fas fa-chevron-down ml-2 text-xs"></i>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-spotify-green">
          <i className="fab fa-spotify text-xl mr-2"></i>
          <span className="text-sm font-medium">Connected</span>
        </div>
        <a
          href="/api/auth/logout"
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Logout
        </a>
      </div>
    </header>
  );
}
