document.addEventListener('DOMContentLoaded', () => {
    const medForm = document.getElementById('medForm');
    const medList = document.getElementById('medList');
    const notificationSound = document.getElementById('notificationSound');
    const alarmModal = document.getElementById('alarmModal');
    const alarmMessage = document.getElementById('alarmMessage');
    const stopAlarmBtn = document.getElementById('stopAlarmBtn');

    let alarmTimeout;

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed', err));
    }

    // Initialize Web Worker for background timing
    if (window.Worker) {
        const timerWorker = new Worker('timer.worker.js');
        timerWorker.onmessage = function (e) {
            if (e.data === 'tick') {
                checkReminders();
            }
        };
    } else {
        // Fallback for browsers without Worker support
        setInterval(checkReminders, 5000);
    }

    // Request notification permission
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // Load medications from localStorage
    let medications = JSON.parse(localStorage.getItem('medications')) || [];

    // Render list on init
    renderMedications();

    // Add Medication
    medForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('medName').value;
        const time = document.getElementById('medTime').value;
        const note = document.getElementById('medNote').value;

        const newMed = {
            id: Date.now(),
            name,
            time,
            note,
            lastReminded: null // Track last reminder date to avoid double alerts
        };

        medications.push(newMed);
        saveAndRender();
        medForm.reset();

        // Visual feedback
        const btn = medForm.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>已加入';
        btn.classList.add('is-success');
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('is-success');
        }, 2000);
    });

    // Delete Medication (Event Delegation)
    medList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            const btn = e.target.closest('.delete-btn');
            const id = Number(btn.dataset.id);

            if (confirm('確定要刪除這個提醒嗎？')) {
                medications = medications.filter(med => med.id !== id);
                saveAndRender();
            }
        }
    });

    // Stop Alarm Button
    stopAlarmBtn.addEventListener('click', stopAlarm);

    function saveAndRender() {
        localStorage.setItem('medications', JSON.stringify(medications));
        renderMedications();
    }

    function renderMedications() {
        medList.innerHTML = '';

        if (medications.length === 0) {
            medList.innerHTML = `
                <div class="notification is-light has-text-centered">
                    <span class="icon is-large has-text-grey-light mb-2">
                        <i class="fa-regular fa-calendar-check fa-2x"></i>
                    </span>
                    <p class="has-text-grey">目前沒有提醒事項<br>快去新增吧！</p>
                </div>
            `;
            return;
        }

        // Sort by time
        medications.sort((a, b) => a.time.localeCompare(b.time));

        medications.forEach(med => {
            const el = document.createElement('div');
            el.className = 'med-item';
            el.innerHTML = `
                <div class="med-info">
                    <h4>${escapeHtml(med.name)}</h4>
                    <div class="med-time">
                        <i class="fa-regular fa-clock mr-2"></i> ${formatTime(med.time)}
                    </div>
                    ${med.note ? `<div class="med-note"><i class="fa-solid fa-quote-left mr-1 is-size-7"></i> ${escapeHtml(med.note)}</div>` : ''}
                </div>
                <button class="delete-btn" data-id="${med.id}" title="刪除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            medList.appendChild(el);
        });
    }

    function checkReminders() {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;
        const todayDate = now.toDateString();

        medications.forEach(med => {
            if (med.time === currentTime && med.lastReminded !== todayDate) {
                triggerAlarm(med);
                med.lastReminded = todayDate;
                saveAndRender(); // Update lastReminded
            }
        });
    }

    function triggerAlarm(med) {
        // Show Modal
        alarmMessage.textContent = `${med.name} ${med.note ? '(' + med.note + ')' : ''}`;
        alarmModal.classList.add('is-active');

        // Play Sound (Looping)
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log("Audio play failed:", e));

        // Browser Notification
        if (Notification.permission === "granted") {
            new Notification("用藥提醒", {
                body: `該吃藥囉！ ${med.name} \n備註: ${med.note || '無'}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/822/822163.png',
                requireInteraction: true // Keep notification until user interacts
            });
        }

        // Stop after 30 seconds
        if (alarmTimeout) clearTimeout(alarmTimeout);
        alarmTimeout = setTimeout(() => {
            stopAlarm();
        }, 30000);
    }

    function stopAlarm() {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        alarmModal.classList.remove('is-active');
        if (alarmTimeout) clearTimeout(alarmTimeout);
    }

    function formatTime(timeStr) {
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? '下午' : '上午';
        const h12 = h % 12 || 12;
        return `${ampm} ${h12}:${minute}`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
