async function loadVideos(){
	const status = document.getElementById('video-status');
	const list = document.getElementById('video-list');
	const login = document.getElementById('video-login');
	const countEl = document.getElementById('videoCount');
	const apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '' ? 'http://localhost:3000' : '')));
	let loadedVideos = [];

	function formatPlayerTime(sec){
		if(!isFinite(sec) || sec < 0) sec = 0;
		sec = Math.floor(sec);
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		const s = sec % 60;
		if(h > 0) return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
		return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
	}
	function formatCardDate(iso){
		if(!iso) return '';
		try{
			const d = new Date(iso);
			if(isNaN(d)) return '';
			const dd = String(d.getDate()).padStart(2,'0');
			const mm = String(d.getMonth()+1).padStart(2,'0');
			const yy = d.getFullYear();
			let h = d.getHours();
			const min = String(d.getMinutes()).padStart(2,'0');
			const ampm = h >= 12 ? 'pm' : 'am';
			h = h % 12; if(h===0) h=12;
			const hh = String(h).padStart(2,'0');
			return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + min + ' ' + ampm;
		}catch(e){ return ''; }
	}

	function initVideoViewToggle(){
		const listEl = document.getElementById('video-list');
		const btns = document.querySelectorAll('.view-toggle__btn');
		if(!listEl || !btns.length) return;
		const KEY = 'drafted-video-view-v2';
		function apply(mode){
			const m = mode === 'grid' ? 'grid' : 'list';
			if(m === 'grid') listEl.classList.add('video-list--grid');
			else listEl.classList.remove('video-list--grid');
			btns.forEach(function(b){
				const isActive = b.getAttribute('data-view-mode') === m;
				if(isActive) b.classList.add('active');
				else b.classList.remove('active');
				b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
			});
			try{ localStorage.setItem(KEY, m); }catch(e){}
		}
		let initial = 'list';
		try{
			const v = localStorage.getItem(KEY);
			if(v === 'grid' || v === 'list') initial = v;
		}catch(e){}
		apply(initial);
		btns.forEach(function(b){
			b.addEventListener('click', function(e){
				e.preventDefault();
				apply(b.getAttribute('data-view-mode'));
			});
		});
		window._setVideoView = apply;
	}

	initVideoViewToggle();

	function updateCount(n){
		if(!countEl) return;
		if(n === null || n === undefined || n === '—'){ countEl.textContent = '—'; return; }
		if(n === 0) countEl.textContent = '0 videos';
		else if(n === 1) countEl.textContent = '1 video';
		else countEl.textContent = n + ' videos';
	}

	function renderVideos(){
		if(!loadedVideos.length){
			list.replaceChildren();
			const empty = document.createElement('div');
			empty.className = 'empty-list';
			empty.innerHTML = '<div class="empty-list-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="20" height="20" aria-hidden="true"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg></div><p class="empty-list-title">No videos yet</p><p class="empty-list-hint">Videos will appear here once published.</p>';
			list.appendChild(empty);
			status.textContent = 'No videos yet.';
			updateCount(0);
			return;
		}
		status.textContent = '';
		updateCount(loadedVideos.length);
		const articles = [];
		loadedVideos.forEach(function(video){
			const section = document.createElement('article');
			section.className = 'section video-section';
			section.dataset.day = video.day || '';
			section.dataset.topic = video.topic || '';

			const titleRow = document.createElement('div');
			titleRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin:0 0 16px;';
			const thumbWrap = document.createElement('div');
			thumbWrap.style.cssText = 'width:80px;height:45px;flex-shrink:0;border-radius:4px;overflow:hidden;background:#16161b;border:1px solid #1f1f25;display:flex;align-items:center;justify-content:center;';
			if(video.thumbnail){
				const thumb = document.createElement('img');
				thumb.src = '' + apiBase + video.thumbnail;
				thumb.alt = '';
				thumb.loading = 'lazy';
				thumb.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
				thumb.onerror = function(){ thumbWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="18" height="18" aria-hidden="true" style="color:#6b6b78"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>'; };
				thumbWrap.appendChild(thumb);
			}else{
				thumbWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="18" height="18" aria-hidden="true" style="color:#6b6b78"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>';
			}
			titleRow.appendChild(thumbWrap);
			const textWrap = document.createElement('div');
			textWrap.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;';
			const title = document.createElement('h3');
			const titleText = video.topic ? ((video.day ? video.day + ' – ' : '') + (video.topic || video.name)) : (video.name || 'Untitled');
			title.textContent = titleText;
			title.style.cssText = 'margin:0;font-family:Georgia,serif;font-size:1.4rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
			title.title = titleText;
			textWrap.appendChild(title);
			const dateText = formatCardDate(video.createdAt);
			if(dateText){
				const dateEl = document.createElement('div');
				dateEl.textContent = dateText;
				dateEl.style.cssText = 'font-size:0.82rem;color:var(--muted);';
				textWrap.appendChild(dateEl);
			}
			titleRow.appendChild(textWrap);

			const wrapper = document.createElement('div');
			wrapper.className = 'custom-player-wrapper';
			wrapper.addEventListener('contextmenu', function(e){ e.preventDefault(); });
			wrapper.addEventListener('dragstart', function(e){ e.preventDefault(); });

			const stage = document.createElement('div');
			stage.className = 'video-player-stage';
			stage.style.cssText = 'position:relative;width:100%;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;';

			const player = document.createElement('video');
			player.className = 'video-player custom-video';
			player.preload = 'metadata';
			player.playsInline = true;
			player.setAttribute('playsinline','');
			player.controls = false;
			if(video.thumbnail) player.poster = '' + apiBase + video.thumbnail;
			player.src = '' + apiBase + video.url;
			try{ player.load(); }catch(e){}
			player.addEventListener('contextmenu', function(e){ e.preventDefault(); });
			player.addEventListener('error', function(e){
				console.error('video load error', video.id, e);
			});

			const watermark = document.createElement('div');
			watermark.className = 'video-watermark';
			try{
				const viewer = video.viewer || '';
				watermark.textContent = 'DRAFTED | ' + viewer;
			}catch(e){
				watermark.textContent = 'DRAFTED';
			}

			const bigPlayBtn = document.createElement('div');
			bigPlayBtn.className = 'big-play-btn';
			bigPlayBtn.setAttribute('role','button');
			bigPlayBtn.setAttribute('aria-label','Play video');
			bigPlayBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';

			stage.appendChild(player);
			stage.appendChild(bigPlayBtn);
			stage.appendChild(watermark);
			wrapper.appendChild(stage);

			const controls = document.createElement('div');
			controls.className = 'video-player-controls';
			controls.innerHTML = ''
				+ '<div class="video-player-timeline">'
				+ '<div class="video-player-timeline__track"><div class="video-player-timeline__fill"></div><div class="video-player-timeline__thumb" aria-hidden="true"></div></div>'
				+ '<input type="range" min="0" max="100" value="0" step="0.1" aria-label="Seek" />'
				+ '</div>'
				+ '<div class="video-player-bar">'
				+ '<div class="video-player-bar__left">'
				+ '<button class="icon-btn icon-btn--primary video-player-play" type="button" aria-label="Play"><svg class="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/><path d="M8 5v14l11-7z"/></svg></button>'
				+ '<span class="video-player-time video-player-time--current">00:00</span>'
				+ '<span class="video-player-time" style="display:none" aria-hidden="true">00:00 / 00:00</span>'
				+ '</div>'
				+ '<div class="video-player-bar__right">'
				+ '<span class="video-player-time video-player-time--duration">00:00</span>'
				+ '<button class="icon-btn video-player-mute" type="button" aria-label="Mute"><svg class="icon-volume" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 5V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19 6a9 9 0 010 12"/></svg></button>'
				+ '<input class="video-player-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" />'
				+ '<button class="icon-btn video-player-fullscreen" type="button" aria-label="Fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 9V5h4M21 9V5h-4M3 15v4h4M21 15v4h-4"/></svg></button>'
				+ '</div>'
				+ '</div>';
			wrapper.appendChild(controls);
			section.append(titleRow, wrapper);
			articles.push(section);

			// per-wrapper player logic – mirrors admin initVideoPlayer but scoped
			(function bindPlayer(){
				const timeline = controls.querySelector('.video-player-timeline');
				const fill = controls.querySelector('.video-player-timeline__fill');
				const thumb = controls.querySelector('.video-player-timeline__thumb');
				const range = controls.querySelector('input[type="range"][aria-label="Seek"]');
				const timeCurrent = controls.querySelector('.video-player-time--current');
				const timeDuration = controls.querySelector('.video-player-time--duration');
				const timeHidden = controls.querySelector('.video-player-time[style*="display:none"]');
				const playBtn = controls.querySelector('.video-player-play');
				const muteBtn = controls.querySelector('.video-player-mute');
				const volumeInput = controls.querySelector('.video-player-volume');
				const fullscreenBtn = controls.querySelector('.video-player-fullscreen');
				let isScrubbing = false;
				let wasPlayingBeforeScrub = false;
				let pendingSeekPct = null;
				let fsHideTimer = null;

				function syncTimeLabels(cur, dur){
					const curStr = formatPlayerTime(cur);
					const durStr = formatPlayerTime(dur);
					if(timeCurrent) timeCurrent.textContent = curStr;
					if(timeDuration) timeDuration.textContent = durStr;
					if(timeHidden) timeHidden.textContent = curStr + ' / ' + durStr;
				}
				function seekToPct(pct){
					pct = Math.max(0, Math.min(100, pct));
					if(range) range.value = String(pct);
					if(fill) fill.style.width = pct + '%';
					if(thumb) thumb.style.left = pct + '%';
					const dur = player.duration;
					const hasDur = dur && isFinite(dur) && dur > 0;
					if(hasDur){
						pendingSeekPct = null;
						try{ player.currentTime = (pct / 100) * dur; }catch(e){}
						const cur = (pct / 100) * dur;
						syncTimeLabels(cur, dur);
					}else{
						pendingSeekPct = pct;
						syncTimeLabels(0, 0);
					}
				}
				function pctFromClientX(clientX){
					const src = timeline || range;
					const rect = src ? src.getBoundingClientRect() : null;
					if(!rect || !rect.width || rect.width < 1) return 0;
					let pct = ((clientX - rect.left) / rect.width) * 100;
					if(pct < 0) pct = 0;
					if(pct > 100) pct = 100;
					return pct;
				}
				function updatePlayIcon(isPlaying){
					if(!playBtn) return;
					if(isPlaying){
						playBtn.innerHTML = '<svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="7" y="5" width="4" height="14" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/></svg>';
						playBtn.setAttribute('aria-label','Pause');
					}else{
						playBtn.innerHTML = '<svg class="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/><path d="M8 5v14l11-7z"/></svg>';
						playBtn.setAttribute('aria-label','Play');
					}
				}
				function updateVolumeIcon(){
					if(!muteBtn) return;
					const muted = player.muted || player.volume === 0;
					if(muted){
						muteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 5V5z"/><path d="M16 9l6 6M22 9l-6 6"/></svg>';
						muteBtn.setAttribute('aria-label','Unmute');
					}else{
						const v = player.volume;
						const path2 = v < 0.5 ? '<path d="M15.54 8.46a5 5 0 010 7.07"/>' : '<path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19 6a9 9 0 010 12"/>';
						muteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 5V5z"/>' + path2 + '</svg>';
						muteBtn.setAttribute('aria-label','Mute');
					}
				}
				function showFSControls(){
					if(document.fullscreenElement !== wrapper && document.webkitFullscreenElement !== wrapper) return;
					wrapper.classList.add('is-controls-visible');
					clearTimeout(fsHideTimer);
					fsHideTimer = setTimeout(function(){ wrapper.classList.remove('is-controls-visible'); }, 2500);
				}
				function hideFSControls(){ wrapper.classList.remove('is-controls-visible'); }
				function updateFullscreenIcon(){
					if(!fullscreenBtn) return;
					const isFs = document.fullscreenElement === wrapper || document.webkitFullscreenElement === wrapper;
					if(isFs){
						fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 9L5 5M5 5h4M5 5v4M15 9l4-4M19 5h-4M19 5v4M9 15l-4 4M5 19h4M5 19v-4M15 15l4 4M19 19h-4M19 19v-4"/></svg>';
						fullscreenBtn.setAttribute('aria-label','Exit fullscreen');
					}else{
						fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 9V5h4M21 9V5h-4M3 15v4h4M21 15v4h-4"/></svg>';
						fullscreenBtn.setAttribute('aria-label','Fullscreen');
					}
				}

				// toggle play
				function togglePlay(){
					if(player.paused) player.play().catch(function(){});
					else player.pause();
				}
				if(playBtn) playBtn.addEventListener('click', togglePlay);
				if(bigPlayBtn) bigPlayBtn.addEventListener('click', togglePlay);
				player.addEventListener('click', togglePlay);
				player.addEventListener('play', function(){
					updatePlayIcon(true);
					bigPlayBtn.style.display = 'none';
				});
				player.addEventListener('pause', function(){
					updatePlayIcon(false);
					bigPlayBtn.style.display = 'flex';
				});
				updatePlayIcon(false);
				updateVolumeIcon();

				// timeupdate
				player.addEventListener('timeupdate', function(){
					if(isScrubbing) return;
					if(!range || !fill) return;
					const dur = player.duration || 0;
					const cur = player.currentTime || 0;
					const pct = dur && isFinite(dur) && dur > 0 ? (cur / dur) * 100 : 0;
					range.value = String(pct);
					fill.style.width = pct + '%';
					if(thumb) thumb.style.left = pct + '%';
					syncTimeLabels(cur, dur);
				});
				player.addEventListener('loadedmetadata', function(){
					const dur = player.duration || 0;
					if(timeDuration) timeDuration.textContent = formatPlayerTime(dur);
					if(pendingSeekPct !== null && dur && isFinite(dur) && dur > 0){
						const pct = pendingSeekPct;
						pendingSeekPct = null;
						try{ player.currentTime = (pct / 100) * dur; }catch(e){}
						const cur = (pct / 100) * dur;
						if(range) range.value = String(pct);
						if(fill) fill.style.width = pct + '%';
						if(thumb) thumb.style.left = pct + '%';
						syncTimeLabels(cur, dur);
					}else{
						const cur = player.currentTime || 0;
						const pct = dur && isFinite(dur) && dur > 0 ? (cur / dur) * 100 : 0;
						if(range) range.value = String(pct);
						if(fill) fill.style.width = pct + '%';
						if(thumb) thumb.style.left = pct + '%';
						syncTimeLabels(cur, dur);
					}
				});
				player.addEventListener('durationchange', function(){
					const dur = player.duration || 0;
					const cur = player.currentTime || 0;
					if(timeDuration) timeDuration.textContent = formatPlayerTime(dur);
					if(timeHidden) timeHidden.textContent = formatPlayerTime(cur) + ' / ' + formatPlayerTime(dur);
					if(pendingSeekPct !== null && dur && isFinite(dur) && dur > 0){
						const pct = pendingSeekPct;
						pendingSeekPct = null;
						try{ player.currentTime = (pct / 100) * dur; }catch(e){}
						const cur2 = (pct / 100) * dur;
						if(range) range.value = String(pct);
						if(fill) fill.style.width = pct + '%';
						if(thumb) thumb.style.left = pct + '%';
						if(timeCurrent) timeCurrent.textContent = formatPlayerTime(cur2);
					}
				});
				player.addEventListener('seeking', function(){
					const dur = player.duration || 0;
					const cur = player.currentTime || 0;
					syncTimeLabels(cur, dur);
				});
				player.addEventListener('seeked', function(){
					const dur = player.duration || 0;
					const cur = player.currentTime || 0;
					syncTimeLabels(cur, dur);
				});
				player.addEventListener('waiting', function(){});
				player.addEventListener('canplay', function(){});

				if(range){
					range.addEventListener('input', function(){
						const raw = parseFloat(range.value);
						const pct = isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
						if(fill) fill.style.width = pct + '%';
						if(thumb) thumb.style.left = pct + '%';
						const dur = player.duration;
						const hasDur = dur && isFinite(dur) && dur > 0;
						if(!hasDur){ pendingSeekPct = pct; return; }
						pendingSeekPct = null;
						try{ player.currentTime = (pct / 100) * dur; }catch(e){}
						const curStr = formatPlayerTime((pct / 100) * dur);
						if(timeCurrent) timeCurrent.textContent = curStr;
						if(timeDuration) timeDuration.textContent = formatPlayerTime(dur);
						if(timeHidden) timeHidden.textContent = curStr + ' / ' + formatPlayerTime(dur);
					});
				}

				if(timeline){
					timeline.style.touchAction = 'none';
					const handlePointerDown = function(e){
						if(e.button !== undefined && e.button !== 0) return;
						isScrubbing = true;
						timeline.classList.add('is-dragging');
						if(timeline.setPointerCapture) try{ timeline.setPointerCapture(e.pointerId); }catch(err){}
						wasPlayingBeforeScrub = !player.paused;
						try{ if(wasPlayingBeforeScrub) player.pause(); }catch(e2){}
						const pct = pctFromClientX(e.clientX);
						seekToPct(pct);
						e.preventDefault();
					};
					timeline.addEventListener('pointerdown', handlePointerDown);
					if(range){
						range.style.touchAction = 'none';
						range.addEventListener('pointerdown', function(e){
							if(e.target !== range) return;
							handlePointerDown(e);
						});
					}
					const handlePointerMove = function(e){
						if(!isScrubbing) return;
						const pct = pctFromClientX(e.clientX);
						seekToPct(pct);
						if(e.cancelable) e.preventDefault();
					};
					const handlePointerUp = function(e){
						if(!isScrubbing) return;
						if(typeof e.clientX === 'number' && isFinite(e.clientX)){
							const pct = pctFromClientX(e.clientX);
							seekToPct(pct);
						}
						isScrubbing = false;
						if(timeline) timeline.classList.remove('is-dragging');
						if(timeline && timeline.releasePointerCapture) try{ timeline.releasePointerCapture(e.pointerId); }catch(err){}
						if(wasPlayingBeforeScrub){
							try{ player.play().catch(function(){}); }catch(e2){}
							wasPlayingBeforeScrub = false;
						}
					};
					window.addEventListener('pointermove', handlePointerMove, {passive:false});
					window.addEventListener('pointerup', handlePointerUp);
					window.addEventListener('pointercancel', handlePointerUp);
					timeline.addEventListener('click', function(e){
						if(e.target === range) return;
						if(!isScrubbing){
							const pct = pctFromClientX(e.clientX);
							seekToPct(pct);
						}
						e.preventDefault();
					});
					timeline.addEventListener('mousedown', function(e){ e.preventDefault(); });
				}

				if(volumeInput){
					try{
						const saved = localStorage.getItem('trax-player-volume');
						if(saved !== null){
							const v = parseFloat(saved);
							if(isFinite(v) && v >= 0 && v <= 1){ player.volume = v; volumeInput.value = String(v); }
						}
						const muted = localStorage.getItem('trax-player-muted');
						if(muted === 'true') player.muted = true;
					}catch(e){}
					updateVolumeIcon();
					volumeInput.addEventListener('input', function(){
						player.muted = false;
						player.volume = parseFloat(volumeInput.value) || 0;
						try{ localStorage.setItem('trax-player-volume', String(player.volume)); localStorage.setItem('trax-player-muted','false'); }catch(e){}
						updateVolumeIcon();
					});
				}
				if(muteBtn) muteBtn.addEventListener('click', function(){
					player.muted = !player.muted;
					try{ localStorage.setItem('trax-player-muted', String(player.muted)); }catch(e){}
					updateVolumeIcon();
				});

				// fullscreen
				wrapper.addEventListener('mousemove', function(){ if(document.fullscreenElement === wrapper || document.webkitFullscreenElement === wrapper) showFSControls(); });
				wrapper.addEventListener('mouseenter', function(){ if(document.fullscreenElement === wrapper || document.webkitFullscreenElement === wrapper) showFSControls(); });
				wrapper.addEventListener('mouseleave', function(){ if(document.fullscreenElement === wrapper || document.webkitFullscreenElement === wrapper) hideFSControls(); });
				document.addEventListener('fullscreenchange', function(){
					const isFs = document.fullscreenElement === wrapper;
					wrapper.classList.toggle('is-fullscreen', isFs);
					if(isFs) showFSControls(); else hideFSControls();
					clearTimeout(fsHideTimer);
					updateFullscreenIcon();
				});
				document.addEventListener('webkitfullscreenchange', function(){
					const isFs = document.webkitFullscreenElement === wrapper;
					wrapper.classList.toggle('is-fullscreen', isFs);
					updateFullscreenIcon();
				});
				if(fullscreenBtn) fullscreenBtn.addEventListener('click', function(){
					const isFs = document.fullscreenElement === wrapper || document.webkitFullscreenElement === wrapper;
					if(!isFs){
						if(wrapper.requestFullscreen) wrapper.requestFullscreen().catch(function(){});
						else if(wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
						else if(player.webkitEnterFullscreen) player.webkitEnterFullscreen();
					}else{
						if(document.exitFullscreen) document.exitFullscreen();
						else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
					}
				});
			})();
		});
		list.replaceChildren(...articles);
	}

	try{
		const authResponse = await fetch(apiBase + '/api/whoami?t=' + Date.now(), {credentials:'include', cache:'no-store'});
		const auth = await authResponse.json();
		if(!auth.user){
			status.textContent = 'Sign in with Discord to view the video library.';
			if(login) login.hidden = false;
			updateCount('—');
			return;
		}
		const response = await fetch(apiBase + '/api/videos', {credentials:'include'});
		if(response.status === 403){
			status.textContent = 'Your Discord account does not have library access yet.';
			updateCount('—');
			return;
		}
		if(!response.ok) throw new Error('video request failed');
		loadedVideos = await response.json();
		if(!Array.isArray(loadedVideos)) loadedVideos = Array.isArray(loadedVideos.videos) ? loadedVideos.videos : [];
		loadedVideos.sort(function(a,b){ return new Date(b.createdAt||0) - new Date(a.createdAt||0); });
		renderVideos();
		document.addEventListener('visibilitychange', function(){
			if(document.hidden) list.querySelectorAll('video').forEach(function(p){ p.pause(); });
		});
	}catch(error){
		status.textContent = 'Unable to load videos.';
		updateCount(0);
	}
}

loadVideos();
