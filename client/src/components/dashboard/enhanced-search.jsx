import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Clock, CheckCircle, Calendar, X, TrendingUp, Briefcase, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { searchUsers } from '@/lib/user-api';
import { cn } from '@/lib/utils';

export function EnhancedSearch({ onUserSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const itemRefs = useRef([]);

  // Search users function
  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(false);
    try {
      const results = await searchUsers(query);
      setSuggestions(results);
      setHasSearched(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(value.length > 0);
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    setSearchQuery('');
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    setHasSearched(false);
    onUserSelect(user);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    setHasSearched(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleUserSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate completion rate color
  const getCompletionRateColor = (rate) => {
    if (rate >= 90) return 'text-emerald-500 dark:text-emerald-400';
    if (rate >= 75) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-primary/20 text-primary font-semibold rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="search-container relative w-full max-w-md flex-1 hidden md:flex group" ref={searchRef}>
      {/* Search Icon */}
      <Search className={cn(
        "absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 z-10",
        searchQuery 
          ? "text-primary scale-110" 
          : "text-muted-foreground group-focus-within:text-primary group-focus-within:scale-110"
      )} />
      
      {/* Search Input */}
      <Input
        type="search"
        placeholder="Search users, tasks, departments..."
        className={cn(
          "w-full pl-12 h-12 rounded-2xl transition-all duration-300 text-sm font-medium placeholder:text-muted-foreground/70",
          "bg-gradient-to-r from-card/50 via-card/30 to-card/50 backdrop-blur-sm",
          "border-2 border-transparent hover:border-primary/20 focus-visible:border-primary/40",
          "shadow-lg hover:shadow-xl hover:shadow-primary/10 dark:hover:shadow-primary/5",
          "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
          searchQuery ? "pr-10 border-primary/30" : "pr-4"
        )}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => searchQuery && setIsOpen(true)}
      />

      {/* Clear Button */}
      {searchQuery && (
        <button
          onClick={handleClearSearch}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 z-10 group/clear"
        >
          <X className="h-4 w-4 group-hover/clear:rotate-90 transition-transform duration-200" />
        </button>
      )}

      {/* Search Suggestions Dropdown */}
      {isOpen && (
        <Card
          ref={suggestionsRef}
          className={cn(
            "absolute top-full left-0 mt-3 z-50",
            "w-[600px]",
            "bg-card/98 dark:bg-card/95 backdrop-blur-2xl",
            "border-2 border-primary/30 dark:border-primary/20",
            "shadow-2xl dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]",
            "rounded-2xl overflow-hidden",
            "animate-in fade-in slide-in-from-top-2 duration-200",
            "ring-1 ring-primary/10"
          )}
        >
          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <Search className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Searching...</p>
                  <p className="text-xs text-muted-foreground">Finding the best matches for you</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && suggestions.length > 0 && (
            <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="sticky top-0 z-10 backdrop-blur-xl bg-card/80 border-b border-border/50">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Users Found
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {suggestions.length} {suggestions.length === 1 ? 'result' : 'results'}
                  </Badge>
                </div>
              </div>

              {/* User List */}
              <div className="p-3 space-y-2">
                {suggestions.map((user, index) => {
                  if (!user || !user.name) return null;

                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={user._id || user.id}
                      ref={el => itemRefs.current[index] = el}
                      onClick={() => handleUserSelect(user)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200",
                        "border border-transparent hover:border-primary/30",
                        "group/item relative overflow-hidden",
                        isSelected 
                          ? "bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border-primary/40 shadow-lg" 
                          : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5"
                      )}
                    >
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-700 ease-in-out" />

                      {/* Avatar */}
                      <Avatar className={cn(
                        "h-12 w-12 ring-2 transition-all duration-300 shadow-md flex-shrink-0",
                        isSelected 
                          ? "ring-primary/60 ring-4 shadow-xl shadow-primary/20" 
                          : "ring-primary/20 group-hover/item:ring-primary/50 group-hover/item:ring-4 group-hover/item:shadow-xl group-hover/item:shadow-primary/20"
                      )}>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* User Info */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Name and Role */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <h4 className={cn(
                              "font-bold text-base transition-colors duration-200 truncate",
                              isSelected ? "text-primary" : "text-foreground group-hover/item:text-primary"
                            )}>
                              {highlightMatch(user.name, searchQuery)}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs shrink-0 transition-all duration-200",
                                isSelected 
                                  ? "border-primary bg-primary/10 text-primary" 
                                  : "border-primary/30 group-hover/item:border-primary group-hover/item:bg-primary/10"
                              )}
                            >
                              {user.role}
                            </Badge>
                          </div>
                          
                          {/* Department Badge */}
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {user.department?.name || user.department || 'No Dept'}
                          </Badge>
                        </div>

                        {/* Email */}
                        {user.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}

                        {/* Stats Row - Better Horizontal Layout */}
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-4">
                            {/* Completion Rate */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
                              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-muted-foreground">Completion:</span>
                              <span className={cn("font-bold", getCompletionRateColor(user.completionRate))}>
                                {user.completionRate}%
                              </span>
                            </div>
                            
                            {/* Active Tasks */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10">
                              <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {user.activeTasks} active
                              </span>
                            </div>
                          </div>

                          {/* Join Date */}
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Joined {new Date(user.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Keyboard Indicator */}
                      {isSelected && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                          <span>Press</span>
                          <kbd className="px-1.5 py-0.5 bg-primary/20 rounded border border-primary/30">↵</kbd>
                        </div>
                      )}
                    </div>
                  );
                }).filter(Boolean)}
              </div>

              {/* Footer Hint */}
              <div className="sticky bottom-0 backdrop-blur-xl bg-card/80 border-t border-border/50 px-4 py-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium border border-border">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium border border-border">↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium border border-border">↵</kbd>
                    <span>Select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium border border-border">Esc</kbd>
                    <span>Close</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && hasSearched && suggestions.length === 0 && (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    We couldn't find any users matching "<span className="font-semibold text-foreground">{searchQuery}</span>"
                  </p>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Try searching by:</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">Name</Badge>
                    <Badge variant="outline" className="text-xs">Email</Badge>
                    <Badge variant="outline" className="text-xs">Department</Badge>
                    <Badge variant="outline" className="text-xs">Role</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
