import { NextResponse } from 'next/server';
import ical from 'ical.js';

const ICS_URL = process.env.CALENDAR_ICS_URL || 'https://outlook.office365.com/owa/calendar/44e2935f8cb947af95aa55310199caaa@netmoregroup.com/a9f00ec7843749c19963779a1ab79d986851144578558111689/calendar.ics';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'week'; // today, week, month
  
  try {
    const response = await fetch(ICS_URL, {
      headers: {
        'User-Agent': 'Second-Brain-Calendar/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }
    
    const icsData = await response.text();
    const jcalData = ical.parse(icsData);
    const vcalendar = new ical.Component(jcalData);
    const vevents = vcalendar.getAllSubcomponents('vevent');
    
    const now = new Date();
    const events: CalendarEvent[] = [];
    
    // Calculate range end
    let rangeEnd = new Date();
    if (range === 'today') {
      rangeEnd.setHours(23, 59, 59, 999);
    } else if (range === 'week') {
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    } else if (range === 'month') {
      rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    }
    
    for (const vevent of vevents) {
      const event = new ical.Event(vevent);
      
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();
      
      // Only include future events within range
      if (startDate >= now && startDate <= rangeEnd) {
        const attendees: string[] = [];
        const attendeeProps = vevent.getAllProperties('attendee');
        for (const att of attendeeProps) {
          const value = att.getFirstValue();
          if (value) {
            const email = String(value).replace('mailto:', '');
            attendees.push(email);
          }
        }
        
        const organizerProp = vevent.getFirstProperty('organizer');
        const organizer = organizerProp 
          ? String(organizerProp.getFirstValue()).replace('mailto:', '')
          : undefined;
        
        events.push({
          id: event.uid || `event-${Date.now()}-${Math.random()}`,
          title: event.summary || 'Untitled Event',
          description: event.description || undefined,
          location: event.location || undefined,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          attendees,
          organizer,
          isAllDay: event.startDate.isDate
        });
      }
    }
    
    // Sort by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    return NextResponse.json({
      events,
      count: events.length,
      range,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch calendar',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
