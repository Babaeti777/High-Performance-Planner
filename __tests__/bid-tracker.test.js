/**
 * @jest-environment jsdom
 */

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Create a minimal BidTracker for testing the utility functions
const BidTracker = {
    // Format date for ICS
    formatICSDate(date, local = false) {
        if (local) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        }
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    },

    // Escape text for ICS format
    escapeICS(text) {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    },

    // Generate ICS file content
    generateICSContent(events, calendarName) {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//High-Performance Planner//Bid Tracker//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Bids - ${this.escapeICS(calendarName)}`,
            'X-WR-TIMEZONE:America/Los_Angeles'
        ];

        events.forEach(event => {
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${event.uid}@highperformanceplanner`);
            lines.push(`DTSTAMP:${this.formatICSDate(new Date())}`);
            lines.push(`DTSTART;TZID=America/Los_Angeles:${this.formatICSDate(event.start, true)}`);
            lines.push(`DTEND;TZID=America/Los_Angeles:${this.formatICSDate(event.end, true)}`);
            lines.push(`SUMMARY:${this.escapeICS(event.summary)}`);
            lines.push(`DESCRIPTION:${this.escapeICS(event.description)}`);
            lines.push(`PRIORITY:${event.priority || 5}`);
            lines.push('STATUS:CONFIRMED');

            event.alarms?.forEach(alarm => {
                lines.push('BEGIN:VALARM');
                lines.push('ACTION:DISPLAY');
                lines.push(`DESCRIPTION:${this.escapeICS(event.summary)}`);
                lines.push(`TRIGGER:${alarm.trigger}`);
                lines.push('END:VALARM');
            });

            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    },

    // Generate events for a bid
    generateEvents(bid) {
        const events = [];

        if (bid.dueDate) {
            const dueDate = new Date(bid.dueDate);
            events.push({
                uid: `bid-due-${bid.id}`,
                summary: `BID DUE: ${bid.projectName}`,
                description: `Bid submission deadline\nProject: ${bid.projectName}`,
                start: dueDate,
                end: new Date(dueDate.getTime() + 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 1
            });

            const finalizeBid = new Date(dueDate);
            finalizeBid.setDate(finalizeBid.getDate() - 1);
            finalizeBid.setHours(12, 0, 0, 0);
            events.push({
                uid: `finalize-bid-${bid.id}`,
                summary: `Finalize Bid Package & Checklist: ${bid.projectName}`,
                description: `INTERNAL REMINDER`,
                start: finalizeBid,
                end: new Date(finalizeBid.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-PT1H' }],
                priority: 2
            });

            const bidBond = new Date(dueDate);
            bidBond.setDate(bidBond.getDate() - 3);
            bidBond.setHours(9, 0, 0, 0);
            events.push({
                uid: `bid-bond-${bid.id}`,
                summary: `Secure Bid Bond: ${bid.projectName}`,
                description: `INTERNAL REMINDER`,
                start: bidBond,
                end: new Date(bidBond.getTime() + 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 2
            });
        }

        if (bid.preBidDate) {
            const preBidDate = new Date(bid.preBidDate);
            events.push({
                uid: `pre-bid-${bid.id}`,
                summary: `Pre-Bid Meeting: ${bid.projectName}`,
                description: `Pre-bid meeting`,
                start: preBidDate,
                end: new Date(preBidDate.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 2
            });
        }

        if (bid.rfiDate) {
            const rfiDate = new Date(bid.rfiDate);
            events.push({
                uid: `rfi-due-${bid.id}`,
                summary: `RFI Due: ${bid.projectName}`,
                description: `Questions/RFI due`,
                start: rfiDate,
                end: new Date(rfiDate.getTime() + 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 2
            });

            const finalizeRfi = new Date(rfiDate);
            finalizeRfi.setDate(finalizeRfi.getDate() - 1);
            finalizeRfi.setHours(12, 0, 0, 0);
            events.push({
                uid: `finalize-rfi-${bid.id}`,
                summary: `Finalize RFI: ${bid.projectName}`,
                description: `INTERNAL REMINDER`,
                start: finalizeRfi,
                end: new Date(finalizeRfi.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-PT1H' }],
                priority: 2
            });
        }

        if (bid.siteVisit) {
            const siteVisitDate = new Date(bid.siteVisit);
            events.push({
                uid: `site-visit-${bid.id}`,
                summary: `Site Visit: ${bid.projectName}`,
                description: `Site visit`,
                start: siteVisitDate,
                end: new Date(siteVisitDate.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 3
            });
        }

        return events;
    },

    // Parse extracted date
    parseExtractedDate(dateStr) {
        if (!dateStr) return '';
        try {
            let cleaned = dateStr.replace(/[^\d\/\-:\sAaPpMm,\w]/g, ' ').trim();
            let dateMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            let timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i);

            if (!dateMatch) {
                const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december'];
                const namedMatch = cleaned.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
                if (namedMatch) {
                    const monthIdx = monthNames.findIndex(m => m.startsWith(namedMatch[1].toLowerCase()));
                    if (monthIdx !== -1) {
                        dateMatch = [null, namedMatch[2], String(monthIdx + 1), namedMatch[3]];
                    }
                }
            }

            if (!dateMatch) return '';

            let month = parseInt(dateMatch[1]);
            let day = parseInt(dateMatch[2]);
            let year = parseInt(dateMatch[3]);

            if (month > 12 && day <= 12) [month, day] = [day, month];
            if (year < 100) year += year < 50 ? 2000 : 1900;

            const dateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let hour = 14;
            let minute = 0;
            if (timeMatch) {
                hour = parseInt(timeMatch[1]);
                minute = parseInt(timeMatch[2]);
                const isPM = timeMatch[3]?.toLowerCase() === 'pm';
                const isAM = timeMatch[3]?.toLowerCase() === 'am';
                if (isPM && hour < 12) hour += 12;
                if (isAM && hour === 12) hour = 0;
            }

            return `${dateFormatted}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        } catch (e) {
            return '';
        }
    },

    // Parse ITB text
    parseITBText(text) {
        const result = { projectName: '', bidNumber: '', client: '', dueDate: '', preBidDate: '', rfiDate: '' };

        const projectPatterns = [
            /(?:project|title|subject|re:|regarding)[:\s]+["']?([^"'\n]+?)["']?(?:\n|$|\.)/i,
        ];
        for (const pattern of projectPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.projectName = match[1].trim().substring(0, 100);
                break;
            }
        }

        const bidNumPatterns = [
            /(?:ITB|RFP|RFQ|BID|solicitation|contract)[:\s#-]*(\d{2,}[-\d]*\w*)/i,
        ];
        for (const pattern of bidNumPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.bidNumber = match[1].trim();
                break;
            }
        }

        return result;
    },

    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Format status
    formatStatus(status) {
        const statusMap = {
            'researching': 'Researching',
            'preparing': 'Preparing',
            'submitted': 'Submitted',
            'won': 'Won',
            'lost': 'Lost',
            'no-bid': 'No Bid'
        };
        return statusMap[status] || status;
    },

    // Format date/time for display
    formatDateTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
};

describe('BidTracker', () => {
    describe('ICS Date Formatting', () => {
        test('formats date correctly for ICS (UTC)', () => {
            const date = new Date('2026-02-15T14:30:00Z');
            const formatted = BidTracker.formatICSDate(date);
            expect(formatted).toBe('20260215T143000Z');
        });

        test('formats date correctly for ICS (local)', () => {
            const date = new Date(2026, 1, 15, 14, 30, 0);
            const formatted = BidTracker.formatICSDate(date, true);
            expect(formatted).toBe('20260215T143000');
        });
    });

    describe('ICS Content Generation', () => {
        test('generates valid ICS structure', () => {
            const events = [{
                uid: 'test-event-1',
                summary: 'Test Event',
                description: 'Test Description',
                start: new Date(2026, 1, 15, 14, 0, 0),
                end: new Date(2026, 1, 15, 15, 0, 0),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 1
            }];

            const ics = BidTracker.generateICSContent(events, 'Test Calendar');

            expect(ics).toContain('BEGIN:VCALENDAR');
            expect(ics).toContain('END:VCALENDAR');
            expect(ics).toContain('VERSION:2.0');
            expect(ics).toContain('BEGIN:VEVENT');
            expect(ics).toContain('END:VEVENT');
            expect(ics).toContain('SUMMARY:Test Event');
            expect(ics).toContain('BEGIN:VALARM');
            expect(ics).toContain('TRIGGER:-P1D');
            expect(ics).toContain('TRIGGER:-PT1H');
        });

        test('escapes special characters in ICS', () => {
            const text = 'Test; with, special\ncharacters';
            const escaped = BidTracker.escapeICS(text);
            expect(escaped).toBe('Test\\; with\\, special\\ncharacters');
        });
    });

    describe('Event Generation', () => {
        test('generates correct events for a bid with all dates', () => {
            const bid = {
                id: 123,
                projectName: 'Test Project',
                bidNumber: 'ITB-001',
                client: 'Test Client',
                value: '$1,000,000',
                dueDate: '2026-03-15T14:00',
                preBidDate: '2026-02-20T10:00',
                rfiDate: '2026-03-01T12:00',
                siteVisit: '2026-02-25T09:00',
                status: 'preparing',
                notes: 'Test notes'
            };

            const events = BidTracker.generateEvents(bid);

            expect(events.length).toBe(7);

            const bidDue = events.find(e => e.uid === 'bid-due-123');
            expect(bidDue).toBeDefined();
            expect(bidDue.summary).toBe('BID DUE: Test Project');
            expect(bidDue.alarms.length).toBe(2);

            const finalizeBid = events.find(e => e.uid === 'finalize-bid-123');
            expect(finalizeBid).toBeDefined();
            expect(finalizeBid.summary).toContain('Finalize Bid Package');

            const bidBond = events.find(e => e.uid === 'bid-bond-123');
            expect(bidBond).toBeDefined();
            expect(bidBond.summary).toContain('Secure Bid Bond');
        });

        test('generates minimal events for bid with only due date', () => {
            const bid = {
                id: 456,
                projectName: 'Minimal Project',
                client: 'Test Client',
                dueDate: '2026-03-15T14:00',
                status: 'researching'
            };

            const events = BidTracker.generateEvents(bid);
            expect(events.length).toBe(3);
        });
    });

    describe('Date Extraction', () => {
        test('extracts date from MM/DD/YYYY format', () => {
            const result = BidTracker.parseExtractedDate('02/15/2026 at 2:00 PM');
            expect(result).toBe('2026-02-15T14:00');
        });

        test('extracts date from named month format', () => {
            const result = BidTracker.parseExtractedDate('February 15, 2026 at 2:00 PM');
            expect(result).toBe('2026-02-15T14:00');
        });

        test('handles time without AM/PM', () => {
            const result = BidTracker.parseExtractedDate('02/15/2026 at 14:30');
            expect(result).toBe('2026-02-15T14:30');
        });
    });

    describe('ITB Text Parsing', () => {
        test('extracts project name from text', () => {
            const text = 'Project: Highway 101 Reconstruction Phase 2\nBid Due: March 15, 2026';
            const result = BidTracker.parseITBText(text);
            expect(result.projectName).toContain('Highway 101');
        });

        test('extracts bid number from text', () => {
            const text = 'ITB-2026-001\nProject Name: Test Project';
            const result = BidTracker.parseITBText(text);
            expect(result.bidNumber).toBe('2026-001');
        });
    });

    describe('Utility Functions', () => {
        test('escapes HTML correctly', () => {
            const html = '<script>alert("xss")</script>';
            const escaped = BidTracker.escapeHtml(html);
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });

        test('formats status correctly', () => {
            expect(BidTracker.formatStatus('researching')).toBe('Researching');
            expect(BidTracker.formatStatus('preparing')).toBe('Preparing');
            expect(BidTracker.formatStatus('won')).toBe('Won');
            expect(BidTracker.formatStatus('no-bid')).toBe('No Bid');
        });

        test('formats date/time for display', () => {
            const result = BidTracker.formatDateTime('2026-02-15T14:30');
            expect(result).toContain('Feb');
            expect(result).toContain('15');
            expect(result).toContain('2026');
        });
    });
});
