'use client';

import { useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees: string[];
  organizer?: string;
  isAllDay: boolean;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchEvents();
  }, [range]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/calendar?range=${range}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch calendar');
      }
      
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string, isAllDay: boolean) => {
    if (isAllDay) return 'All day';
    
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getTimeUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Now';
    
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return `in ${diffMins}m`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours < 24) {
      if (mins === 0) return `in ${hours}h`;
      return `in ${hours}h ${mins}m`;
    }
    
    const days = Math.floor(hours / 24);
    return `in ${days}d`;
  };

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const grouped: { [date: string]: CalendarEvent[] } = {};
    
    for (const event of events) {
      const dateKey = new Date(event.start).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    }
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 sm:p-6">
        <h3 className="text-red-400 font-semibold mb-2">Calendar Error</h3>
        <p className="text-zinc-300 text-sm">{error}</p>
        <button
          onClick={fetchEvents}
          className="mt-4 bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Calendar</h2>
          <p className="text-zinc-400 text-sm mt-1">{events.length} upcoming events</p>
        </div>
        
        {/* Range Selector */}
        <div className="flex gap-2 bg-zinc-900 rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                range === r
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg p-6 sm:p-8 border border-zinc-800 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-zinc-400">No upcoming events</p>
          <p className="text-zinc-500 text-sm mt-1">
            {range === 'today' ? 'Enjoy your free day!' : `No events in the next ${range}`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
            <div key={dateKey}>
              {/* Date Header */}
              <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                <span className="text-lg">📅</span>
                {formatDate(dayEvents[0].start)}
              </h3>
              
              {/* Events for this day */}
              <div className="space-y-2">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h4 className="font-medium text-base sm:text-lg mb-1">
                          {event.title}
                        </h4>
                        
                        {/* Time */}
                        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 mb-2">
                          <span className="flex items-center gap-1">
                            🕐 {formatTime(event.start, event.isAllDay)}
                            {!event.isAllDay && (
                              <> - {formatTime(event.end, false)}</>
                            )}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500">
                            {formatDuration(event.start, event.end)}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-blue-400 font-medium">
                            {getTimeUntil(event.start)}
                          </span>
                        </div>
                        
                        {/* Location */}
                        {event.location && (
                          <div className="text-sm text-zinc-400 mb-1 flex items-center gap-1">
                            <span>📍</span>
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        
                        {/* Attendees */}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="text-sm text-zinc-400 mb-1">
                            <span className="mr-1">👥</span>
                            {event.attendees.slice(0, 3).join(', ')}
                            {event.attendees.length > 3 && (
                              <span className="text-zinc-500">
                                {' '}+{event.attendees.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Description */}
                        {event.description && (
                          <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <h3 className="font-semibold text-sm mb-2">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <a
            href="/quick"
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
          >
            ⚡ Quick Note
          </a>
          <button
            onClick={fetchEvents}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
          >
            🔄 Refresh
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          Tip: Add meeting notes to today's memory before or after meetings
        </p>
      </div>
    </div>
  );
}
