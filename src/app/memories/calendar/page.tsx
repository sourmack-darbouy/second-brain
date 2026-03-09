'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DayData {
  date: string;
  memoryCount: number;
  tags: string[];
  companies: string[];
}

interface MonthData {
  year: number;
  month: number;
  days: Map<string, DayData>;
}

const TAG_COLORS: Record<string, string> = {
  'tender': 'bg-orange-600',
  'partner': 'bg-blue-600',
  'hot-lead': 'bg-red-600',
  'poc': 'bg-violet-600',
  'follow-up': 'bg-yellow-600',
  'mining': 'bg-stone-600',
  'utilities': 'bg-emerald-600',
  'oil-gas': 'bg-amber-700',
  'tracking': 'bg-sky-600',
  'lorawan': 'bg-cyan-600',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MemoryCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, DayData>>(new Map());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [stats, setStats] = useState({
    totalMemories: 0,
    activeDays: 0,
    topTags: [] as { name: string; count: number }[],
  });

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    fetchMonthData();
  }, [currentYear, currentMonth]);

  const fetchMonthData = async () => {
    try {
      setLoading(true);
      
      // Get all memories and process for this month
      const res = await fetch('/api/memories');
      const data = await res.json();
      const memories = data.memories || [];
      
      const dayMap = new Map<string, DayData>();
      const tagCounts = new Map<string, number>();
      let totalMemories = 0;
      
      // Get content for each memory (in parallel, limited)
      const contentPromises = memories.map(async (mem: any) => {
        if (!mem.name || mem.name === 'Long-term Memory') return null;
        
        const date = mem.name; // Format: YYYY-MM-DD
        const memYear = parseInt(date.split('-')[0]);
        const memMonth = parseInt(date.split('-')[1]) - 1;
        
        // Only process if in current view (with buffer)
        if (memYear === currentYear && memMonth === currentMonth) {
          // Fetch content
          const contentRes = await fetch(`/api/memories/content?path=${encodeURIComponent(mem.path)}`);
          const contentData = await contentRes.json();
          const content = contentData.content || '';
          
          // Extract tags and companies
          const tags = extractTags(content);
          const companies = extractCompanies(content);
          
          return { date, memoryCount: 1, tags, companies };
        }
        return null;
      });
      
      const results = await Promise.all(contentPromises);
      
      for (const result of results) {
        if (!result) continue;
        
        const { date, memoryCount, tags, companies } = result;
        
        if (!dayMap.has(date)) {
          dayMap.set(date, { date, memoryCount: 0, tags: [], companies: [] });
        }
        
        const day = dayMap.get(date)!;
        day.memoryCount += memoryCount;
        day.tags = [...new Set([...day.tags, ...tags])];
        day.companies = [...new Set([...day.companies, ...companies])];
        
        totalMemories++;
        for (const tag of tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
      
      setMonthData(dayMap);
      setStats({
        totalMemories,
        activeDays: dayMap.size,
        topTags: Array.from(tagCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      });
    } catch (error) {
      console.error('Failed to fetch month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractTags = (content: string): string[] => {
    const tags: string[] = [];
    const regex = /#([a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tags.push(match[1].toLowerCase());
    }
    return tags;
  };

  const extractCompanies = (content: string): string[] => {
    const companies: string[] = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      companies.push(match[1]);
    }
    return companies;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const openDay = (dayData: DayData) => {
    router.push(`/memories?date=${dayData.date}`);
  };

  const getIntensityClass = (count: number): string => {
    if (count === 0) return 'bg-zinc-800';
    if (count === 1) return 'bg-blue-900';
    if (count === 2) return 'bg-blue-700';
    if (count === 3) return 'bg-blue-500';
    return 'bg-blue-400';
  };

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date().toISOString().split('T')[0];

  const calendarDays: (DayData | null)[] = [];
  
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = monthData.get(dateStr) || { date: dateStr, memoryCount: 0, tags: [], companies: [] };
    calendarDays.push(dayData);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Memory Calendar</h1>
        <button
          onClick={goToToday}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
        >
          Today
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-2xl font-bold text-blue-400">{stats.activeDays}</div>
          <div className="text-sm text-zinc-400">Active Days</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-2xl font-bold text-green-400">{stats.totalMemories}</div>
          <div className="text-sm text-zinc-400">Memories</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="text-2xl font-bold text-purple-400">{stats.topTags.length}</div>
          <div className="text-sm text-zinc-400">Unique Tags</div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-zinc-800 rounded-lg transition"
        >
          ←
        </button>
        <h2 className="text-xl font-semibold">
          {MONTHS[currentMonth]} {currentYear}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-zinc-800 rounded-lg transition"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm text-zinc-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          {loading ? (
            <div className="text-center py-12 text-zinc-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayData, i) => {
                if (!dayData) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }

                const isToday = dayData.date === today;
                const hasMemories = dayData.memoryCount > 0;

                return (
                  <button
                    key={dayData.date}
                    onClick={() => hasMemories && setSelectedDay(dayData)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center transition
                      ${hasMemories ? getIntensityClass(dayData.memoryCount) : 'bg-zinc-800/50'}
                      ${isToday ? 'ring-2 ring-blue-500' : ''}
                      ${hasMemories ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <span className={`text-sm ${hasMemories ? 'text-white' : 'text-zinc-500'}`}>
                      {parseInt(dayData.date.split('-')[2])}
                    </span>
                    {hasMemories && (
                      <span className="text-xs text-white/70">{dayData.memoryCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            <span className="text-sm text-zinc-400">Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-zinc-800"></div>
              <div className="w-4 h-4 rounded bg-blue-900"></div>
              <div className="w-4 h-4 rounded bg-blue-700"></div>
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <div className="w-4 h-4 rounded bg-blue-400"></div>
            </div>
            <span className="text-sm text-zinc-400">More</span>
          </div>
        </div>

        {/* Selected Day Details / Top Tags */}
        <div className="space-y-4">
          {/* Selected Day */}
          {selectedDay && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{selectedDay.date}</h3>
                <button
                  onClick={() => openDay(selectedDay)}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                >
                  Open
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Memories</div>
                  <div className="text-lg">{selectedDay.memoryCount}</div>
                </div>
                
                {selectedDay.tags.length > 0 && (
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDay.tags.map(tag => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 rounded ${TAG_COLORS[tag] || 'bg-zinc-700'} text-white`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedDay.companies.length > 0 && (
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Companies</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDay.companies.slice(0, 5).map(company => (
                        <span
                          key={company}
                          className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded"
                        >
                          {company}
                        </span>
                      ))}
                      {selectedDay.companies.length > 5 && (
                        <span className="text-xs text-zinc-500">
                          +{selectedDay.companies.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Tags */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="font-semibold mb-3">Top Tags This Month</h3>
            {stats.topTags.length === 0 ? (
              <p className="text-zinc-500 text-sm">No tags found</p>
            ) : (
              <div className="space-y-2">
                {stats.topTags.map(tag => (
                  <div key={tag.name} className="flex items-center justify-between">
                    <span
                      className={`text-sm px-2 py-0.5 rounded ${TAG_COLORS[tag.name] || 'bg-zinc-700'} text-white`}
                    >
                      #{tag.name}
                    </span>
                    <span className="text-sm text-zinc-400">{tag.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
