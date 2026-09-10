const VIDEO_SECTIONS = {
	"Day 1": ["Amd", "Orderblocks", "OHLC", "OLHC"],
	"Day 2": ["Daily bias", "Key opens", "SMT Divergence"],
	"Day 3": ["Protected High/Low", "Narrative", "IDM"],
	"Day 4": ["Net GEX", "Pinning", "0dte", "Open Interest"]
};

async function loadVideos(){
	const status = document.getElementById('video-status');
	const list = document.getElementById('videoGrid') || document.getElementById('video-list');
	const memberSurface = document.querySelectorAll('[data-member-only], .video-filters, #videoGrid');
	memberSurface.forEach(function(el){ el.hidden = true; });
	if(list) list.classList.add('video-list--grid');
	const login = document.getElementById('video-login');
	const accessDenied = document.getElementById('video-access-denied');
	const countEl = document.getElementById('videoCount');
	const apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '' ? 'http://localhost:3000' : '')));
	let loadedVideos = [];
	let filteredVideos = [];
	let accessGranted = false;
	let filterDay = '';
	let filterTopic = '';
	function showAccessDenied(){
		if(accessDenied) accessDenied.hidden = false;
		if(status) status.textContent = '';
		if(login) login.hidden = false;
		document.querySelectorAll('[data-member-only]').forEach(function(el){ el.hidden = true; });
	}

	/* ---- Day/Topic filter (matches admin VIDEO_SECTIONS) ---- */
	function getQueryFilter(){
		try{
			const p = new URLSearchParams(location.search);
			const qDay = p.get('day') || '';
			const qTopic = p.get('topic') || '';
			return {qDay: qDay, qTopic: qTopic};
		}catch(e){ return {qDay:'', qTopic:''}; }
	}
	function syncQueryParam(){
		try{
			const url = new URL(location.href);
			if(filterDay) url.searchParams.set('day', filterDay);
			else url.searchParams.delete('day');
			if(filterTopic) url.searchParams.set('topic', filterTopic);
			else url.searchParams.delete('topic');
			history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
		}catch(e){}
	}
	function persistFilter(){
		try{
			if(filterDay) localStorage.setItem('drafted-video-filter-day', filterDay);
			else localStorage.removeItem('drafted-video-filter-day');
			if(filterTopic) localStorage.setItem('drafted-video-filter-topic', filterTopic);
			else localStorage.removeItem('drafted-video-filter-topic');
		}catch(e){}
		syncQueryParam();
	}
	function getFilteredVideos(){
		return loadedVideos.filter(function(v){
			const dayOk = !filterDay || v.day === filterDay;
			const topicOk = !filterTopic || (v.topic && String(v.topic).toLowerCase() === String(filterTopic).toLowerCase());
			return dayOk && topicOk;
		});
	}
	function populateFilterTopic(){
		const container = document.getElementById('topicPills');
		if(!container) return;
		container.replaceChildren();
		if(!filterDay || !VIDEO_SECTIONS[filterDay]){
			const empty = document.createElement('button');
			empty.type = 'button';
			empty.className = 'topic-pill is-disabled';
			empty.disabled = true;
			empty.setAttribute('aria-disabled','true');
			empty.textContent = 'Select Day first';
			container.appendChild(empty);
			return;
		}
		const allBtn = document.createElement('button');
		allBtn.type = 'button';
		allBtn.className = 'topic-pill';
		allBtn.dataset.topic = '';
		allBtn.setAttribute('aria-pressed', !filterTopic ? 'true' : 'false');
		if(!filterTopic) allBtn.classList.add('is-active');
		allBtn.textContent = 'All Topics';
		container.appendChild(allBtn);
		VIDEO_SECTIONS[filterDay].forEach(function(t){
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'topic-pill';
			b.dataset.topic = t;
			const active = filterTopic && String(filterTopic).toLowerCase() === String(t).toLowerCase();
			b.setAttribute('aria-pressed', active ? 'true' : 'false');
			if(active) b.classList.add('is-active');
			b.textContent = t;
			container.appendChild(b);
		});
		// wire clicks (single-select; clicking active pill clears filter)
		container.querySelectorAll('.topic-pill').forEach(function(btn){
			if(btn.disabled) return;
			btn.addEventListener('click', function(){
				const wasActive = btn.classList.contains('is-active');
				const next = wasActive ? '' : (btn.dataset.topic || '');
				filterTopic = next;
				populateFilterTopic();
				persistFilter();
				applyFilterAndRender();
			});
		});
	}
	function applyFilterAndRender(){
		filteredVideos = getFilteredVideos();
		const resultEl = document.getElementById('filterResult');
		if(resultEl){
			const parts = [];
			if(filterDay) parts.push(filterDay);
			else parts.push('All Days');
			if(filterTopic) parts.push(filterTopic);
			else if(filterDay) parts.push('All Topics');
			const n = filteredVideos.length;
			resultEl.textContent = 'Showing ' + n + (n === 1 ? ' video' : ' videos') + ' \u00b7 ' + parts.join(' \u00b7 ');
		}
		renderVideos();
	}
	function initFilters(){
		const dayPills = document.querySelectorAll('[data-day]');
		if(!dayPills || !dayPills.length) return;
		// restore from query param > localStorage
		let q = getQueryFilter();
		let storedDay = '';
		let storedTopic = '';
		try{ storedDay = localStorage.getItem('drafted-video-filter-day') || ''; }catch(e){}
		try{ storedTopic = localStorage.getItem('drafted-video-filter-topic') || ''; }catch(e){}
		if(q.qDay && VIDEO_SECTIONS[q.qDay]) filterDay = q.qDay;
		else if(storedDay && VIDEO_SECTIONS[storedDay]) filterDay = storedDay;
		else filterDay = '';
		if(q.qTopic) filterTopic = q.qTopic;
		else if(storedTopic) filterTopic = storedTopic;
		else filterTopic = '';
		// validate topic belongs to day; if day empty, topic must be empty; if topic not in day's list, reset
		if(!filterDay) filterTopic = '';
		else if(filterTopic){
			const valid = VIDEO_SECTIONS[filterDay] && VIDEO_SECTIONS[filterDay].some(function(t){ return String(t).toLowerCase() === String(filterTopic).toLowerCase(); });
			if(!valid) filterTopic = '';
		}
		// sync day pill aria-pressed/class
		dayPills.forEach(function(b){
			const d = b.getAttribute('data-day') || '';
			const active = (d === filterDay) || (!filterDay && d === '');
			b.classList.toggle('is-active', active);
			b.setAttribute('aria-pressed', active ? 'true' : 'false');
		});
		populateFilterTopic();
		if(filterTopic && filterDay){
			// ensure exact casing from VIDEO_SECTIONS is used for display sync
			const match = (VIDEO_SECTIONS[filterDay] ? VIDEO_SECTIONS[filterDay].find(function(t){ return String(t).toLowerCase() === String(filterTopic).toLowerCase(); }) : null);
			if(match) filterTopic = match;
		}
		dayPills.forEach(function(b){
			b.addEventListener('click', function(){
				const next = b.getAttribute('data-day') || '';
				if(next === filterDay) return;
				filterDay = next;
				// reset topic if not in new day's list
				if(filterDay && filterTopic){
					const ok = VIDEO_SECTIONS[filterDay] && VIDEO_SECTIONS[filterDay].some(function(t){ return String(t).toLowerCase() === String(filterTopic).toLowerCase(); });
					if(!ok) filterTopic = '';
				}
				if(!filterDay) filterTopic = '';
				dayPills.forEach(function(btn){
					const d = btn.getAttribute('data-day') || '';
					const active = (d === filterDay) || (!filterDay && d === '');
					btn.classList.toggle('is-active', active);
					btn.setAttribute('aria-pressed', active ? 'true' : 'false');
				});
				populateFilterTopic();
				persistFilter();
				applyFilterAndRender();
			});
		});
		// initial sync to query if restored from storage but query empty
		persistFilter();
	}
	// expose for testing
	try{ if(typeof window !== 'undefined'){ window.VIDEO_SECTIONS = VIDEO_SECTIONS; window.getFilteredVideos = getFilteredVideos; } }catch(e){}

	function escapeHtml(s){
		return String(s).replace(/[&<>"']/g, function(c){
			return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
		});
	}
	function sanitizeViewer(s){
		let v = (typeof s === 'string' ? s : String(s || ''));
		v = v.trim().replace(/\s+/g, ' ');
		if(!v) return 'viewer';
		// strip control chars and limit length
		v = v.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 32).trim();
		if(!v) return 'viewer';
		// allowlist: alphanumeric, space, limited punctuation _-.@; replace disallowed with ''
		v = v.replace(/[<>"'&`$]/g, '').replace(/[\{\}]/g, '');
		if(!v) return 'viewer';
		return v || 'viewer';
	}

	function parseSignedParams(videoUrl){
		try{
			const u = new URL(String(videoUrl), location.origin);
			return {expires: u.searchParams.get('expires'), signature: u.searchParams.get('signature')};
		}catch(e){
			const s = String(videoUrl||'');
			const em = s.match(/[?&]expires=([^&]+)/);
			const sm = s.match(/[?&]signature=([^&]+)/);
			return {expires: em?decodeURIComponent(em[1]):null, signature: sm?decodeURIComponent(sm[1]):null};
		}
	}
	function fetchPersonalizedManifest(video, ctx){
		const player = ctx.player;
		const stage = ctx.stage;
		const wrapper = ctx.wrapper;
		const viewer = ctx.viewer;
		if(!video || !video.id || !player || !stage) return function(){};
		if(video.personalizedUrl){
			const personalizedUrl = String(video.personalizedUrl);
			const cur = player.src || '';
			if(cur !== personalizedUrl){
				try{ player.src = (personalizedUrl.startsWith('http')||personalizedUrl.startsWith('/')) ? (personalizedUrl.startsWith('/')? apiBase + personalizedUrl : personalizedUrl) : personalizedUrl; player.load(); }catch(e){}
			}
			return function(){};
		}
		const pendingVideoUrl = ctx.pendingVideoUrl || '';
		const parsed = parseSignedParams(video.url);
		if(!parsed.expires || !parsed.signature) return function(){};
		if(pendingVideoUrl){
			try{
				player.removeAttribute('src');
				player.setAttribute('src', pendingVideoUrl);
				player.controls = false;
				player.load();
			}catch(e){}
		}
		const _accessToken = window.__traxAccessToken || '';
		const baseManifestUrl = apiBase + '/media/' + encodeURIComponent(video.id) + '/manifest?expires=' + encodeURIComponent(parsed.expires) + '&signature=' + encodeURIComponent(parsed.signature) + (_accessToken ? '&token=' + encodeURIComponent(_accessToken) : '');
		let cancelled = false;
		let pollTimer = null;
		let notice = null;
		let attempt = 0;
		const startMs = Date.now();
		const MAX_MS = 90000;
		const ALLOW_GENERIC_FALLBACK = true;
		function ensureNotice(queueLabel){
			if(notice && notice.isConnected) return notice;
			notice = document.createElement('div');
			notice.className = 'personalizing-notice';
			notice.setAttribute('role','status');
			notice.setAttribute('aria-live','polite');
			const clean = sanitizeViewer(viewer);
			const badge = document.createElement('div');
			badge.className = 'personalizing-notice__badge';
			badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Preparing your copy';
			const sub = document.createElement('div');
			sub.className = 'personalizing-notice__sub';
			sub.textContent = 'drafted.world | @' + clean + ' ';
			const qSpan = document.createElement('span');
			qSpan.className = 'personalizing-notice__queue';
			qSpan.textContent = (queueLabel||'~45s');
			sub.appendChild(qSpan);
			const bar = document.createElement('div');
			bar.className = 'personalizing-notice__bar';
			bar.setAttribute('aria-hidden','true');
			const fillDiv = document.createElement('div');
			fillDiv.className = 'personalizing-notice__fill';
			fillDiv.style.width = '8%';
			bar.appendChild(fillDiv);
			const cd2 = document.createElement('div');
			cd2.className = 'personalizing-notice__countdown';
			cd2.textContent = '~45s';
			notice.appendChild(badge);
			notice.appendChild(sub);
			notice.appendChild(bar);
			notice.appendChild(cd2);
			stage.appendChild(notice);
			return notice;
		}
		function updateNoticeProgress(queueLabel){
			if(!notice || !notice.isConnected) return;
			const elapsed = Date.now() - startMs;
			const prog = Math.min(92, (elapsed/MAX_MS)*70 + Math.min(30, attempt*7));
			const fill = notice.querySelector('.personalizing-notice__fill');
			if(fill) fill.style.width = prog + '%';
			const qEl = notice.querySelector('.personalizing-notice__queue');
			if(qEl && queueLabel) qEl.textContent = '(' + queueLabel + ')';
			const cd = notice.querySelector('.personalizing-notice__countdown');
			if(cd){
				const remain = Math.max(0, Math.ceil((MAX_MS - elapsed)/1000));
				cd.textContent = remain > 6 ? '~' + remain + 's' : 'finalizing\u2026';
			}
		}
		async function poll(){
			if(cancelled) return;
			if(Date.now() - startMs > MAX_MS){
				if(notice && notice.isConnected){
					const title = notice.querySelector('.personalizing-notice__badge');
					if(title) title.textContent = 'Still personalizing\u2026';
					const cd = notice.querySelector('.personalizing-notice__countdown');
					if(cd) notice.querySelector('.personalizing-notice__countdown').textContent = 'will retry shortly';
				}
				if(notice){
					notice.style.pointerEvents = 'auto';
					notice.style.cursor = 'pointer';
					notice.title = 'Tap to retry';
					notice.addEventListener('click', function retry(){ notice.style.pointerEvents='none'; attempt=0; poll(); }, {once:true});
				}
				return;
			}
			attempt++;
			try{
				const url = baseManifestUrl + '&t=' + Date.now();
				const res = await fetch(url, {credentials:'include', cache:'no-store'});
				const cacheHeader = (res.headers.get('X-Personalized-Cache') || res.headers.get('x-personalized-cache') || '').toUpperCase();
				const watermarkHeader = (res.headers.get('X-Watermark') || res.headers.get('x-watermark') || '').toLowerCase();
				if(res.status === 202){
					let data = null;
					try{ data = await res.json(); }catch(e){}
					const qp = data && (data.queuePosition||data.queue||data.position||data.queue_number);
					const est = data && (data.estimatedWait||data.eta||data.wait);
					const label = qp ? ('queue #' + qp) : (est ? ('~'+est+'s') : '~45s');
					ensureNotice(label);
					updateNoticeProgress(label);
					if(cacheHeader) wrapper.setAttribute('data-personalized-cache','QUEUED');
					if(watermarkHeader) wrapper.setAttribute('data-watermark', watermarkHeader);
					const delay = Math.min(8000, Math.round(3000 * Math.pow(1.35, attempt-1)));
					pollTimer = setTimeout(poll, delay);
					return;
				}
				if(res.ok){
					let data = null;
					try{ data = await res.json(); }catch(e){}
					const isHit = (cacheHeader === 'HIT' && watermarkHeader === 'burned') || watermarkHeader === 'burned' || (data && data.personalized === true && Array.isArray(data.segments) && data.segments.length > 0);
				if(!isHit){
						const label = '~' + Math.max(5, Math.ceil((MAX_MS - (Date.now()-startMs))/1000)) + 's';
						ensureNotice(label);
						updateNoticeProgress(label);
						if(cacheHeader) wrapper.setAttribute('data-personalized-cache', cacheHeader);
						if(watermarkHeader) wrapper.setAttribute('data-watermark', watermarkHeader);
						const delay = Math.min(8000, Math.round(3000 * Math.pow(1.35, attempt-1))) ;
						pollTimer = setTimeout(poll, delay);
						return;
					}
					let personalizedUrl = null;
					if(data && data.personalizedUrl) personalizedUrl = String(data.personalizedUrl);
					else if(data && data.url) personalizedUrl = String(data.url);
					else if(video.personalizedUrl) personalizedUrl = String(video.personalizedUrl);
					else {
						personalizedUrl = apiBase + '/media/' + encodeURIComponent(video.id) + '?expires=' + encodeURIComponent(parsed.expires) + '&signature=' + encodeURIComponent(parsed.signature) + '&personalized=1' + (_accessToken ? '&token=' + encodeURIComponent(_accessToken) : '');
					}
					if(notice && notice.isConnected){
						const fill = notice.querySelector('.personalizing-notice__fill');
						if(fill) fill.style.width = '100%';
						setTimeout(function(){ if(notice && notice.parentNode) notice.remove(); }, 650);
					}
				if(cacheHeader) wrapper.setAttribute('data-personalized-cache',L'HIT');
				if(watermarkHeader) wrapper.setAttribute('data-watermark', watermarkHeader||'burned');
				let finalSrc = personalizedUrl;
					if(!finalSrc && pendingVideoUrl) finalSrc = pendingVideoUrl;
					if(finalSrc && finalSrc.startsWith('/') && apiBase) finalSrc = apiBase + finalSrc;
					const curSrc = player.src || '';
					function stripBase(s){ try{ const u=new URL(s, location.origin); return u.pathname+u.search; }catch(e){ return s; } }
					const curStripped = stripBase(curSrc);
					 the newStripped = stripBase(finalSrc);
					if(finalSrc && isHit && curStripped !== newStripped){
						const wasPlaying = !player.paused && !player.ended;
						const curTime = player.currentTime || 0;
						try{
							player.src = finalSrc;
							player.load();
							if(curTime > 0.5){
								const restoreSeek = function(){
									player.removeEventListener('loadedmetadata', restoreSeek);
									try{ player.currentTime = curTime; }catch(e){}
									if(wasPlaying){ player.play().catch(function(){}); }
								};
								player.addEventListener('loadedmetadata', restoreSeek);
						} else {
							player.play().catch(function(){});
						}
						}catch(e){}
					} else {
						if(notice && notice.isConnected) try{ notice.remove(); }catch(e){}
					}
					return;
				}
			// 401/403/404 etc -> show login message or remove notice
			if(res.status === 401 || res.status === 403){
				ensureNotice('');
				if(notice && notice.isConnected){
					const badge = notice.querySelector('.personalizing-notice__badge');
					if(badge) badge.textContent = 'Sign in required';
					const sub = notice.querySelector('.personalizing-notice__sub');
					if(notice && notice.isConnected){
						const badge = notice.querySelector('.personalizing-notice__badge');
						if(badge) badge.textContent = 'Sign in required';
						const sub = notice.querySelector('.personalizing-notice__sub');
						if(sub) sub.textContent = 'Please sign in with Discord to watch videos';
						const bar = notice.querySelector('.personalizing-notice__bar');
						if(bar) bar.style.display = 'none';
						const cd = notice.querySelector('.personalizing-notice__countdown');
						if(cd) cd.textContent = '';
						notice.style.cursor = 'pointer';
						notice.style.pointerEvents = 'auto';
						notice.style.cursor = 'pointer';
						notice.style.pointerEvents = 'auto';
						notice.title = 'Click to sign in';
						notice.addEventListener('click', function(){
							window.location.href = apiBase + '/auth/discord';
						}, {once:true});
				}
				return;
			}
			if(notice && notice.isConnected) updateNoticeProgress(null);
				const delay = Math.min(8000, Math.round(3000 * Math.pow(1.35, attempt-1)));
				pollTimer = setTimeout(poll, delay);
				return;
			}
			const delay = Math.min(8000, Math.round(3000 * Math.pow(1.35, attempt-1)));
			pollTimer = setTimeout(poll, delay);
		}
		poll();
		return function cancel(){ cancelled=true; clearTimeout(pollTimer); if(notice&&notice.parentNode) try{ notice.remove(); }catch(e){} };
	}
	if(typeof window !== 'undefined') window.fetchPersonalizedManifest = fetchPersonalizedManifest;

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
			if(isNaN(d.getTime())) return '';
			return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
		}}catch(e){ return ''; }
	}

	function updateCount(n){
		if(!countEl) return;
		if(n === null || n === undefined || n === '—'){ countEl.textContent = '—'; return; }
		if(n === 0) countEl.textContent = '0 videos';
		else if(n === 1) countEl.textContent = '1 video';
		else countEl.textContent = n + ' videos';
	}

	function svgPosterDataUrl(video){
		const svg = ''
			+ '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">'
			+ '<rect width="640" height="360" fill="#0a0a0c"/>'
			+ '<g opacity="0.55" stroke="#b3b3bd" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">'
			+ '<rect x="230" y="135" width="140" height="90" rx="14"/>'
			+ '<path d="M370 168l44 -22v68l-44 -22z"/>'
			+ '</g>'
			+ '</svg>';
		try{
			return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
		}catch(e){
			return '';
		}
	}

	function createThumbnailFallback(){
		const wrap = document.createElement('div');
		wrap.className = 'video-thumb-fallback';
		wrap.setAttribute('aria-hidden','true');
		wrap.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="2.2" ry="2.2"/><path d="M16 10l4-2v8l4-2z"/><circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/></svg>';
		return wrap;
	}
	function makePosterPlaceholder(video){
		return createThumbnailFallback();
	}

	function renderHero(video){
		const hero = document.getElementById('video-hero');
		if(!hero) return;
		hero.replaceChildren();
		hero.hidden = true;
		return;
	}

	async function renderVideos(){
		if(!loadedVideos.length){
			list.replaceChildren();
			renderHero(null);
			const empty = document.createElement('div');
			empty.className = 'empty-list';
			empty.innerHTML = '<div class="empty-list-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg></div><p class="empty-list-title">No videos yet</p><p class="empty-list-hint">Videos will appear here once published.</p>';
			list.appendChild(empty);
			status.textContent = 'No videos yet.';
			updateCount(0);
			return;
		}
		filteredVideos = getFilteredVideos();
		if(!filteredVideos.length){
			list.replaceChildren();
			renderHero(null);
			const empty = document.createElement('div');
			empty.className = 'empty-list';
			const dayLabel = filterDay ? filterDay : 'All Days';
			const topicLabel = filterTopic ? filterTopic : '';
			let titleText = 'No videos for ' + dayLabel;
			if(topicLabel) titleText += ' \u201ness ' + topicLabel;
			else if(filterDay) titleText += ' \u201ness ' + topicLabel;
			const safeTitle = escapeHtml(titleText);
			const hint = (filterDay || filterTopic) ? 'Try a different Day or Topic filter.' : 'Videos will appear here once published.';
			empty.innerHTML = '<div class="empty-list-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg></div><p class="empty-list-title">' + safeTitle + '</p><p> ' + escapeHtml(hint) + '</p>';
			list.appendChild(empty);
			status.textContent = titleText + '.';
			updateCount(0);
			return;
		}
		status.textContent = '';
		updateCount(filteredVideos.length);
		const articles = [];
		const useCanvasLayer = (function(){
			try{ return new URLSearchParams(location.search).has('canvas'); }catch(e){ return false; }
		})();
		let cachedWhoamiViewer = null;
		const needsWhoami = filteredVideos.some(function(v){ return !v.viewer || !String(v.viewer).trim(); });
		if(needsWhoami){
			try{
				const whoRes = await fetch(apiBase + '/api/whoami', {credentials:'include', cache:'no-store'});
				if(whoRes.ok){
					const whoData = await whoRes.json();
					}
				}
			}catch(e){}
		}
		filteredVideos.forEach(function(video, videoIdx){
		let viewerName = video.viewer || cachedWhoamiViewer || '';
			if(!viewerName || !String(viewerName).trim()){
				if(cachedWhoamiViewer) viewerName = cachedWhoamiViewer;
			}
			const section = document.createElement('article');
			section.className = 'section video-section';
			section.dataset.day = video.day || '';
			section.dataset.topic = video.topic || '';
			if(video.id) section.dataset.videoId = String(video.id);

			const titleRow = document.createElement('div');
			titleRow.className = 'video-card-header';
			titleRow.style.cssText = 'display:flex;flex-direction:column;gap:14px;padding:18px 18px 14px;';
			const thumbBtn = document.createElement('button');
			thumbBtn.type = 'button';
			thumbBtn.className = 'video-card-thumb';
			const labelText = (video.name || video.topic || 'Untitled');
			thumbBtn.setAttribute('aria-label', 'Play video: ' + labelText);
			thumbBtn.style.cssText = 'position:relative;display:block;width:100%;aspect-ratio:16/9;padding:0;border:0;background:#0a0a0c;cursor:pointer;overflow:hidden;border-radius:10px;';
			const posterHost = document.createElement('div');
			posterHost.className = 'video-card-thumb__poster';
			posterHost.style.cssText = 'position:absolute;inset:0;';
			if(video.thumbnail){
				const thumb = document.createElement('img');
				thumb.src = '' + apiBase + video.thumbnail;
				thumb.alt = '';
				thumb.loading = 'lazy';
				thumb.crossOrigin = 'use-credentials';
				thumb.setAttribute('crossorigin','use-credentials');
				thumb.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;';
				thumb.onerror = function(){
					posterHost.replaceChildren(createThumbnailFallback());
				};
				posterHost.appendChild(thumb);
			}else{
				posterHost.appendChild(createThumbnailFallback());
			}
			thumbBtn.appendChild(posterHost);
			const playBadge = document.createElement('span');
			playBadge.className = 'video-card-thumb__play';
			playBadge.setAttribute('aria-hidden','true');
			playBadge.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
			playBadge.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:rgba(10,10,12,0.65);color:#fff;backdrop-filter:blur(3px);border:1px solid rgba(255,255,0.12);box-shadow:0 6px 18px rgba(0,0,0,0.4);opacity:.85;';
			thumbBtn.appendChild(playBadge);
		try{
				const cleanThumb = sanitizeViewer(viewerName) || 'viewer';
				const thumbWM = document.createElement('span');
				thumbWM.className = 'thumb-watermark';
				thumbWM.setAttribute('aria-hidden','true');
				thumbWM.textContent = 'drafted.world | @' + cleanThumb;
				thumbBtn.appendChild(thumbWM);
			}catch(e){}
			titleRow.appendChild(thumbBtn);

			const metaRow = document.createElement('div');
			metaRow.className = 'video-card-meta';
			metaRow.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0;';
			const textWrap = document.createElement('div');
			textWrap.className = 'video-card-text';
			textWrap.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;';
			const title = document.createElement('h3');
			title.className = 'video-card-title';
			const titleText = video.name || video.topic || 'Untitled';
			title.textContent = titleText;
			title.style.cssText = 'margin:0;font-family:Georgia,serif;font-weight:400;font-size:clamp(1.15rem,2.6vw,1.55rem);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;';
			title.title = titleText;
			textWrap.appendChild(title);
			const subParts = [];
			if(video.day) subParts.push(video.day);
			if(video.topic) subParts.push(video.topic);
			if(subParts.length){
				const subEl = document.createElement('span');
				subEl.className = 'video-card-subtitle';
				subEl.textContent = subParts.join(' \u00b7 ');
				subEl.style.cssText = 'font-size:.78rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow: फलों घाटी';
				textWrap.appendChild(subEl);
			}
			const dateText = formatCardDate(video.createdAt);
			if(dateText){
				const dateEl = document.createElement('span');
				dateEl.className = 'video-card-date';
				dateEl.textContent = dateText;
				dateEl.style.cssText = 'font-size:.82rem;color:var(--muted);';
				textWrap.appendChild(dateEl);
			}
			metaRow.appendChild(textWrap);
			titleRow.appendChild(metaRow);
            section.appendChild(titleRow);
            articles.push(section);

            (function(vid, idx){
                function onOpen(e){
                    try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
                    openVideoModalAt(idx);
                }
                thumbBtn.addEventListener('click', onOpen);
                section.addEventListener('click', function(e){
                    if(e.target.closest && e.target.closest('.video-card-thumb')) return;
                    onOpen(e);
                });
                thumbBtn.addEventListener('keydown', function(e){
                    if(e.key === 'Enter' || e.LC');
                    }
				});
            })(video, videoIdx);
        });
        (function setupVideoModal(){
            const modal = document.getElementById('videoModal');
            const backdrop = document.getElementById('videoModalBackdrop');
            const closeBtn = document.getElementById('videoModalClose');
            const stage = document.getElementById('videoModalStage');
            const player = document.getElementById('videoModalPlayer');
            const loader = document.getElementById('videoModalLoader');
            const titleEl = document.getElementById('videoModalTitle');
            const metaEl = document.getElementById('videoModalMeta');
            if(!modal || !player || !stage) return;
            window._videoModal = {modal, stage, player, loader, titleEl, metaEl};
            function closeModal(){
                modal.classList.add('hidden');
                modal.classList.remove('is-maximized');
                document.body.style.overflow = '';
	try{ player.pause(); }catch(e){}
                try{ if(modal._cancelPoll) modal._cancelPoll(); modal._cancelPoll=null; }catch(e){}
            }
            window._closeVideoModal = closeModal;
            if(backdrop) backdrop.addEventListener('click', closeModal);
            if(closeBtn) closeBtn.addEventListener('click', closeModal);
            document.addEventListener('keydown', function(e){
                if(modal.classList.contains('hidden')) return;
                if(e.key === 'Escape'){ e.preventDefault(); closeModal(); }
                if(e.key === 'ArrowLeft'){ e.preventDefault(); navigateModal(-1); }
                if(e.key === 'ArrowRight'){ e.preventDefault(); navigateModal(1); }
            });
            const prevBtn = document.getElementById('videoModalPrev');
            const nextBtn = document.getElementById('videoModalNext');
            if(prevBtn) prevBtn.addEventListener('click', function(){ navigateModal(-1); });
            if(nextBtn) nextBtn.addEventListener('click', function(){ navigateModal(1); });
            window._navigateModal = navigateModal;
            function navigateModal(dir){
                if(!filteredVideos.length) return;
                let next = modalCurrentIdx + dir;
                if(next < 0) next = filteredVideos.length - 1;
                if(next >= filteredVideos.length) next = 0;
                openVideoModalAt(next);
            }
        })();
        let modalCurrentIdx = 0;
        let modalVideosCache = filteredVideos.slice();
		try{ window._modalVideos = filteredVideos; }catch(e){}
		function openVideoModalAt(idx){
			if(!accessGranted) return;
            const modalObj = window._videoModal;
            if(!modalObj) return;
            const modal = modalObj.modal;
            const stage = modalObj.stage;
            const player = modalObj.player;
            const loader = modalObj.loader;
            const titleEl = modalObj.titleEl;
            const metaEl = modalObj.metaEl;
            if(!filteredVideos[idx]) return;
            modalCurrentIdx = idx;
            const video = filteredVideos[idx];
            const viewerName = (video.viewer || cachedWhoamiViewer || '').trim() || 'viewer';
            if(titleEl) titleEl.textContent = video.name || video.topic || 'Untitled';
            if(metaEl){
                const parts = [];
                if(video.day) parts.push(video.day);
                if(video.topic) parts.push(video.topic);
				const d = formatCardDate(video.createdAt);
				if(d) parts.push(d);
				metaEl.textContent = parts.length ? parts.join(' \u00b7 ') : '';
            }
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            modal.classList.add('is-controls-visible');
            clearTimeout(modal._controlsH);
            modal._controlsShowTimer = setTimeout(function(){ modal.classList.remove('is-controls-visible'); }, 3000);
            try{ player.pause(); }catch(e){}
            player.preload = 'metadata';
            player.crossOrigin = 'use-credentials';
            player.setAttribute('crossorigin','use-credentials');
            player.playsInline = true;
            player.setAttribute('playsinline','');
            player.controls = false;
            if(video.thumbnail) player.poster = apiBase + video.thumbnail;
            else { const svgUrl = svgPosterDataUrl(video); if(svgUrl) player.poster = svgUrl; }
			if(loader) loader.classList.remove('hidden');
			clearTimeout(modal._loadTimeout);
			modal._loadTimeout = setTimeout(function(){
				if(loader && !loader.classList.contains('hidden')){
					loader.textContent = 'Unable to load video. Please try again.';
				}
			}, 15000);
            try{ if(modal._cancelPoll) modal._cancelPoll(); modal._cancelPoll=null; }catch(e){}
            try{
				// Do not replace the working signed source with a queued personalized stream.
            }catch(e){}
            function onCanPlay(){ clearTimeout(modal._loadTimeout); if(loader) loader.classList.add('hidden'); player.removeEventListener('canplay', onCanPlay); player.removeEventListener('loadeddata', onCanPlay); }
            player.addEventListener('canplay', onCanPlay);
            player.addEventListener('loadeddata', onCanPlay);
            function onError(){ clearTimeout(modal._loadTimeout); if(loader) loader.textContent = 'Unable to load video. Please try again.'; }
            player.addEventListener('error', onError, {once:true});
            openVideoModalAt(idx);
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC}\n// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bind controls once (eC');
			// bindControlsOnce();
		}
		window.openVideoModalAt = openVideoModalAt;
		try{ window._filteredVideos = filteredVideos; }catch(e){}

list.replaceChildren(...articles);
		renderHero(filteredVideos[0] || null);
	}

	try{
		const authResponse = await fetch(apiBase + '/api/whoami?t=' + Date.now(), {credentials:'include', cache:'no-store'});
		const auth = await authResponse.json();
		if(auth.accessToken) window.__traxAccessToken = auth.accessToken;
		if(!auth.user){
			showAccessDenied();
			updateCount('—');
			return;
		}
		const response = await fetch(apiBase + '/api/recaps', {credentials:'include'});
		if(response.status === 403){
			showAccessDenied();
			updateCount('—');
			return;
		}
		if(!response.ok) throw new Error('video request failed');
		loadedVideos = await response.json();
		if(!Array.isArray(loadedVideos)) loadedVideos = Array.isArray(loadedVideos.videos) ? loadedVideos.videos : [];
		loadedVideos.sort(function(a,b){ return new Date(b.createdAt||0) - new Date(a.createdAt||0); });
		accessGranted = true;
		if(accessDenied) accessDenied.hidden = true;
		memberSurface.forEach(function(el){ el.hidden = false; });
		initFilters();
		await renderVideos();
		document.addEventListener('visibilitychange', function(){
			if(document.hidden) list.querySelectorAll('video').forEach(function(p){ p.pause(); });
		});
	}catch(error){
		showAccessDenied();
		updateCount(0);
	}
}

loadVideos();
