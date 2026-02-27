'use client';

import { useState, useEffect } from 'react';

interface TimelineDay {
  date: string;
  count: number;
  memories: { name: string; path: string; preview: string }[];
  hasActionItems: boolean;
  tags: string[];
  contacts: string[];
}

interface MemoryTimelineProps {
  memories: { name: string; path: string; content: string; lastModified: string }[];
  onDayClick: (date: string) => void;
  onClose: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MemoryTimeline({ memories, onDayClick, onClose }: MemoryTimelineProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timelineData, setTimelineData] = useState<Map<string, TimelineDay>>(new Map());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'activity'>('calendar');

  // Process memories into timeline data
  useEffect(() => {
    const data = new Map<string, TimelineDay>();
    
    for (const memory of memories) {
      // Extract date from memory path or lastModified
      let dateKey: string;
      
      if (memory.path.includes('memory/') && memory.path.endsWith('.md')) {
        // Daily memory: extract date from path
        dateKey = memory.path.replace('memory/', '').replace('.md', '');
      } else {
        // Use lastModified date
        dateKey = memory.lastModified.split('T')[0];
      }
      
      // Parse content for metadata
      const tagMatches = memory.content.match(/#([a-zA-Z0-9_-]+)/g) || [];
      const contactMatches = memory.content.match(/@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g) || [];
      const hasActionItems = memory.content.includes('- [ ]');
      
      // Get preview (first 100 chars)
      const preview = memory.content.replace(/[#*@[\]]/g, '').substring(0, 100).trim();
      
      const existing = data.get(dateKey) || {
        date: dateKey,
        count: 0,
        memories: [],
        hasActionItems: false,
        tags: [],
        contacts: [],
      };
      
      existing.count++;
      existing.memories.push({
        name: memory.name,
        path: memory.path,
        preview,
      });
      existing.hasActionItems = existing.hasActionItems || hasActionItems;
      existing.tags = [...new Set([...existing.tags, ...tagMatches.map(t => t.replace('#', ''))])];
      existing.contacts = [...new Set([...existing.contacts, ...contactMatches.map(c => c.replace('@', ''))])];
      
      data.set(dateKey, existing);
    }
    
    setTimelineData(data);
  }, [memories]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days: { date: string; isCurrentMonth: boolean; dayNum: number }[] = [];
    
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: false,
        dayNum: day,
      });
    }
    
    // Current month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: true,
        dayNum: day,
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length; // 6 rows of 7 days
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date: date.toISOString().split('T')[0],
        isCurrentMonth: false,
        dayNum: day,
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: -1 | 1) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    const today = new Date().toISOString().split('T')[0];
    setSelectedDay(today);
  };

  const calendarDays = generateCalendarDays();
  const today = new Date().toISOString().split('T')[0];

  // Activity view - last 30 days
  const generateActivityData = () => {
    const activity: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayData = timelineData.get(dateKey);
      const count = dayData?.count || 0;
      
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) level = 1;
      if (count > 1) level = 2;
      if (count > 2) level = 3;
      if (count > 3) level = 4;
      
      activity.push({ date: dateKey, count, level });
    }
    
    return activity;
  };

  const activityData = generateActivityData();

  // Intensity colors
  const intensityColors = [
    'bg-zinc-800',
    'bg-green-900',
    'bg-green-700',
    'bg-green-500',
    'bg-green-400',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto border border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            📅 Memory Timeline
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'activity' : 'calendar')}
              className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-sm"
            >
              {viewMode === 'calendar' ? '📊 Activity' : '📆 Calendar'}
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">
              ✕
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{memories.length}</div>
            <div className="text-xs text-zinc-400">Total Memories</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">
              {Array.from(timelineData.values()).filter(d => d.hasActionItems).length}
            </div>
            <div className="text-xs text-zinc-400">With Actions</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {new Set(Array.from(timelineData.values()).flatMap(d => d.tags)).size}
            </div>
            <div className="text-xs text-zinc-400">Unique Tags</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {new Set(Array.from(timelineData.values()).flatMap(d => d.contacts)).size}
            </div>
            <div className="text-xs text-zinc-400">People Mentioned</div>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <>
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg"
              >
                ← {MONTHS[(currentMonth.getMonth() - 1 + 12) % 12]}
              </button>
              
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <button
                  onClick={goToToday}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Go to Today
                </button>
              </div>
              
              <button
                onClick={() => navigateMonth(1)}
                className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg"
              >
                {MONTHS[(currentMonth.getMonth() + 1) % 12]} →
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-xs text-zinc-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth, dayNum }) => {
                const dayData = timelineData.get(date);
                const isSelected = selectedDay === date;
                const isToday = date === today;
                
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDay(date);
                      if (dayData) {
                        onDayClick(date);
                      }
                    }}
                    className={`
                      aspect-square p-1 rounded-lg transition text-left relative
                      ${!isCurrentMonth ? 'opacity-30' : ''}
                      ${isSelected ? 'ring-2 ring-blue-500' : ''}
                      ${isToday ? 'ring-2 ring-yellow-500' : ''}
                      ${dayData ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-900'}
                    `}
                  >
                    <div className="text-sm font-medium">{dayNum}</div>
                    {dayData && (
                      <>
                        <div className="absolute bottom-1 left-1 right-1">
                          <div className="flex items-center gap-0.5">
                            {dayData.count > 0 && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" title={`${dayData.count} memories`}></span>
                            )}
                            {dayData.hasActionItems && (
                              <span className="w-2 h-2 rounded-full bg-yellow-500" title="Has action items"></span>
                            )}
                            {dayData.tags.length > 0 && (
                              <span className="w-2 h-2 rounded-full bg-purple-500" title={`${dayData.tags.length} tags`}></span>
                            )}
                            {dayData.contacts.length > 0 && (
                              <span className="w-2 h-2 rounded-full bg-green-500" title={`${dayData.contacts.length} contacts`}></span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Memory</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Actions</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Tags</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> People</span>
            </div>
          </>
        ) : (
          <>
            {/* Activity View (GitHub-style) */}
            <div className="mb-4">
              <h4 className="text-sm text-zinc-400 mb-3">Last 30 Days Activity</h4>
              <div className="flex gap-1">
                {activityData.map(({ date, count, level }) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDay(date)}
                    className={`w-8 h-8 rounded ${intensityColors[level]} hover:ring-2 hover:ring-white/30 transition`}
                    title={`${date}: ${count} memories`}
                  >
                    {count > 0 && (
                      <span className="text-xs text-white/70">{count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>30 days ago</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  {intensityColors.map((color, i) => (
                    <span key={i} className={`w-3 h-3 rounded ${color}`}></span>
                  ))}
                  <span>More</span>
                </div>
                <span>Today</span>
              </div>
            </div>

            {/* Selected Day Details */}
            {selectedDay && timelineData.has(selectedDay) && (
              <div className="bg-zinc-800 rounded-lg p-4">
                <h4 className="font-semibold mb-3">{selectedDay}</h4>
                {(() => {
                  const day = timelineData.get(selectedDay)!;
                  return (
                    <>
                      <div className="space-y-2 mb-3">
                        {day.memories.map((mem, i) => (
                          <button
                            key={i}
                            onClick={() => onDayClick(day.date)}
                            className="block w-full text-left p-2 bg-zinc-700 hover:bg-zinc-600 rounded"
                          >
                            <div className="font-medium text-sm">{mem.name}</div>
                            <div className="text-xs text-zinc-400 truncate">{mem.preview}...</div>
                          </button>
                        ))}
                      </div>
                      {day.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {day.tags.map(tag => (
                            <span key={tag} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">#{tag}</span>
                          ))}
                        </div>
                      )}
                      {day.contacts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {day.contacts.map(contact => (
                            <span key={contact} className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">@{contact}</span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
