async function loadVideos() {
	const status = document.getElementById('video-status');
	const list = document.getElementById('video-list');
	const login = document.getElementById('video-login');
	const navigation = document.getElementById('video-navigation');
	const apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '' ? 'http://localhost:3000' : '')));
	const sections = {
		'Day 1': ['Amd', 'Orderblocks', 'OHLC', 'OLHC'],
		'Day 2': ['Daily bias', 'Key opens', 'SMT Divergence'],
		'Day 3': ['Protected High/Low', 'Narrative', 'IDM'],
		'Day 4': ['Net GEX', 'Pinning', '0dte', 'Open Intrest']
	};
	let selectedDay = 'Day 1';
	let selectedTopic = sections[selectedDay][0];
	let loadedVideos = [];
	const renderedSections = new Map();
	const norm = s => String(s || '').trim().toLowerCase();

	function renderNavigation() {
		navigation.replaceChildren();
		Object.entries(sections).forEach(([day, topics]) => {
			const dayGroup = document.createElement('div');
			dayGroup.className = 'video-day-group';
			 dayGroup.dataset.active = day === selectedDay ? 'true' : 'false';
			const dayButton = document.createElement('button');
			dayButton.type = 'button';
			dayButton.className = `video-day-button${day === selectedDay ? ' active' : ''}`;
			dayButton.textContent = day;
			dayButton.addEventListener('click', () => {
				selectedDay = day;
				selectedTopic = sections[day][0];
				renderNavigation();
				renderVideos();
			});
			dayGroup.append(dayButton);
			navigation.append(dayGroup);

			if (day !== selectedDay) return;
			const topicList = document.createElement('div');
			topicList.className = 'video-topic-list';
			topics.forEach(topic => {
				const topicButton = document.createElement('button');
				topicButton.type = 'button';
				topicButton.className = `video-topic-button${topic === selectedTopic ? ' active' : ''}`;
				topicButton.textContent = topic;
				topicButton.addEventListener('click', () => {
					selectedTopic = topic;
					renderNavigation();
					renderVideos();
				});
				topicList.append(topicButton);
			});
			dayGroup.append(topicList);
		});
	}

	
	function renderVideos() {
		const visibleVideos = loadedVideos.filter(video => norm(video.day) === norm(selectedDay) && norm(video.topic) === norm(selectedTopic));
		list.replaceChildren(...(renderedSections.get(`${norm(selectedDay)}:${norm(selectedTopic)}`) || []));
		status.textContent = visibleVideos.length ? '' : `No videos in ${selectedDay} / ${selectedTopic} yet.`;
	}

	try {
		const authResponse = await fetch(`${apiBase}/api/whoami?t=` + Date.now(), {credentials: 'include', cache: 'no-store'});
		const auth = await authResponse.json();
		if (!auth.user) {
			status.textContent = 'Sign in with Discord to view the video library.';
			login.hidden = false;
			return;
		}

		const response = await fetch(`${apiBase}/api/videos`, {credentials: 'include'});
		if (response.status === 403) {
			status.textContent = 'Your Discord account does not have library access yet.';
			return;
		}
		if (!response.ok) throw new Error('video request failed');

		loadedVideos = await response.json();
		renderNavigation();

		loadedVideos.forEach(video => {
			const section = document.createElement('article');
			section.className = 'section video-section';
			section.dataset.day = video.day || '';
			section.dataset.topic = video.topic || '';
			const sectionKey = `${norm(video.day)}:${norm(video.topic)}`;
			if (!renderedSections.has(sectionKey)) renderedSections.set(sectionKey, []);
			renderedSections.get(sectionKey).push(section);

			const titleRow = document.createElement('div');
			titleRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin:0 0 16px;';
			if(video.thumbnail){
			  const thumb = document.createElement('img');
			  thumb.src = `${apiBase}${video.thumbnail}`;
			  thumb.alt = '';
			  thumb.loading = 'lazy';
			  thumb.style.cssText = 'width:80px;height:45px;object-fit:cover;background:#16161b;border:1px solid #1f1f25;border-radius:4px;flex-shrink:0;';
			  thumb.onerror = () => { thumb.style.display='none'; };
			  titleRow.appendChild(thumb);
			}
			const title = document.createElement('h3');
			title.textContent = video.name;
			title.style.cssText = 'margin:0;font-family:Georgia,serif;font-size:1.4rem;';
			titleRow.appendChild(title);

			const wrapper = document.createElement('div');
			wrapper.className = 'custom-player-wrapper';
			wrapper.addEventListener('contextmenu', event => event.preventDefault());
			wrapper.addEventListener('dragstart', event => event.preventDefault());

			const watermark = document.createElement('div');
			watermark.className = 'video-watermark';
			watermark.textContent = `DRAFTED | ${video.viewer || auth.user.global_name || auth.user.username}`;

			const player = document.createElement('video');
			player.className = 'video-player custom-video';
			player.preload = 'metadata';
			player.src = `${apiBase}${video.url}`;
			if(video.thumbnail) player.poster = `${apiBase}${video.thumbnail}`;
			player.addEventListener('contextmenu', event => event.preventDefault());

			wrapper.innerHTML = `
				<div class="big-play-btn">
					<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
				</div>
				<div class="player-controls">
					<button class="play-pause-btn">
						<svg class="icon-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
						<svg class="icon-pause" viewBox="0 0 24 24" style="display:none;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
					</button>
					<div class="progress-container">
						<div class="progress-bar"><div class="progress-filled"></div></div>
					</div>
					<div class="time-display">0:00 / 0:00</div>
					<button class="mute-btn" aria-label="Mute video">
						<svg class="icon-volume" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zm0-8.5v2.06A7 7 0 0 1 16.5 18.44v2.06a9 9 0 0 0 0-17z"/></svg>
						<svg class="icon-muted" viewBox="0 0 24 24" style="display:none;"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm14.59 3 2.12-2.12-1.41-1.41L16.17 10.6l-2.12-2.13-1.42 1.42 2.13 2.12-2.13 2.12 1.42 1.42 2.12-2.13 2.13 2.13 1.41-1.42L17.59 12z"/></svg>
					</button>
					<input class="volume-slider" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
					<button class="fullscreen-btn">
						<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
					</button>
				</div>
			`;
			wrapper.insertBefore(player, wrapper.firstChild);

			const playPauseBtn = wrapper.querySelector('.play-pause-btn');
			const bigPlayBtn = wrapper.querySelector('.big-play-btn');
			const iconPlay = wrapper.querySelector('.icon-play');
			const iconPause = wrapper.querySelector('.icon-pause');
			const progressContainer = wrapper.querySelector('.progress-container');
			const progressFilled = wrapper.querySelector('.progress-filled');
			const timeDisplay = wrapper.querySelector('.time-display');
			const muteBtn = wrapper.querySelector('.mute-btn');
			const iconVolume = wrapper.querySelector('.icon-volume');
			const iconMuted = wrapper.querySelector('.icon-muted');
			const volumeSlider = wrapper.querySelector('.volume-slider');
			const fullscreenBtn = wrapper.querySelector('.fullscreen-btn');

			const formatTime = (seconds) => {
				if (isNaN(seconds)) return '0:00';
				const m = Math.floor(seconds / 60);
				const s = Math.floor(seconds % 60);
				return `${m}:${s < 10 ? '0' : ''}${s}`;
			};

			const togglePlay = () => {
				if (player.paused) player.play();
				else player.pause();
			};

			const updatePlayState = () => {
				if (player.paused) {
					iconPlay.style.display = 'block';
					iconPause.style.display = 'none';
					bigPlayBtn.style.display = 'flex';
				} else {
					iconPlay.style.display = 'none';
					iconPause.style.display = 'block';
					bigPlayBtn.style.display = 'none';
				}
			};

			player.addEventListener('play', updatePlayState);
			player.addEventListener('pause', updatePlayState);
			playPauseBtn.addEventListener('click', togglePlay);
			bigPlayBtn.addEventListener('click', togglePlay);
			player.addEventListener('click', togglePlay);

			player.addEventListener('timeupdate', () => {
				const percent = (player.currentTime / player.duration) * 100 || 0;
				progressFilled.style.width = `${percent}%`;
				timeDisplay.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
			});

			player.addEventListener('loadedmetadata', () => {
				timeDisplay.textContent = `0:00 / ${formatTime(player.duration)}`;
			});

			progressContainer.addEventListener('click', (event) => {
				const rect = progressContainer.getBoundingClientRect();
				const pos = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
				player.currentTime = pos * player.duration;
			});

			volumeSlider.addEventListener('input', () => {
				player.volume = Number(volumeSlider.value);
				player.muted = player.volume === 0;
				iconVolume.style.display = player.muted ? 'none' : 'block';
				iconMuted.style.display = player.muted ? 'block' : 'none';
			});

			muteBtn.addEventListener('click', () => {
				player.muted = !player.muted;
				iconVolume.style.display = player.muted ? 'none' : 'block';
				iconMuted.style.display = player.muted ? 'block' : 'none';
			});

			fullscreenBtn.addEventListener('click', () => {
				const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
				if (!isFullscreen) {
					if (wrapper.requestFullscreen) wrapper.requestFullscreen().catch(() => {});
					else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
					else if (player.webkitEnterFullscreen) player.webkitEnterFullscreen();
				} else {
					if (document.exitFullscreen) document.exitFullscreen();
					else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
				}
			});

			wrapper.append(watermark);
			section.append(titleRow, wrapper);
		});
		renderVideos();

		document.addEventListener('visibilitychange', () => {
			if (document.hidden) list.querySelectorAll('video').forEach(player => player.pause());
		});
	} catch (error) {
		status.textContent = 'Unable to load videos.';
	}
}

loadVideos();