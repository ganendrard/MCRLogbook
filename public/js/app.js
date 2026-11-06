document.addEventListener('DOMContentLoaded', () => {
    // --- Role Authentication Logic ---
    let currentRole = localStorage.getItem('mcr_role');
    let currentDangdutPage = 1;
    let currentPeriodValue = null;
    const itemsPerPage = 10;
    const loginModal = document.getElementById('login-modal');
    const appContainer = document.getElementById('app-container');
    const roleDisplay = document.getElementById('role-display');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Handle Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            loginError.classList.add('hidden');
            loginError.textContent = '';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('mcr_role', data.user.role);
                    currentRole = data.user.role;
                    loginModal.style.display = 'none';
                    appContainer.style.display = 'flex';
                    applyRoleRestrictions();
                    showToast(
                        '<i class="fa-solid fa-circle-check"></i> ' +
                        'Login berhasil!'
                    );
                } else {
                    loginError.textContent = data.error || 'Username atau password salah!';
                    loginError.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Login error:', error);
                loginError.textContent = 'Terjadi kesalahan jaringan.';
                loginError.classList.remove('hidden');
            }
        });
    }

    window.loginAsGuest = function() {
        localStorage.setItem('mcr_role', 'Guest');
        currentRole = 'Guest';
        loginModal.style.display = 'none';
        appContainer.style.display = 'flex';
        applyRoleRestrictions();
        showToast(
            '<i class="fa-solid fa-circle-check"></i> ' +
            'Masuk sebagai Guest (Read-Only)'
        );
    };

    window.logout = function() {
        localStorage.removeItem('mcr_role');
        location.reload();
    };

    function applyRoleRestrictions() {
        roleDisplay.innerHTML = 
            `<i class="fa-solid fa-user-shield"></i> Role: ${currentRole}`;

        const navs = document.querySelectorAll('.nav-links li');
        navs.forEach(nav => nav.classList.remove('hidden-by-role'));

        // Show/Unhide all restricted containers/forms first
        const formSelectors = [
            '#form-incident',
            '#dangdut-form-container',
            '#dangdut-history-panel',
            '.schedule-form-container',
            '#form-breaking-news',
            '#request-form-container'
        ].join(', ');
        document.querySelectorAll(formSelectors).forEach(el => {
            el.classList.remove('hidden-by-role');
        });

        // Show/Unhide all interactive cards and cards container first
        document.querySelectorAll('.interactive-card').forEach(card => {
            card.classList.remove('hidden-by-role');
        });
        const cardsContainer = document.querySelector('.cards-container');
        if (cardsContainer) {
            cardsContainer.classList.remove('hidden-by-role');
        }

        // Setup requests card view dynamically based on role
        const requestsCard = document.getElementById('stat-requests-card');
        if (requestsCard) {
            const isMCR = currentRole === 'MCR';
            if (isMCR) {
                requestsCard.innerHTML = `
                    <div class="stat-icon icon-info">
                        <i class="fa-solid fa-envelope-open-text"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Unread Titipan</h3>
                        <p id="stat-requests">0</p>
                        <span class="card-action-text">
                            Buka Titipan 
                            <i class="fa-solid fa-chevron-right"></i>
                        </span>
                    </div>
                `;
            } else {
                requestsCard.innerHTML = `
                    <div class="stat-icon icon-info">
                        <i class="fa-solid fa-envelope-open-text"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Titipan Khusus</h3>
                        <p class="card-text-highlight text-info">
                            Daftar Titipan
                        </p>
                        <span class="card-action-text">
                            Buka Titipan 
                            <i class="fa-solid fa-chevron-right"></i>
                        </span>
                    </div>
                `;
            }
        }

        if (currentRole === 'MCR') {
            // MCR sees Dashboard, Incidents, Requests, Breaking News, Schedules (Read-Only), Dangdut (Read-Only)
            document.querySelector('.schedule-form-container')
                .classList.add('hidden-by-role');
            document.querySelector('#dangdut-form-container')
                .classList.add('hidden-by-role');
            document.querySelector('#dangdut-history-panel')
                .classList.add('hidden-by-role');

            document.querySelector('[data-nav="dashboard"]').click();
        }
        else if (currentRole === 'Programming') {
            // Programming sees Dashboard, Schedules, Dangdut, Incidents, BN, Requests.
            // Hide forms for incidents and BN
            document.querySelector('#form-incident')
                .classList.add('hidden-by-role');
            document.querySelector('#form-breaking-news')
                .classList.add('hidden-by-role');

            document.querySelector('[data-nav="schedules"]').click();
        }
        else if (currentRole === 'Other') {
            // Other Dept sees Dashboard (Chronological Log) and Titipan (Requests)
            navs.forEach(nav => {
                const target = nav.getAttribute('data-nav');
                if (target !== 'dashboard' && target !== 'requests') {
                    nav.classList.add('hidden-by-role');
                }
            });

            document.querySelectorAll('.interactive-card').forEach(card => {
                if (card.getAttribute('data-target') !== 'requests') {
                    card.classList.add('hidden-by-role');
                }
            });

            document.querySelector('[data-nav="dashboard"]').click();
        }
        else if (currentRole === 'Guest') {
            // Guest can ONLY see dashboard, incidents, and breaking news.
            // Hide all nav links except Dashboard, Incidents, and Breaking News
            navs.forEach(nav => {
                const target = nav.getAttribute('data-nav');
                if (
                    target !== 'dashboard' && 
                    target !== 'incidents' && 
                    target !== 'breaking-news'
                ) {
                    nav.classList.add('hidden-by-role');
                }
            });

            // Hide the dashboard cards container
            const cardsContainer = document.querySelector('.cards-container');
            if (cardsContainer) {
                cardsContainer.classList.add('hidden-by-role');
            }

            // Hide ALL forms
            const guestSelectors = [
                '#form-incident',
                '#dangdut-form-container',
                '#dangdut-history-panel',
                '.schedule-form-container',
                '#form-breaking-news',
                '#request-form-container'
            ].join(', ');
            document.querySelectorAll(guestSelectors).forEach(el => {
                el.classList.add('hidden-by-role');
            });

            // Ensure status bar shows Guest Mode
            roleDisplay.innerHTML = 
                `<i class="fa-solid fa-eye"></i> Mode: Guest (Read-Only)`;
            roleDisplay.parentElement.classList.add('guest-mode');

            // Default view is Dashboard for Guest
            document.querySelector('[data-nav="dashboard"]').click();
        }

        const newPeriodBtnCont = document.getElementById(
            'new-period-btn-container'
        );
        if (newPeriodBtnCont) {
            if (currentRole === 'Programming') {
                newPeriodBtnCont.classList.remove('hidden-by-role');
            } else {
                newPeriodBtnCont.classList.add('hidden-by-role');
            }
        }
    }

    if (currentRole) {
        loginModal.style.display = 'none';
        appContainer.style.display = 'flex';
        applyRoleRestrictions();
    } else {
        loginModal.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    // --- Navigation Logic ---
    // Navigation Logic
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));

            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'dashboard') {
                loadDashboardData();
            } else if (targetId === 'schedules') {
                loadSchedulePeriods().then(() => {
                    loadSchedulesGrid();
                });
            } else if (targetId === 'requests') {
                loadRequests();
            } else if (targetId === 'dangdut') {
                loadDangdut();
            } else if (targetId === 'incidents') {
                loadIncidentsList();
            } else if (targetId === 'breaking-news') {
                loadBreakingNewsList();
            }
        });
    });

    // Interactive Dashboard Cards Click Navigation
    const interactiveCards = document.querySelectorAll('.interactive-card');
    interactiveCards.forEach(card => {
        card.addEventListener('click', () => {
            const target = card.getAttribute('data-target');
            const navItem = document.querySelector(
                `.nav-links li[data-target="${target}"]`
            );
            if (navItem && !navItem.classList.contains('hidden-by-role')) {
                navItem.click();
            }
        });
    });

    // Form Submissions
    const forms = {
        'form-incident': '/api/incidents',
        'form-schedule': '/api/schedules',
        'form-request': '/api/requests',
        'form-breaking-news': '/api/breaking-news',
        'form-dangdut': '/api/dangdut'
    };

    for (const [formId, endpoint] of Object.entries(forms)) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                let fetchOptions = { method: 'POST' };

                if (formId === 'form-incident') {
                    // Untuk upload file, gunakan FormData langsung
                    const formData = new FormData(form);
                    const incidentDateVal = formData.get('incident_date');
                    if (incidentDateVal) {
                        formData.append(
                            'incident_day', 
                            getDayNameFromDate(incidentDateVal)
                        );
                    }
                    fetchOptions.body = formData;
                    fetchOptions.headers = { 'x-user-role': currentRole };
                } else {
                    // Untuk form lainnya gunakan JSON
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());

                    if (formId === 'form-schedule') {
                        const checkedDays = Array.from(
                            form.querySelectorAll('input[name="days"]:checked')
                        ).map(cb => cb.value);
                        if (checkedDays.length === 0) {
                            showToast(
                                '<i class="fa-solid fa-circle-xmark"></i> ' +
                                'Pilih minimal satu hari tayang.',
                                true
                            );
                            return;
                        }
                        data.days = checkedDays;

                        const startTime = form.querySelector(
                            'input[name="start_time"]'
                        ).value;
                        const endTime = form.querySelector(
                            'input[name="end_time"]'
                        ).value;
                        data.program_time = `${startTime} - ${endTime}`;

                        data.is_replacement = form.querySelector(
                            '#is_replacement'
                        ).checked;
                        data.is_new = form.querySelector('#is_new').checked;
                        if (data.broadcast_type === 'Live') {
                            data.rating = '';
                            data.material_type = '';
                        }

                        if (currentPeriodValue) {
                            const [sDate, eDate] =
                                currentPeriodValue.split('|');
                            data.start_date = sDate;
                            data.end_date = eDate;
                        } else {
                            showToast(
                                '<i class="fa-solid fa-circle-xmark"></i> ' +
                                'Pilih/buat periode jadwal terlebih dahulu.',
                                true
                            );
                            return;
                        }
                    }

                    if (formId === 'form-dangdut') {
                        data.day_of_week = getDayNameFromDate(
                            data.playlist_date
                        );
                    }

                    fetchOptions.headers = {
                        'Content-Type': 'application/json',
                        'x-user-role': currentRole
                    };
                    fetchOptions.body = JSON.stringify(data);
                }

                try {
                    const response = await fetch(endpoint, fetchOptions);

                    if (response.ok) {
                        showToast(
                            '<i class="fa-solid fa-circle-check"></i> ' +
                            'Data submitted successfully!'
                        );
                        form.reset();
                        // Setelah reset form jadwal, pulihkan field rating & material
                        // yang tersembunyi saat Live dipilih
                        if (formId === 'form-schedule') {
                            const selBroadcast = document.getElementById('select-broadcast-type');
                            const grpRating = document.getElementById('group-rating');
                            const grpMaterial = document.getElementById('group-material');
                            if (selBroadcast && grpRating && grpMaterial) {
                                selBroadcast.value = '';
                                grpRating.style.display = '';
                                grpMaterial.style.display = '';
                                // Trigger change agar logika toggle berjalan bersih
                                selBroadcast.dispatchEvent(new Event('change'));
                            }
                            loadSchedulesGrid();
                        }
                        if (formId === 'form-request') loadRequests();
                        if (formId === 'form-dangdut') loadDangdut();
                        if (formId === 'form-incident') loadIncidentsList();
                        if (formId === 'form-breaking-news') loadBreakingNewsList();
                        loadDashboardData(); // Update stats immediately
                    } else {
                        showToast(
                            '<i class="fa-solid fa-circle-xmark"></i> ' +
                            'Failed to submit data.',
                            true
                        );
                    }
                } catch (error) {
                    showToast(
                        '<i class="fa-solid fa-circle-xmark"></i> Network error.',
                        true
                    );
                    console.error(error);
                }
            });
        }
    }

    // Load Dashboard Data
    async function loadDashboardData() {
        try {
            const [incidents, requests, breakingNews] = await Promise.all([
                fetch('/api/incidents').then(res => res.json()),
                fetch('/api/requests').then(res => res.json()),
                fetch('/api/breaking-news').then(res => res.json())
            ]);

            // Update Stats
            const statIncidentsEl = document.getElementById('stat-incidents');
            if (statIncidentsEl) statIncidentsEl.textContent = incidents.length || 0;

            const statRequestsEl = document.getElementById('stat-requests');
            if (statRequestsEl) {
                const unreadRequests = requests.filter(
                    r => r.is_read === 0
                ).length;
                statRequestsEl.textContent = unreadRequests;
            }

            const statBnEl = document.getElementById('stat-bn');
            if (statBnEl) statBnEl.textContent = breakingNews.length || 0;

            // Combine into timeline
            let timelineData = [];

            incidents.forEach(item => {
                let evidenceHtml = '';
                if (item.evidence_path) {
                    const isVideo = item.evidence_path.match(
                        /\.(mp4|webm|ogg)$/i
                    );
                    if (isVideo) {
                        evidenceHtml = 
                            `<div class="evidence-video-wrapper">` +
                            `<video controls>` +
                            `<source src="${item.evidence_path}">` +
                            `</video></div>`;
                    } else {
                        evidenceHtml = 
                            `<div class="evidence-img-wrapper">` +
                            `<a href="${item.evidence_path}" ` +
                            `target="_blank">` +
                            `<img src="${item.evidence_path}">` +
                            `</a></div>`;
                    }
                }

                timelineData.push({
                    type: 'Incident',
                    iconClass: 'icon-warning',
                    colorClass: 'type-incident',
                    time: item.incident_time || formatTime(item.created_at),
                    date: new Date(item.created_at),
                    title: `Technical Issue: ${item.category}`,
                    desc: item.description + evidenceHtml
                });
            });

            requests.forEach(item => {
                timelineData.push({
                    type: 'Request',
                    iconClass: 'icon-info',
                    colorClass: 'type-request',
                    time: `Target: ${formatDate(item.target_date)} ${item.target_time}`,
                    date: new Date(item.created_at),
                    title: `Titipan: ${item.request_type}`,
                    desc: item.details
                });
            });

            breakingNews.forEach(item => {
                timelineData.push({
                    type: 'Breaking News',
                    iconClass: 'icon-danger',
                    colorClass: 'type-breaking',
                    time: `Tayang: ${formatDate(item.broadcast_date)} ${item.broadcast_time}`,
                    date: new Date(item.created_at),
                    title: 'Breaking News Broadcast',
                    desc: item.content
                });
            });

            timelineData.sort((a, b) => b.date - a.date);

            let itemsToRender = timelineData;
            if (currentRole === 'Guest') {
                itemsToRender = timelineData.slice(0, 10);
            } else if (
                currentRole === 'MCR' ||
                currentRole === 'Programming' ||
                currentRole === 'Other'
            ) {
                itemsToRender = timelineData.slice(0, 25);
            }

            const timelineContainer = document.getElementById('timeline-log');
            timelineContainer.innerHTML = '';

            if (itemsToRender.length === 0) {
                timelineContainer.innerHTML = 
                    `<p class="timeline-empty-message">` +
                    `No logs available yet.` +
                    `</p>`;
                return;
            }

            itemsToRender.forEach(item => {
                const el = document.createElement('div');
                el.className = 'timeline-item';
                el.innerHTML = `
                    <div class="timeline-icon ${item.iconClass}"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-type">${item.title}</span>
                            <span class="timeline-time">${item.time}</span>
                        </div>
                        <p class="timeline-item-desc">${item.desc}</p>
                    </div>
                `;
                timelineContainer.appendChild(el);
            });

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // Load Requests Table
    async function loadRequests() {
        try {
            const res = await fetch('/api/requests');
            const requests = await res.json();
            const tbody = document.querySelector('#requests-table tbody');
            tbody.innerHTML = '';

            const isMCR = currentRole === 'MCR';
            const thead = document.querySelector('#requests-table thead');
            if (thead) {
                thead.innerHTML = `
                    <tr>
                        ${isMCR ? '<th>Status</th>' : ''}
                        <th>Target Waktu</th>
                        <th>Jenis Titipan</th>
                        <th>Detail Keterangan</th>
                        <th>Dibuat Pada</th>
                        ${isMCR ? '<th>Aksi</th>' : ''}
                    </tr>
                `;
            }

            if (requests.length === 0) {
                const colSpan = isMCR ? 6 : 4;
                tbody.innerHTML = 
                    `<tr>` +
                    `<td colspan="${colSpan}" class="table-empty-message">` +
                    `Tidak ada titipan.` +
                    `</td>` +
                    `</tr>`;
                return;
            }

            requests.forEach(r => {
                const tr = document.createElement('tr');
                const badgeClass = r.is_read ? 'badge-read' : 'badge-unread';
                const badgeText = r.is_read ? 'Sudah Dibaca' : 'Belum Dibaca';

                const actionBtn = 
                    (r.is_read === 0 && currentRole === 'MCR')
                    ? `<button class="btn-icon check" ` +
                      `title="Tandai Sudah Dibaca" ` +
                      `onclick="markRequestRead(${r.id})">` +
                      `<i class="fa-solid fa-check-double"></i>` +
                      `</button>`
                    : ``;

                const timeDisplay = r.target_time ? `${r.target_time}` : '-';

                tr.innerHTML = `
                    ${isMCR ? `<td><span class="badge ${badgeClass}">${badgeText}</span></td>` : ''}
                    <td><strong>${formatDate(r.target_date)}</strong><br>${timeDisplay}</td>
                    <td>${r.request_type}</td>
                    <td>${r.details}</td>
                    <td class="meta-timestamp">` +
                    `${formatDate(r.created_at)} ` +
                    `${formatTime(r.created_at)}` +
                    `</td>
                    ${isMCR ? `<td>${actionBtn}</td>` : ''}
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading requests:', err);
        }
    }

    window.markRequestRead = async function(id) {
        try {
            const res = await fetch(`/api/requests/${id}/read`, {
                method: 'PUT',
                headers: { 'x-user-role': currentRole }
            });
            if (res.ok) {
                showToast(
                    '<i class="fa-solid fa-check"></i> ' +
                    'Titipan ditandai sudah dibaca'
                );
                loadRequests();
                loadDashboardData();
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Load Schedules Grid
    async function loadSchedulesGrid() {
        try {
            let url = '/api/schedules';
            let activeText = '';

            const excelBtn = document.getElementById('btn-export-excel');
            const pdfBtn = document.getElementById('btn-export-pdf');

            if (currentPeriodValue) {
                const [startDate, endDate] =
                    currentPeriodValue.split('|');
                url +=
                    `?start_date=${startDate}&end_date=${endDate}`;

                const startStr = formatDate(startDate);
                const endStr = formatDate(endDate);
                activeText = `(${startStr} - ${endStr})`;

                if (excelBtn) {
                    excelBtn.href =
                        `/api/export/schedules/excel` +
                        `?start_date=${startDate}` +
                        `&end_date=${endDate}`;
                }
                if (pdfBtn) {
                    pdfBtn.href =
                        `/api/export/schedules/pdf` +
                        `?start_date=${startDate}` +
                        `&end_date=${endDate}`;
                }
            } else {
                if (excelBtn) {
                    excelBtn.href = '/api/export/schedules/excel';
                }
                if (pdfBtn) {
                    pdfBtn.href = '/api/export/schedules/pdf';
                }
            }

            const activeTextSpan = document.getElementById(
                'schedule-active-period-text'
            );
            if (activeTextSpan) {
                activeTextSpan.textContent = activeText;
            }

            const res = await fetch(url);
            const schedules = await res.json();

            const tbody = document.querySelector('#weekly-grid-table tbody');
            tbody.innerHTML = '';

            const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

            // Tentukan nama hari ini dalam Bahasa Indonesia
            const todayDayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
            const todayStr = (() => {
                const t = new Date();
                const pad = n => String(n).padStart(2, '0');
                return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
            })();
            const todayDayName = todayDayNames[new Date().getDay()];

            // Highlight hari ini HANYA jika periode aktif mencakup hari ini
            let showTodayHighlight = false;
            if (currentPeriodValue) {
                const [pStart, pEnd] = currentPeriodValue.split('|');
                showTodayHighlight = pStart <= todayStr && todayStr <= pEnd;
            }

            // Update header tabel SELALU (sebelum early return)
            // agar badge "Hari Ini" bersih saat pindah periode
            const thead = document.querySelector('#weekly-grid-table thead tr');
            if (thead) {
                thead.innerHTML = '<th class="time-col">Waktu</th>' +
                    days.map(d => {
                        const isToday = showTodayHighlight && d === todayDayName;
                        const cls = isToday ? 'today-col-header' : '';
                        const todayBadge = isToday
                            ? ` <span class="today-badge">Hari Ini</span>`
                            : '';
                        return `<th class="${cls}">${d}${todayBadge}</th>`;
                    }).join('');
            }

            if (schedules.length === 0) {
                tbody.innerHTML = 
                    `<tr>` +
                    `<td colspan="8" class="timeline-empty-message">` +
                    `Belum ada jadwal yang diinput.` +
                    `</td>` +
                    `</tr>`;
                return;
            }

            // Extract unique times
            const uniqueTimes = [...new Set(schedules.map(s => s.program_time))].sort();

            uniqueTimes.forEach(time => {
                const tr = document.createElement('tr');
                let html = `<td class="time-col">${time}</td>`;

                days.forEach(day => {
                    const progs = schedules.filter(
                        s => s.program_time === time && s.day_of_week === day
                    );
                    const isToday = showTodayHighlight && day === todayDayName;
                    let cellHtml = isToday ? '<td class="today-col-cell">' : '<td>';

                    progs.forEach(p => {
                        let classNames = 'prog-cell';
                        if (p.is_replacement) classNames += ' replacement';
                        if (p.is_new) classNames += ' new-prog';

                        let metaInfo = '';
                        let titleInfo = p.program_name;
                        if (p.broadcast_type === 'Live') {
                            metaInfo = `<span>Live</span>`;
                        } else if (p.broadcast_type === 'Taping') {
                            titleInfo = `${p.program_name} (${p.rating || '-'})`;
                            metaInfo = `<span>${p.material_type || '-'}</span> | <span>Taping</span>`;
                        } else {
                            // broadcast_type kosong/opsional
                            const ratingPart = p.rating ? ` (${p.rating})` : '';
                            titleInfo = `${p.program_name}${ratingPart}`;
                            metaInfo = p.material_type ? `<span>${p.material_type}</span>` : '';
                        }


                        let deleteBtnHtml = '';
                        // Sembunyikan tombol delete jika role adalah MCR atau Other
                        if (currentRole === 'Programming') {
                            deleteBtnHtml = 
                                `<button class="btn-del-prog" ` +
                                `title="Hapus" ` +
                                `onclick="deleteSchedule(${p.id})">` +
                                `<i class="fa-solid fa-xmark"></i>` +
                                `</button>`;
                        }

                        cellHtml += `
                            <div class="${classNames}">
                                <div class="prog-title">${titleInfo}</div>
                                <div class="prog-meta">
                                    ${metaInfo}
                                </div>
                                ${deleteBtnHtml}
                            </div>
                        `;
                    });

                    cellHtml += '</td>';
                    html += cellHtml;
                });

                tr.innerHTML = html;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('Error loading schedule grid:', error);
        }
    }

    window.deleteSchedule = async function(id) {
        if(confirm('Hapus program ini dari jadwal?')) {
            try {
                const delRes = await fetch(`/api/schedules/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-role': currentRole }
                });
                if (delRes.ok) {
                    showToast(
                        '<i class="fa-solid fa-trash"></i> Jadwal dihapus'
                    );
                    loadSchedulesGrid();
                }
            } catch(err) {
                console.error(err);
            }
        }
    }

    function getCurrentWeekPeriod() {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
        const Monday = new Date(today.setDate(diffToMonday));
        const Sunday = new Date(Monday);
        Sunday.setDate(Monday.getDate() + 6);
        
        const pad = (num) => String(num).padStart(2, '0');
        const format = (d) => 
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        
        return {
            start_date: format(Monday),
            end_date: format(Sunday)
        };
    }

    async function loadSchedulePeriods(selectPeriodVal) {
        try {
            const res = await fetch('/api/schedules/periods');
            const periods = await res.json();
            const tabsScroll = document.getElementById(
                'period-tabs-scroll'
            );
            if (!tabsScroll) return;
            tabsScroll.innerHTML = '';

            let hasPeriods = periods.length > 0;
            let periodsToShow = [];

            if (!hasPeriods) {
                const cur = getCurrentWeekPeriod();
                periodsToShow = [{
                    start_date: cur.start_date,
                    end_date: cur.end_date
                }];
            } else {
                periodsToShow = periods;
            }

            periodsToShow.forEach((p) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'period-tab-btn';
                const val = `${p.start_date}|${p.end_date}`;
                btn.dataset.value = val;
                const startStr = formatDate(p.start_date);
                const endStr = formatDate(p.end_date);
                btn.textContent = `${startStr} – ${endStr}`;

                btn.addEventListener('click', () => {
                    tabsScroll
                        .querySelectorAll('.period-tab-btn')
                        .forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentPeriodValue = btn.dataset.value;
                    loadSchedulesGrid();
                });

                tabsScroll.appendChild(btn);
            });

            // Set which tab is active
            let targetVal = selectPeriodVal;
            if (!targetVal && hasPeriods) {
                // Untuk role MCR: cari periode yang mencakup hari ini
                const todayStr = (() => {
                    const t = new Date();
                    const pad = n => String(n).padStart(2, '0');
                    return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
                })();

                if (currentRole === 'MCR') {
                    // Cari periode yang start_date <= hari ini <= end_date
                    const currentPeriod = periodsToShow.find(p =>
                        p.start_date <= todayStr && todayStr <= p.end_date
                    );
                    if (currentPeriod) {
                        targetVal = `${currentPeriod.start_date}|${currentPeriod.end_date}`;
                    } else {
                        // Fallback: periode terbaru
                        targetVal =
                            `${periodsToShow[0].start_date}` +
                            `|${periodsToShow[0].end_date}`;
                    }
                } else {
                    // Role lain: periode terbaru (perilaku lama)
                    targetVal =
                        `${periodsToShow[0].start_date}` +
                        `|${periodsToShow[0].end_date}`;
                }
            }

            if (targetVal) {
                currentPeriodValue = targetVal;
                const activeBtn = tabsScroll.querySelector(
                    `[data-value="${targetVal}"]`
                );
                if (activeBtn) {
                    activeBtn.classList.add('active');
                    // Scroll tab aktif ke tampilan (untuk MCR)
                    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        } catch (err) {
            console.error('Error loading schedule periods:', err);
        }
    }

    // Helpers
    function showToast(messageHtml, isError = false) {
        const toast = document.getElementById('toast');
        toast.innerHTML = messageHtml;
        if (isError) toast.classList.add('error');
        else toast.classList.remove('error');

        toast.classList.remove('hidden');
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 400);
        }, 3000);
    }

    // --- Polling Notification Logic ---
    let lastKnownUpdate = Date.now();

    // Initial fetch to sync timestamp
    fetch('/api/latest-updates')
        .then(res => res.json())
        .then(data => { lastKnownUpdate = data.timestamp; })
        .catch(err => console.error(err));

    setInterval(async () => {
        try {
            const res = await fetch(`/api/latest-updates?since=${lastKnownUpdate}`);
            const data = await res.json();
            if (data.hasUpdates) {
                lastKnownUpdate = data.timestamp;
                showToast(
                    '<i class="fa-solid fa-bell fa-shake"></i> ' +
                    'Ada pembaruan data baru dari divisi lain!',
                    false
                );

                // Refresh current view if applicable
                if (!document.getElementById('dashboard').classList.contains('hidden')) loadDashboardData();
                if (!document.getElementById('requests').classList.contains('hidden')) loadRequests();
                if (!document.getElementById('schedules').classList.contains('hidden')) loadSchedulesGrid();
                if (!document.getElementById('dangdut').classList.contains('hidden')) loadDangdut();
                if (!document.getElementById('incidents').classList.contains('hidden')) loadIncidentsList();
                if (!document.getElementById('breaking-news').classList.contains('hidden')) loadBreakingNewsList();
            }
        } catch (err) {
            // silent fail for polling
        }
    }, 10000); // Poll every 10 seconds

    function formatTime(dateString) {
        if(!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getDayNameFromDate(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return '';
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        const days = [
            'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
        ];
        return days[date.getDay()];
    }

    function formatDate(dateString) {
        if(!dateString) return '';
        // If it is YYYY-MM-DD format, parse manually to avoid timezone shift
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            const year = parts[0];
            const monthNames = [
                'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
            ];
            const monthIdx = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            if (monthIdx >= 0 && monthIdx < 12) {
                return `${day} ${monthNames[monthIdx]} ${year}`;
            }
        }
        const d = new Date(dateString);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    // Toggle logic for Broadcast Type
    const selectBroadcast = document.getElementById('select-broadcast-type');
    const groupRating = document.getElementById('group-rating');
    const groupMaterial = document.getElementById('group-material');

    if (selectBroadcast) {
        selectBroadcast.addEventListener('change', (e) => {
            if (e.target.value === 'Live') {
                groupRating.style.display = 'none';
                groupMaterial.style.display = 'none';
            } else {
                groupRating.style.display = 'flex';
                groupMaterial.style.display = 'flex';
            }
        });

        // Trigger on load
        selectBroadcast.dispatchEvent(new Event('change'));
    }

    // Load Dangdut Grid & History
    async function loadDangdut() {
        const viewDateEl = document.getElementById('dangdut-view-date');
        const dayDisplayEl = document.getElementById('dangdut-view-day-display');
        
        if (!viewDateEl) return;
        const viewDate = viewDateEl.value;
        
        if (dayDisplayEl) {
            dayDisplayEl.textContent = `Hari: ${getDayNameFromDate(viewDate)}`;
        }

        try {
            const res = await fetch('/api/dangdut');
            const data = await res.json();

            const slot14Content = document.getElementById('slot-content-14');
            const slot00Content = document.getElementById('slot-content-00');

            if (slot14Content) {
                slot14Content.innerHTML = 
                    `<p class="timeline-empty-message">` +
                    `Belum ada playlist.` +
                    `</p>`;
            }
            if (slot00Content) {
                slot00Content.innerHTML = 
                    `<p class="timeline-empty-message">` +
                    `Belum ada playlist.` +
                    `</p>`;
            }

            // 1. Render Slots for chosen date
            const dayPlaylists = data.filter(p => p.playlist_date === viewDate);
            dayPlaylists.forEach(p => {
                const songListHtml = p.song_list.replace(/\n/g, '<br>');
                let deleteBtnHtml = '';
                if (currentRole === 'Programming') {
                    deleteBtnHtml = 
                        `<button class="btn-del-dangdut" ` +
                        `title="Hapus Playlist" ` +
                        `onclick="deleteDangdut(${p.id})">` +
                        `<i class="fa-solid fa-trash"></i> Hapus` +
                        `</button>`;
                }

                const playlistHtml = `
                    <div class="dangdut-playlist-wrapper">
                        <div class="dangdut-playlist-songs">${songListHtml}</div>
                        ${deleteBtnHtml}
                    </div>
                `;

                if (p.time_slot === '14:00 - 15:00') {
                    if (slot14Content) slot14Content.innerHTML = playlistHtml;
                } else if (p.time_slot === '00:30 - 01:30') {
                    if (slot00Content) slot00Content.innerHTML = playlistHtml;
                }
            });

            // 2. Render Scheduled Playlists list at the bottom
            const tbody = document.querySelector(
                '#dangdut-history-table tbody'
            );
            if (tbody) {
                tbody.innerHTML = '';
                
                // Filter playlists that have a valid date
                const scheduledPlaylists = data.filter(
                    p => p.playlist_date
                ).sort((a, b) => {
                    return b.playlist_date.localeCompare(a.playlist_date) || 
                           a.time_slot.localeCompare(b.time_slot);
                });

                const pagContainer = document.getElementById(
                    'dangdut-pagination'
                );

                if (scheduledPlaylists.length === 0) {
                    tbody.innerHTML = 
                        `<tr>` +
                        `<td colspan="4" class="timeline-empty-message">` +
                        `Belum ada playlist dangdut terinput.` +
                        `</td>` +
                        `</tr>`;
                    if (pagContainer) pagContainer.style.display = 'none';
                    return;
                }

                if (pagContainer) pagContainer.style.display = 'flex';

                const totalPages = Math.ceil(
                    scheduledPlaylists.length / itemsPerPage
                );

                if (currentDangdutPage > totalPages) {
                    currentDangdutPage = totalPages;
                }
                if (currentDangdutPage < 1) {
                    currentDangdutPage = 1;
                }

                const pageInfo = document.getElementById('dangdut-page-info');
                if (pageInfo) {
                    pageInfo.textContent = 
                        `Halaman ${currentDangdutPage} dari ${totalPages}`;
                }

                const prevBtn = document.getElementById('dangdut-prev-btn');
                const nextBtn = document.getElementById('dangdut-next-btn');
                if (prevBtn) prevBtn.disabled = (currentDangdutPage === 1);
                if (nextBtn) {
                    nextBtn.disabled = (currentDangdutPage === totalPages);
                }

                const slicedPlaylists = scheduledPlaylists.slice(
                    (currentDangdutPage - 1) * itemsPerPage,
                    currentDangdutPage * itemsPerPage
                );

                slicedPlaylists.forEach(p => {
                    const tr = document.createElement('tr');
                    
                    const songs = p.song_list.split('\n');
                    const previewText = songs.slice(0, 2).join(', ') +
                        (songs.length > 2 ? '...' : '');

                    let deleteBtnHtml = '';
                    if (currentRole === 'Programming') {
                        deleteBtnHtml = 
                            `<button class="btn-icon delete" ` +
                            `title="Hapus" ` +
                            `onclick="deleteDangdut(${p.id})">` +
                            `<i class="fa-solid fa-trash"></i>` +
                            `</button>`;
                    }

                    const dateVal = p.playlist_date;
                    const dateText = formatDate(dateVal);
                    const openBtnHtml = `<button class="btn-select-date" ` +
                        `onclick="setViewDate('${dateVal}')">` +
                        `Buka</button>`;

                    tr.innerHTML = `
                        <td>
                            <strong>${dateText}</strong>
                            <br>${p.day_of_week}
                        </td>
                        <td>${p.time_slot} WIB</td>
                        <td class="dangdut-playlist-songs">
                            ${previewText}
                        </td>
                        <td>
                            ${openBtnHtml}
                            ${deleteBtnHtml}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }

        } catch (error) {
            console.error('Error loading dangdut grid:', error);
        }
    }

    window.deleteDangdut = async function(id) {
        if (confirm('Hapus playlist dangdut ini?')) {
            try {
                const delRes = await fetch(`/api/dangdut/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-role': currentRole }
                });
                if (delRes.ok) {
                    showToast(
                        '<i class="fa-solid fa-trash"></i> Playlist dihapus'
                    );
                    loadDangdut();
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    window.changeDangdutPage = function(direction) {
        currentDangdutPage += direction;
        loadDangdut();
    };

    // Load Incidents Table for History
    async function loadIncidentsList() {
        try {
            const res = await fetch('/api/incidents');
            const incidents = await res.json();
            const tbody = document.querySelector('#incidents-table tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (incidents.length === 0) {
                tbody.innerHTML = 
                    `<tr>` +
                    `<td colspan="6" class="timeline-empty-message">` +
                    `Tidak ada riwayat insiden.` +
                    `</td>` +
                    `</tr>`;
                return;
            }

            incidents.forEach(item => {
                const tr = document.createElement('tr');

                let evidenceHtml = '-';
                if (item.evidence_path) {
                    const isVideo = item.evidence_path.match(/\.(mp4|webm|ogg)$/i);
                    if (isVideo) {
                        evidenceHtml = 
                            `<video width="120" controls>` +
                            `<source src="${item.evidence_path}">` +
                            `</video>`;
                    } else {
                        evidenceHtml = 
                            `<a href="${item.evidence_path}" ` +
                            `target="_blank">` +
                            `<img src="${item.evidence_path}" ` +
                            `class="evidence-img-thumb">` +
                            `</a>`;
                    }
                }

                let deleteBtnHtml = '';
                // Hanya MCR yang bisa menghapus insiden
                if (currentRole === 'MCR') {
                    deleteBtnHtml = 
                        `<button class="btn-icon delete" ` +
                        `title="Hapus" ` +
                        `onclick="deleteIncident(${item.id})">` +
                        `<i class="fa-solid fa-trash"></i>` +
                        `</button>`;
                }

                const dateDisplay = item.incident_date ? formatDate(item.incident_date) : '';
                tr.innerHTML = `
                    <td>` +
                    `<strong>${item.incident_day || 'Senin'}</strong>` +
                    `${dateDisplay ? `, ${dateDisplay}` : ''}` +
                    `<br>${item.incident_time} WIB` +
                    `</td>
                    <td>` +
                    `<span class="badge badge-incident">` +
                    `${item.category}` +
                    `</span>` +
                    `</td>
                    <td>${item.description}</td>
                    <td>${evidenceHtml}</td>
                    <td class="meta-timestamp">` +
                    `${formatDate(item.created_at)} ` +
                    `${formatTime(item.created_at)}` +
                    `</td>
                    <td>${deleteBtnHtml}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading incidents:', err);
        }
    }

    window.deleteIncident = async function(id) {
        if (confirm('Apakah Anda yakin ingin menghapus insiden ini dari riwayat?')) {
            try {
                const res = await fetch(`/api/incidents/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-role': currentRole }
                });
                if (res.ok) {
                    showToast(
                        '<i class="fa-solid fa-trash"></i> ' +
                        'Insiden berhasil dihapus'
                    );
                    loadIncidentsList();
                    loadDashboardData();
                } else {
                    const errData = await res.json();
                    showToast(
                        `<i class="fa-solid fa-circle-xmark"></i> ` +
                        `${errData.error || 'Gagal menghapus insiden'}`,
                        true
                    );
                }
            } catch (err) {
                console.error(err);
                showToast(
                    '<i class="fa-solid fa-circle-xmark"></i> ' +
                    'Kesalahan jaringan.',
                    true
                );
            }
        }
    }

    // Load Breaking News Table for History
    async function loadBreakingNewsList() {
        try {
            const res = await fetch('/api/breaking-news');
            const data = await res.json();
            const tbody = document.querySelector('#breaking-news-table tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = 
                    `<tr>` +
                    `<td colspan="3" class="timeline-empty-message">` +
                    `Tidak ada riwayat breaking news.` +
                    `</td>` +
                    `</tr>`;
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>` +
                    `<strong>${formatDate(item.broadcast_date)}</strong>` +
                    `<br>${item.broadcast_time} WIB` +
                    `</td>
                    <td>${item.content}</td>
                    <td class="meta-timestamp">` +
                    `${formatDate(item.created_at)} ` +
                    `${formatTime(item.created_at)}` +
                    `</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading breaking news:', err);
        }
    }

    window.deleteBreakingNews = async function(id) {
        if (confirm('Apakah Anda yakin ingin menghapus breaking news ini dari riwayat?')) {
            try {
                const res = await fetch(`/api/breaking-news/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-role': currentRole }
                });
                if (res.ok) {
                    showToast(
                        '<i class="fa-solid fa-trash"></i> ' +
                        'Breaking News berhasil dihapus'
                    );
                    loadBreakingNewsList();
                    loadDashboardData();
                } else {
                    const errData = await res.json();
                    showToast(
                        `<i class="fa-solid fa-circle-xmark"></i> ` +
                        `${errData.error || 'Gagal menghapus breaking news'}`,
                        true
                    );
                }
            } catch (err) {
                console.error(err);
                showToast(
                    '<i class="fa-solid fa-circle-xmark"></i> ' +
                    'Kesalahan jaringan.',
                    true
                );
            }
        }
    }

    // Set up Date values for Dangdut Playlist
    const localToday = new Date();
    const yyyy = localToday.getFullYear();
    const mm = String(localToday.getMonth() + 1).padStart(2, '0');
    const dd = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const dViewDate = document.getElementById('dangdut-view-date');
    if (dViewDate) {
        dViewDate.value = todayStr;
        dViewDate.addEventListener('change', () => {
            loadDangdut();
        });
    }

    const dFormDate = document.getElementById('dangdut-date');
    if (dFormDate) {
        dFormDate.value = todayStr;
    }

    // Helper to change active view date from scheduled playlist list
    window.setViewDate = function(dateStr) {
        const input = document.getElementById('dangdut-view-date');
        if (input) {
            input.value = dateStr;
            loadDangdut();
        }
    };

    // Period tab change is handled by click listeners in loadSchedulePeriods

    // New Period Inline Form Handling
    const btnToggleNewPeriod = document.getElementById(
        'btn-toggle-new-period'
    );
    const newPeriodFormCont = document.getElementById(
        'new-period-form-container'
    );
    if (btnToggleNewPeriod && newPeriodFormCont) {
        btnToggleNewPeriod.addEventListener('click', () => {
            newPeriodFormCont.classList.toggle('hidden');
        });
    }

    const btnCancelNewPeriod = document.getElementById(
        'btn-cancel-new-period'
    );
    if (btnCancelNewPeriod && newPeriodFormCont) {
        btnCancelNewPeriod.addEventListener('click', () => {
            newPeriodFormCont.classList.add('hidden');
            document.getElementById('new-period-start').value = '';
            document.getElementById('new-period-end').value = '';
        });
    }

    const btnSaveNewPeriod = document.getElementById(
        'btn-save-new-period'
    );
    if (btnSaveNewPeriod && newPeriodFormCont) {
        btnSaveNewPeriod.addEventListener('click', async () => {
            const startVal = document.getElementById(
                'new-period-start'
            ).value;
            const endVal = document.getElementById(
                'new-period-end'
            ).value;
            
            if (!startVal || !endVal) {
                showToast(
                    '<i class="fa-solid fa-circle-xmark"></i> ' +
                    'Lengkapi tanggal mulai dan selesai.',
                    true
                );
                return;
            }
            if (startVal > endVal) {
                showToast(
                    '<i class="fa-solid fa-circle-xmark"></i> ' +
                    'Tanggal mulai melebihi selesai.',
                    true
                );
                return;
            }

            try {
                const res = await fetch('/api/schedule-periods', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-role': currentRole
                    },
                    body: JSON.stringify({
                        start_date: startVal,
                        end_date: endVal
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    showToast(
                        '<i class="fa-solid fa-circle-xmark"></i> ' +
                        (errData.error || 'Gagal menyimpan periode.'),
                        true
                    );
                    return;
                }
            } catch (err) {
                console.error(err);
                showToast(
                    '<i class="fa-solid fa-circle-xmark"></i> ' +
                    'Kesalahan jaringan.',
                    true
                );
                return;
            }

            newPeriodFormCont.classList.add('hidden');
            document.getElementById('new-period-start').value = '';
            document.getElementById('new-period-end').value = '';

            // Reload periods from server and select the new one
            const newPeriodVal = `${startVal}|${endVal}`;
            await loadSchedulePeriods(newPeriodVal);
            loadSchedulesGrid();
            showToast(
                '<i class="fa-solid fa-circle-check"></i> ' +
                'Periode baru berhasil disimpan.'
            );
        });
    }

    // Muat data dashboard dan riwayat saat inisialisasi jika role aktif
    if (currentRole) {
        loadDashboardData();
        loadIncidentsList();
        loadBreakingNewsList();
        loadSchedulePeriods().then(() => {
            loadSchedulesGrid();
        });
    }
});
