import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, addDays } from 'date-fns';

const Calendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchEvents(currentMonth);
    }, [currentMonth]);

    const fetchEvents = async (month) => {
        setIsLoading(true);
        try {
            const start = startOfMonth(month);
            const end = endOfMonth(month);
            const params = new URLSearchParams({
                timeMin: start.toISOString(),
                timeMax: end.toISOString()
            });
            const res = await fetch(`/api/calendar/events?${params}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error("Failed to fetch events", error);
        } finally {
            setIsLoading(false);
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-semibold text-gray-800">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors">
                            Today
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-200 rounded-md text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                    <button className="p-2 hover:bg-gray-200 rounded-md text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {days.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const getContrastYIQ = (hexcolor) => {
        if (!hexcolor) return 'black';
        const hex = hexcolor.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = new Date(day);

                const dayEvents = events.filter(e => {
                    const eventDate = new Date(e.start.dateTime || e.start.date);
                    return isSameDay(eventDate, day);
                });

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[100px] p-2 border-b border-r border-gray-100 relative group transition-colors hover:bg-gray-50
                            ${!isSameMonth(day, monthStart) ? "bg-gray-50/50 text-gray-400" : "bg-white"}
                            ${isSameDay(day, selectedDate) ? "bg-blue-50" : ""}
                        `}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                            ${isToday(day) ? "bg-red-500 text-white" : "text-gray-700"}
                        `}>
                            {formattedDate}
                        </div>
                        <div className="space-y-1 overflow-hidden">
                            {dayEvents.map((event, idx) => {
                                const bgColor = event.backgroundColor || '#3b82f6';
                                const textColor = getContrastYIQ(bgColor);
                                return (
                                    <div
                                        key={idx}
                                        className="text-[10px] truncate px-1.5 py-0.5 rounded shadow-sm border border-black/5 font-semibold"
                                        style={{
                                            backgroundColor: bgColor,
                                            color: textColor,
                                        }}
                                        title={`${event.calendarSummary}: ${event.summary}`}
                                    >
                                        {event.summary}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="flex-1 overflow-y-auto">{rows}</div>;
    };

    return (
        <div className="h-full flex flex-col bg-white font-sans text-gray-900">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
};

export default Calendar;
