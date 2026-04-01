let currentWeekOffset = 0;

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('calendar-grid-container');
    if (!container) return;
    
    // Initial render
    renderCalendar();
    
    // Check every minute if the red line needs updating (optional polish)
    setInterval(() => {
        if (currentWeekOffset === 0) renderCalendar();
    }, 60000);
});

// Expose navigate function
window.navigateWeek = function(dir) {
    if (dir === 0) {
        currentWeekOffset = 0;
    } else {
        currentWeekOffset += dir;
    }
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendar-grid-container');
    if (!container) return;

    const lang = localStorage.getItem('preferred-language') || 'en';
    const isGerman = lang === 'de';
    
    // Date calculation
    const today = new Date();
    // Monday of the currently viewed week
    const dayOfWeek = today.getDay() || 7; // 1 (Mon) to 7 (Sun)
    const viewMonday = new Date(today);
    viewMonday.setDate(today.getDate() - dayOfWeek + 1 + (currentWeekOffset * 7));
    
    // Generate dates for Mon-Fri
    const weekDays = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(viewMonday);
        d.setDate(viewMonday.getDate() + i);
        weekDays.push(d);
    }
    
    // Header Month/Year string (uses formatting of the Wednesday to best represent the week)
    const targetMonth = weekDays[2]; 
    const monthFormatter = new Intl.DateTimeFormat(isGerman ? 'de-DE' : 'en-US', { year: 'numeric', month: 'long' });
    const monthTitle = monthFormatter.format(targetMonth);

    // Days translation
    const daysEn = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const daysDe = ['MO', 'DI', 'MI', 'DO', 'FR'];
    const dayLabels = isGerman ? daysDe : daysEn;
    
    const startHour = 8;
    const endHour = 17;
    const hoursCount = endHour - startHour; // 9 hours
    const hourHeight = 60; // pixels
    const totalHeight = hoursCount * hourHeight;
    
    let html = `
    <div class="calendar-wrapper flex flex-col font-sans w-full min-w-[700px] select-none">
        <!-- Header Controls -->
        <div class="flex items-center justify-between mb-4 px-1">
            <h3 class="text-[28px] font-bold text-[#111418] dark:text-white capitalize tracking-tight">${monthTitle}</h3>
            <div class="flex items-center rounded-lg border border-[#e5e7eb] dark:border-[#334155] overflow-hidden bg-white dark:bg-[#1e293b] shadow-sm">
                <button onclick="navigateWeek(-1)" class="px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold border-r border-[#e5e7eb] dark:border-[#334155] transition-colors">&lt;</button>
                <button onclick="navigateWeek(0)" class="px-5 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium text-[#111418] dark:text-gray-200 border-r border-[#e5e7eb] dark:border-[#334155] transition-colors">${isGerman ? 'Heute' : 'Today'}</button>
                <button onclick="navigateWeek(1)" class="px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold transition-colors">&gt;</button>
            </div>
        </div>
        
        <!-- Main Grid Container -->
        <div class="flex flex-col rounded-xl overflow-hidden bg-white dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155]">
            
            <!-- Dates Header Row -->
            <div class="flex border-b border-[#e5e7eb] dark:border-[#334155] bg-white dark:bg-[#1e293b]">
                <div class="w-14 border-r border-[#e5e7eb] dark:border-[#334155] shrink-0"></div>
                ${weekDays.map((d, i) => {
                    const isToday = d.toDateString() === today.toDateString();
                    const dayNum = d.getDate();
                    const dayLetter = dayLabels[i];
                    
                    if (isToday) {
                        return `
                        <div class="flex-1 flex flex-col items-center justify-center py-2 border-r border-[#e5e7eb] dark:border-[#334155] last:border-r-0 relative">
                            <div class="text-[#637588] dark:text-[#94a3b8] font-bold text-xs uppercase mb-1">${dayLetter}</div>
                            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white text-lg font-bold">${dayNum}</div>
                        </div>`;
                    }
                    return `
                        <div class="flex-1 flex gap-1 items-end justify-center py-3 border-r border-[#e5e7eb] dark:border-[#334155] last:border-r-0 text-[#111418] dark:text-white">
                            <span class="text-2xl leading-none font-normal">${dayNum}.</span>
                            <span class="text-sm font-semibold uppercase text-[#637588] dark:text-[#94a3b8] mb-0.5">${dayLetter}</span>
                        </div>`;
                }).join('')}
            </div>
            
            <!-- Grid Body -->
            <div class="flex relative bg-white dark:bg-[#1e293b] select-text" style="height: ${totalHeight}px;">
                <!-- Time Labels Column -->
                <div class="w-14 shrink-0 border-r border-[#e5e7eb] dark:border-[#334155] relative z-20 bg-white dark:bg-[#1e293b]">
                    ${Array.from({length: hoursCount}).map((_, i) => {
                        return `<div class="absolute w-full flex justify-end pr-2 text-[10px] text-[#637588] dark:text-[#94a3b8] font-medium -translate-y-1/2" style="top: ${i * hourHeight}px;">${startHour + i}:00</div>`;
                    }).join('')}
                    <!-- End label -->
                    <div class="absolute w-full flex justify-end pr-2 text-[10px] text-[#637588] dark:text-[#94a3b8] font-medium -translate-y-1/2" style="top: ${totalHeight}px;">17:00</div>
                </div>
                
                <!-- Background Horizontal Lines -->
                <div class="absolute left-14 right-0 inset-y-0 pointer-events-none z-0 overflow-hidden">
                    ${Array.from({length: hoursCount}).map((_, i) => {
                        return `<div class="absolute w-full border-t border-[#e5e7eb] dark:border-[#334155]" style="top: ${i * hourHeight}px;"></div>`;
                    }).join('')}
                </div>
                
                <!-- Vertical Day Columns and Events -->
                ${weekDays.map((date, dayIndexOffset) => {
                    let colHtml = `<div class="flex-1 relative border-r border-[#e5e7eb] dark:border-[#334155] last:border-r-0 z-10">`;
                    
                    const dayIndex = date.getDay(); // 1=Mon, 4=Thu
                    
                    // Render Clickable available slots (h = 8 to 16)
                    for (let h = startHour; h < endHour; h++) {
                        // is conflicting with 15:20 event?
                        const hasBusyEvent = (dayIndex === 1 || dayIndex === 4);
                        if (hasBusyEvent && (h === 15 || h === 16)) {
                            continue; // Skip booking slot for overlapping hours
                        }
                        
                        const timeLabel = `${h.toString().padStart(2, '0')}:00`;
                        const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
                        const displayDate = new Intl.DateTimeFormat(isGerman ? 'de-DE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
                        
                        colHtml += `
                        <div class="absolute w-full hover:bg-primary/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-primary flex items-center justify-center opacity-0 hover:opacity-100 z-10" 
                            style="top: ${(h - startHour) * hourHeight}px; height: ${hourHeight}px;"
                            onclick="selectAppleSlot('${dateStr}', '${displayDate}', '${timeLabel}')">
                            <span class="text-xs font-bold text-primary">+ ${isGerman?'Buchen':'Book'}</span>
                        </div>`;
                    }
                    
                    // Render Absolute "Egyzés a fiammal" Events
                    if (dayIndex === 1 || dayIndex === 4) {
                        const eventStartH = 15;
                        const eventStartM = 20;
                        const topPx = (eventStartH - startHour) * hourHeight + (eventStartM / 60) * hourHeight;
                        const heightPx = hourHeight; // 60 mins
                        const eventText = isGerman ? 'Training mit Sohn' : 'Training with son';
                        
                        colHtml += `
                        <div class="absolute left-1 right-2 rounded bg-[#e8f5e9] dark:bg-[#1b5e20]/60 border-l-4 border-[#4caf50] shadow-sm px-2 py-1 overflow-hidden pointer-events-none z-20"
                            style="top: ${topPx}px; height: ${heightPx}px;">
                            <div class="text-[11px] font-bold text-[#2e7d32] dark:text-[#a5d6a7] leading-tight flex items-center gap-1">
                                ${eventText}
                            </div>
                            <div class="text-[9px] text-[#388e3c] dark:text-[#81c784] opacity-90 mt-0.5">15:20 - 16:20</div>
                        </div>`;
                    }
                    
                    colHtml += `</div>`;
                    return colHtml;
                }).join('')}
                
                <!-- Global Current Time Red Line (Apple Style) -->
                ${(() => {
                    const viewStart = weekDays[0];
                    const viewEnd = weekDays[4];
                    viewStart.setHours(0,0,0,0);
                    viewEnd.setHours(23,59,59,999);
                    
                    if (today >= viewStart && today <= viewEnd) {
                        const curHour = today.getHours();
                        const curMin = today.getMinutes();
                        if (curHour >= startHour && curHour <= endHour) {
                            const currentTopPx = (curHour - startHour) * hourHeight + (curMin / 60) * hourHeight;
                            const dayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0 for Mon
                            if (dayOffset < 5) {
                                return `
                                <div class="absolute left-14 right-0 z-30 pointer-events-none" style="top: ${currentTopPx}px;">
                                    <div class="w-full h-px bg-red-500 relative">
                                        <!-- Red dot positioned EXACTLY at the left border of current day column -->
                                        <div class="absolute top-[-4px] w-[9px] h-[9px] bg-red-500 rounded-full" style="left: calc(${dayOffset * 20}% - 4px);"></div>
                                    </div>
                                </div>`;
                            }
                        }
                    }
                    return '';
                })()}
            </div>
        </div>
    </div>`;
    
    container.innerHTML = html;
}

// Interactive function for booking
window.selectAppleSlot = function(dateISO, displayDate, time) {
    const isGerman = (localStorage.getItem('preferred-language') || 'en') === 'de';
    let prefill = "";

    if (isGerman) {
        prefill = `Hallo László,\n\nich habe gesehen, dass du am ${displayDate} um ${time} Uhr Zeit hast. Ich würde diesen Termin gerne reservieren, um ein mögliches Projekt zu besprechen.\n\nViele Grüße,`;
    } else {
        prefill = `Hi László,\n\nI noticed you are available on ${displayDate} at ${time}. I would like to book this slot to discuss a potential project.\n\nBest regards,`;
    }

    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) subjectSelect.value = 'project';

    const msgBox = document.getElementById('message');
    if (msgBox) {
        msgBox.value = prefill;
        msgBox.classList.add('ring-2', 'ring-primary', 'border-primary');
        setTimeout(() => msgBox.classList.remove('ring-2', 'ring-primary', 'border-primary'), 1000);
        
        const formHeader = document.querySelector('h2.text-2xl.font-bold') || msgBox.parentElement.parentElement;
        formHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => msgBox.focus(), 500);
    }
};
