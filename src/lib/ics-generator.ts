// src/lib/ics-generator.ts

import type { CentseiEntryForCalendar } from "./google-calendar";

// A simple UID generator
const uid = () => `${Date.now()}${Math.random().toString(36).substr(2, 9)}@centsei.app`;

// Escapes text for ICS format
const escapeText = (text: string) => {
    return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
};

const formatUtcDate = (date: Date): string => {
    return date.getUTCFullYear() +
           ('0' + (date.getUTCMonth() + 1)).slice(-2) +
           ('0' + date.getUTCDate()).slice(-2) + 'T' +
           ('0' + date.getUTCHours()).slice(-2) +
           ('0' + date.getUTCMinutes()).slice(-2) +
           ('0' + date.getUTCSeconds()).slice(-2) + 'Z';
};

const formatDateOnly = (date: Date): string => {
    return date.getFullYear() +
           ('0' + (date.getMonth() + 1)).slice(-2) +
           ('0' + date.getDate()).slice(-2);
};

export const generateIcsContent = (entries: CentseiEntryForCalendar[], timezone: string): string => {
    let icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Centsei//Your Finance Sensei//EN',
    ].join('\r\n');
    
    entries.forEach(entry => {
        const startDate = new Date(`${entry.date}T08:00:00`); // Assume 8 AM in local time
        const endDate = new Date(startDate.getTime() + (60 * 60 * 1000)); // 1 hour duration
        
        const event = [
            'BEGIN:VEVENT',
            `UID:${uid()}`,
            `DTSTAMP:${formatUtcDate(new Date())}`,
            `DTSTART;TZID=${timezone}:${formatDateOnly(startDate)}T080000`,
            `DTEND;TZID=${timezone}:${formatDateOnly(endDate)}T090000`,
            `SUMMARY:${escapeText(entry.name)}`,
            `DESCRIPTION:${escapeText(entry.note || `Amount: ${entry.amount}`)}`,
            'END:VEVENT'
        ].join('\r\n');
        
        icsString += `\r\n${event}`;
    });

    icsString += '\r\nEND:VCALENDAR';
    
    return icsString;
};
