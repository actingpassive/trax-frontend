const VIDEO_SECTIONS = {
	"Day 1": ["Amd", "Orderblocks", "OHLC", "OLHC"],
	"Day 2": ["Daily bias", "Key opens", "SMT Divergence"],
	"Day 3": ["Protected High/Low", "Narrative", "IDM"],
	"Day 4": ["Net GEX", "Pinning", "0dte", "Open Interest"]
};

async function loadVideos(){
	const status = document.getElementById('video-status');
	const list = document.getElementById('videoGrid') || document.getElementById('video-list');
	if(list) list.classList.add('video-list--grid');
	const login = document.getElementById('video-login');
	const countEl = document.getElementById('videoCount');
	const apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '3000' && location.port !== '' ? 'http://localhost:3000' : '')));
	let loadedVideos = [];
	let filteredVideos = [];
	let filterDay = '';
	let filterTopic = '';

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
			const match = VIDEO_SECTIONS[filterDay] ? VIDEO_SECTIONS[filterDay].find(function(t){ return String(t).toLowerCase() === String(filterTopic).toLowerCase(); }) : null;
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
		// keep broader chars but strip < > " ' & ` $ { } to prevent HTML/JS injection
		v = v.replace(/[<>"'&`$]/g, '').replace(/[\{\}]/g, '');
		if(!v) return 'viewer';
		return v || 'viewer';
	}
	function createWatermark(viewer){
		const clean = sanitizeViewer(viewer);
		const wrap = document.createElement('div');
		wrap.className = 'video-watermark-tiled';
		wrap.setAttribute('aria-hidden','true');
		wrap.style.pointerEvents = 'none';
		const COLS = 5, ROWS = 8;
		for(let r = 0; r < ROWS; r++){
			for(let c = 0; c < COLS; c++){
				const span = document.createElement('span');
				span.className = 'video-watermark__tile';
				span.textContent = 'drafted.world | @' + clean;
				const rot = (Math.random()*8 - 4).toFixed(2);
				span.style.setProperty('--r', rot + 'deg');
				span.style.gridRow = String(r + 1);
				span.style.gridColumn = String(c + 1);
				wrap.appendChild(span);
			}
		}
		return wrap;
	}
	function createCanvasWatermark(viewer, stage){
		const clean = sanitizeViewer(viewer);
		const text = 'drafted.world | @' + clean;
		const canvas = document.createElement('canvas');
		canvas.className = 'video-watermark-canvas';
		canvas.setAttribute('aria-hidden','true');
		canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;user-select:none;mix-blend-mode:normal;opacity:1;z-index:2;';
		let ro = null;
		let rafId = 0;
		function draw(){
			const rect = stage.getBoundingClientRect();
			if(!rect.width || !rect.height) return;
			const dpr = window.devicePixelRatio || 1;
			const ctx = canvas.getContext('2d');
			if(!ctx) return;
			ctx.clearRect(0,0,canvas.width,canvas.height);
			ctx.save();
			ctx.scale(dpr, dpr);
		const margin = 10;
		const COLS = 5, ROWS = 8;
		const cellW = (rect.width - margin*2) / COLS;
		const cellH = (rect.height - margin*2) / ROWS;
		const tiles = [];
		for(let r = 0; r < ROWS; r++){
			for(let c = 0; c < COLS; c++){
				const cx = margin + cellW * c + cellW * 0.5;
				const cy = margin + cellH * r + cellH * 0.5;
				const align = c < COLS/2 ? 'left' : 'right';
				const baseline = r < ROWS/2 ? 'top' : 'bottom';
				tiles.push({ x: cx, y: cy, align: align, baseline: baseline, font:'600 10px system-ui, -apple-system, sans-serif', alpha:0.60 });
			}
		}
			for(let i=0;i<tiles.length;i++){
					const t = tiles[i];
					ctx.save();
					ctx.font = t.font;
					ctx.fillStyle = 'rgba(255,255,255,' + t.alpha + ')';
					ctx.textAlign = t.align;
					ctx.textBaseline = t.baseline;
					ctx.translate(t.x, t.y);
					const rot = (Math.random()*6 - 3) * Math.PI / 180;
					ctx.rotate(rot);
					ctx.shadowColor = 'rgba(0,0,0,0.7)';
					ctx.shadowBlur = 2;
					ctx.shadowOffsetY = 1;
					ctx.fillText(text, 0, 0);
					ctx.restore();
				}
			ctx.restore();
		}
		function resize(){
			const rect = stage.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const w = Math.max(1, Math.floor(rect.width * dpr));
			const h = Math.max(1, Math.floor(rect.height * dpr));
			if(canvas.width !== w) canvas.width = w;
			if(canvas.height !== h) canvas.height = h;
			canvas.style.width = rect.width + 'px';
			canvas.style.height = rect.height + 'px';
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(draw);
		}
		requestAnimationFrame(resize);
		try{
			ro = new ResizeObserver(resize);
			ro.observe(stage);
		}catch(e){
			window.addEventListener('resize', resize);
		}
		canvas._wmCleanup = function(){
			cancelAnimationFrame(rafId);
			if(ro) try{ ro.disconnect(); }catch(e){}
			window.removeEventListener('resize', resize);
		};
		let jitterIv = setInterval(draw, 4000 + Math.random()*2000);
		canvas._wmJitterCleanup = function(){ clearInterval(jitterIv); };
		document.addEventListener('visibilitychange', function vis(){
			if(document.hidden){ clearInterval(jitterIv); }
			else { clearInterval(jitterIv); jitterIv = setInterval(draw, 4000 + Math.random()*2000); }
		});
		return canvas;
	}
	function hardenWatermark(wrapper, el){
		if(!wrapper || !el) return function(){};
		el.style.pointerEvents = 'none';
		el.style.userSelect = 'none';
		let restoring = false;
		function check(){
			if(restoring) return;
			const comp = window.getComputedStyle ? window.getComputedStyle(el) : null;
			const displayNone = comp && comp.display === 'none';
			const opacityZero = comp && parseFloat(comp.opacity) === 0;
			const inlineHidden = el.style.display === 'none' || el.style.opacity === '0' || el.hidden;
			const notConnected = !el.isConnected;
			const hidden = inlineHidden || displayNone || opacityZero;
			if(notConnected){
				restoring = true;
				try{ wrapper.appendChild(el); }catch(e){}
				el.style.display = '';
				el.style.opacity = '';
				el.hidden = false;
				el.style.pointerEvents = 'none';
				el.style.userSelect = 'none';
				restoring = false;
			}else if(hidden){
				restoring = true;
				el.style.display = '';
				el.style.opacity = '';
				el.hidden = false;
				el.style.pointerEvents = 'none';
				el.style.userSelect = 'none';
				// force visible if still computed hidden
				const comp2 = window.getComputedStyle ? window.getComputedStyle(el) : null;
				if(comp2 && (comp2.display === 'none' || parseFloat(comp2.opacity) === 0)){
					if(el.classList.contains('video-watermark-tiled')) el.style.display = 'grid';
					else el.style.display = 'block';
					el.style.opacity = wrapper && wrapper.getAttribute('data-watermark') === 'burned' ? '0.03' : '0.09';
				}
				restoring = false;
			}
		}
		let mo = null;
		try{
			mo = new MutationObserver(function(){ check(); });
			mo.observe(wrapper, {childList:true, subtree:false, attributes:true, attributeFilter:['style','class','hidden']});
			mo.observe(el, {attributes:true, attributeFilter:['style','class','hidden']});
		}catch(e){}
		let mo2 = null;
		try{
			mo2 = new MutationObserver(function(){ if(!el.isConnected) check(); });
			mo2.observe(document.body, {childList:true, subtree:true});
		}catch(e){}
		return function disconnect(){
			try{ if(mo) mo.disconnect(); }catch(e){}
			try{ if(mo2) mo2.disconnect(); }catch(e){}
		};
	}
	function jitterWatermark(el, player){
		if(!el || !el.querySelectorAll) return function(){};
		const tiles = el.querySelectorAll('.video-watermark__tile');
		if(!tiles.length) return function(){};
		let timer = null;
		let paused = false;
		function jitter(){
			if(paused || document.hidden) return;
			if(player && player.paused) return;
			tiles.forEach(function(tile){
				const dx = (Math.random()*10 + 10) * (Math.random()<0.5?1:-1);
				const dy = (Math.random()*10 + 10) * (Math.random()<0.5?1:-1);
				tile.style.setProperty('--dx', dx.toFixed(1)+'px');
				tile.style.setProperty('--dy', dy.toFixed(1)+'px');
			});
		}
		function schedule(){
			clearTimeout(timer);
			const delay = 3000 + Math.random()*2000;
			timer = setTimeout(function(){ jitter(); schedule(); }, delay);
		}
		schedule();
		function onVis(){
			if(document.hidden){ paused = true; clearTimeout(timer); }
			else { paused = false; schedule(); }
		}
		document.addEventListener('visibilitychange', onVis);
		let onPause = null, onPlay = null;
		if(player){
			onPause = function(){ clearTimeout(timer); };
			onPlay = function(){ if(!document.hidden) schedule(); };
			player.addEventListener('pause', onPause);
			player.addEventListener('play', onPlay);
		}
		return function stop(){
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVis);
			if(player && onPause) player.removeEventListener('pause', onPause);
			if(player && onPlay) player.removeEventListener('play', onPlay);
		};
	}
	// export for testing / external use
	try{
		if(typeof window !== 'undefined'){
			window.sanitizeViewer = sanitizeViewer;
			window.createWatermark = createWatermark;
			window.createCanvasWatermark = createCanvasWatermark;
			window.hardenWatermark = hardenWatermark;
			window.jitterWatermark = jitterWatermark;
		}
	}catch(e){}

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
		// ctx: {player, stage, wrapper, viewer, useCanvas}
		const player = ctx.player;
		const stage = ctx.stage;
		const wrapper = ctx.wrapper;
		const viewer = ctx.viewer;
		if(!video || !video.id || !player || !stage) return function(){};
		// if backend already provided personalizedUrl, prefer it and don't poll
		if(video.personalizedUrl){
			const personalizedUrl = String(video.personalizedUrl);
			const cur = player.src || '';
			if(cur !== personalizedUrl){
				try{ player.src = (personalizedUrl.startsWith('http')||personalizedUrl.startsWith('/')) ? (personalizedUrl.startsWith('/')? apiBase + personalizedUrl : personalizedUrl) : personalizedUrl; player.load(); }catch(e){}
			}
			return function(){};
		}
		const parsed = parseSignedParams(video.url);
		if(!parsed.expires || !parsed.signature) return function(){};
		const baseManifestUrl = apiBase + '/media/' + encodeURIComponent(video.id) + '/manifest?expires=' + encodeURIComponent(parsed.expires) + '&signature=' + encodeURIComponent(parsed.signature);
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
			// Build notice via DOM APIs — no innerHTML with user data (XSS hardening)
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
					if(cd) cd.textContent = 'will retry shortly';
				}
				// keep generic fallback disabled: leave notice and allow manual retry on click
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
					const isHit = cacheHeader === 'HIT' || watermarkHeader === 'burned' || (data && Array.isArray(data.segments) && data.segments.length>0);
				if(!isHit){
						// Still pending — update non-blocking notice but DO NOT change src
						const label = '~' + Math.max(5, Math.ceil((MAX_MS - (Date.now()-startMs))/1000)) + 's';
						ensureNotice(label);
						updateNoticeProgress(label);
						if(cacheHeader) wrapper.setAttribute('data-personalized-cache', cacheHeader);
						if(watermarkHeader) wrapper.setAttribute('data-watermark', watermarkHeader);
						const delay = Math.min(8000, Math.round(3000 * Math.pow(1.35, attempt-1)));
						pollTimer = setTimeout(poll, delay);
						return;
					}
					// HIT confirmed — prepare personalized URL
					let personalizedUrl = null;
					if(data && data.personalizedUrl) personalizedUrl = String(data.personalizedUrl);
					else if(data && data.url) personalizedUrl = String(data.url);
					else if(video.personalizedUrl) personalizedUrl = String(video.personalizedUrl);
					else {
						personalizedUrl = apiBase + '/media/' + encodeURIComponent(video.id) + '?expires=' + encodeURIComponent(parsed.expires) + '&signature=' + encodeURIComponent(parsed.signature) + '&personalized=1';
					}
					if(notice && notice.isConnected){
						const fill = notice.querySelector('.personalizing-notice__fill');
						if(fill) fill.style.width = '100%';
						setTimeout(function(){ if(notice && notice.parentNode) notice.remove(); }, 650);
					}
					if(cacheHeader) wrapper.setAttribute('data-personalized-cache', cacheHeader||'HIT');
					if(watermarkHeader) wrapper.setAttribute('data-watermark', watermarkHeader||'burned');
					let finalSrc = personalizedUrl;
					if(finalSrc && finalSrc.startsWith('/') && apiBase) finalSrc = apiBase + finalSrc;
					const curSrc = player.src || '';
					function stripBase(s){ try{ const u=new URL(s, location.origin); return u.pathname+u.search; }catch(e){ return s; } }
					const curStripped = stripBase(curSrc);
					const newStripped = stripBase(finalSrc);
					// Only swap when HIT and finalSrc differs — preserve currentTime
					if(finalSrc && isHit && curStripped !== newStripped){
						const wasPlaying = !player.paused && !player.ended;
						const curTime = player.currentTime || 0;
						try{
							player.src = finalSrc;
							player.load();
							if(curTime>0.5){ try{ player.currentTime = curTime; }catch(e){} }
							if(wasPlaying){ player.play().catch(function(){}); }
						}catch(e){}
					} else {
						if(notice && notice.isConnected) try{ notice.remove(); }catch(e){}
					}
					return;
				}
				// 401/403/404 etc -> treat as fallback to generic (remove notice if any)
				if(notice && notice.isConnected){
				notice.remove();
				}
			}catch(e){
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
		}catch(e){ return ''; }
	}

	initFilters();

	function updateCount(n){
		if(!countEl) return;
		if(n === null || n === undefined || n === '—'){ countEl.textContent = '—'; return; }
		if(n === 0) countEl.textContent = '0 videos';
		else if(n === 1) countEl.textContent = '1 video';
		else countEl.textContent = n + ' videos';
	}

	function svgPosterDataUrl(video){
		// Generic video icon fallback — no gradient placeholder, per spec thumbnail fallback = default icon
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
		wrap.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="2.2" ry="2.2"/><path d="M16 10l4-2v8l-4-2z"/><circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/></svg>';
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
		if(!video){ hero.hidden = true; return; }
		hero.hidden = false;
		const card = document.createElement('div');
		card.className = 'video-hero__card';
		// class hook Worker A will style
		card.style.cssText = 'position:relative;border-radius:14px;overflow:hidden;background:var(--surface);border:1px solid var(--line);box-shadow:0 12px 40px rgba(0,0,0,0.35);';
		const thumbWrap = document.createElement('button');
		thumbWrap.type = 'button';
		thumbWrap.className = 'video-hero__thumb';
		thumbWrap.setAttribute('aria-label', 'Play featured video: ' + (video.name || video.topic || 'Untitled'));
		thumbWrap.style.cssText = 'position:relative;display:block;width:100%;aspect-ratio:16/9;padding:0;border:0;background:#0a0a0c;cursor:pointer;overflow:hidden;';
		const posterHost = document.createElement('div');
		posterHost.className = 'video-hero__poster';
		posterHost.style.cssText = 'position:absolute;inset:0;';
		const thumbSrc = video.thumbnail ? ('' + apiBase + video.thumbnail) : '';
		if(video.thumbnail){
			const img = document.createElement('img');
			img.src = thumbSrc;
			img.alt = '';
			img.loading = 'lazy';
			img.crossOrigin = 'use-credentials';
			img.setAttribute('crossorigin','use-credentials');
			img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;';
			img.onerror = function(){
				posterHost.replaceChildren(createThumbnailFallback());
			};
			posterHost.appendChild(img);
		}else{
			posterHost.appendChild(createThumbnailFallback());
		}
		thumbWrap.appendChild(posterHost);
		const playBadge = document.createElement('span');
		playBadge.className = 'video-hero__play';
		playBadge.setAttribute('aria-hidden','true');
		playBadge.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
		playBadge.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:rgba(10,10,12,0.7);color:#fff;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.12);box-shadow:0 8px 24px rgba(0,0,0,0.45);';
		thumbWrap.appendChild(playBadge);
		const meta = document.createElement('div');
		meta.className = 'video-hero__meta';
		meta.style.cssText = 'padding:18px 20px 20px;display:flex;flex-direction:column;gap:6px;min-width:0;';
		const title = document.createElement('h2');
		title.className = 'video-hero__title';
		title.style.cssText = 'margin:0;font-family:Georgia,serif;font-weight:400;font-size:clamp(1.3rem,3vw,1.8rem);color:var(--ink);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
		title.textContent = video.name || video.topic || 'Untitled';
		meta.appendChild(title);
		const sub = document.createElement('div');
		sub.className = 'video-hero__subtitle';
		sub.style.cssText = 'font-size:.82rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
		const subParts = [];
		if(video.day) subParts.push(video.day);
		if(video.topic) subParts.push(video.topic);
		const dateText = formatCardDate(video.createdAt);
		if(dateText) subParts.push(dateText);
		sub.textContent = subParts.join(' \u00b7 ');
		if(subParts.length) meta.appendChild(sub);
		card.appendChild(thumbWrap);
		card.appendChild(meta);
		hero.appendChild(card);
		// click: open modal popup (thumbnail grid only)
        thumbWrap.addEventListener('click', function(){
            try{
                const idx = filteredVideos.findIndex(function(x){ return String(x.id) === String(video.id); });
                if(idx >= 0 && typeof openVideoModalAt === 'function') openVideoModalAt(idx);
                else if(window.openVideoModalAt) window.openVideoModalAt(0);
            }catch(e){}
        });
	}

	async function renderVideos(){
		if(!loadedVideos.length){
			list.replaceChildren();
			renderHero(null);
			const empty = document.createElement('div');
			empty.className = 'empty-list';
			empty.innerHTML = '<div class="empty-list-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="20" height="20" aria-hidden="true"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg></div><p class="empty-list-title">No videos yet</p><p class="empty-list-hint">Videos will appear here once published.</p>';
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
			if(topicLabel) titleText += ' \u2013 ' + topicLabel;
			else if(filterDay) titleText += ' \u2013 All Topics';
			// escape for innerHTML
			const safeTitle = escapeHtml(titleText);
			const hint = (filterDay || filterTopic) ? 'Try a different Day or Topic filter.' : 'Videos will appear here once published.';
			empty.innerHTML = '<div class="empty-list-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="20" height="20" aria-hidden="true"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg></div><p class="empty-list-title">' + safeTitle + '</p><p class="empty-list-hint">' + escapeHtml(hint) + '</p>';
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
		// viewer fallback: if any video lacks viewer, prefetch whoami once
		let cachedWhoamiViewer = null;
		const needsWhoami = filteredVideos.some(function(v){ return !v.viewer || !String(v.viewer).trim(); });
		if(needsWhoami){
			try{
				const whoRes = await fetch(apiBase + '/api/whoami', {credentials:'include', cache:'no-store'});
				if(whoRes.ok){
					const whoData = await whoRes.json();
					const u = whoData && whoData.user;
					let v = '';
					if(u){
						v = u.displayName || u.username || u.discordName || u.discord || u.name || u.viewer || '';
					}
					if(!v) v = whoData.viewer || whoData.displayName || whoData.username || whoData.name || '';
					if(v) cachedWhoamiViewer = String(v).trim().slice(0,32);
				}
			}catch(e){}
		}
		filteredVideos.forEach(function(video, videoIdx){
		let viewerName = video.viewer || cachedWhoamiViewer || '';
			if(!viewerName || !String(viewerName).trim()){
				if(cachedWhoamiViewer) viewerName = cachedWhoamiViewer;
			}
			// fallback async refetch if still empty (e.g. race) — fire and update in place
			if((!viewerName || !String(viewerName).trim()) && !cachedWhoamiViewer){
				fetch(apiBase + '/api/whoami', {credentials:'include', cache:'no-store'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
					if(!d) return;
					const u2 = d.user || d;
					let v2 = (u2 && (u2.displayName || u2.username || u2.discordName || u2.discord || u2.name || u2.viewer)) || d.viewer || d.displayName || '';
					if(v2){
						const clean2 = sanitizeViewer(v2);
					try{
						const tiles = document.querySelectorAll('.video-watermark__tile');
						if(!String(viewerName).trim()) viewerName = clean2;
						}catch(e){}
					}
				}).catch(function(){});
			}
			const section = document.createElement('article');
			section.className = 'section video-section';
			section.dataset.day = video.day || '';
			section.dataset.topic = video.topic || '';
			if(video.id) section.dataset.videoId = String(video.id);

			const titleRow = document.createElement('div');
			titleRow.className = 'video-card-header';
			// class hook Worker A will style; inline layout covers aspect-ratio + structure
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
			// Minimal: no duration badge per user selection
			// play badge centered on hover (purely visual; click toggles play)
			const playBadge = document.createElement('span');
			playBadge.className = 'video-card-thumb__play';
			playBadge.setAttribute('aria-hidden','true');
			playBadge.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
			playBadge.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;background:rgba(10,10,12,0.65);color:#fff;backdrop-filter:blur(3px);border:1px solid rgba(255,255,255,0.12);box-shadow:0 6px 18px rgba(0,0,0,0.4);opacity:.85;';
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
			// Minimal: no Day chip per user selection
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
				subEl.style.cssText = 'font-size:.78rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
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
            // Thumbnail Grid Only – no inline player, controls hidden until modal
            section.appendChild(titleRow);
            articles.push(section);

            // click whole card or thumb opens modal popup
            (function(vid, idx){
                function onOpen(e){
                    try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
                    openVideoModalAt(idx);
                }
                thumbBtn.addEventListener('click', onOpen);
                section.addEventListener('click', function(e){
                    // if clicking thumb already handled, ignore duplicate
                    if(e.target.closest && e.target.closest('.video-card-thumb')) return;
                    onOpen(e);
                });
                // keyboard activate
                thumbBtn.addEventListener('keydown', function(e){
                    if(e.key === 'Enter' || e.key === ' '){
                        e.preventDefault();
                        onOpen(e);
                    }
                });
            })(video, videoIdx);
        });
        // Ensure modal DOM exists (injected in videos.html)
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
            // expose for open function
            window._videoModal = {modal, stage, player, loader, titleEl, metaEl};
            // close helpers
            function closeModal(){
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                try{ player.pause(); }catch(e){}
                try{
                    if(document.fullscreenElement) document.exitFullscreen();
                    else if(document.webkitFullscreenElement) document.webkitExitFullscreen();
                    else if(document.mozFullScreenElement) document.mozCancelFullScreen();
                    else if(document.msFullscreenElement) document.msExitFullscreen();
                }catch(e){}
            try{ if(modal._unharden) modal._unharden(); modal._unharden=null; }catch(e){}
                try{ if(modal._stopJitter) modal._stopJitter(); modal._stopJitter=null; }catch(e){}
                try{ if(modal._unhardenCanvas) modal._unhardenCanvas(); modal._unhardenCanvas=null; }catch(e){}
                try{ if(modal._wmCleanup) modal._wmCleanup(); modal._wmCleanup=null; }catch(e){}
                try{ if(modal._cancelPoll) modal._cancelPoll(); modal._cancelPoll=null; }catch(e){}
            try{
                stage.querySelectorAll('.video-watermark-tiled,.video-watermark-canvas').forEach(function(n){ n.remove(); });
                }catch(e){}
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
            // prev/next buttons
            const prevBtn = document.getElementById('videoModalPrev');
            const nextBtn = document.getElementById('videoModalNext');
            if(prevBtn) prevBtn.addEventListener('click', function(){ navigateModal(-1); });
            if(nextBtn) nextBtn.addEventListener('click', function(){ navigateModal(1); });
            // expose navigate
            window._navigateModal = navigateModal;
            function navigateModal(dir){
                if(!filteredVideos.length) return;
                let next = modalCurrentIdx + dir;
                if(next < 0) next = filteredVideos.length - 1;
                if(next >= filteredVideos.length) next = 0;
                openVideoModalAt(next);
            }
        })();
        // modal state
        let modalCurrentIdx = 0;
        let modalVideosCache = filteredVideos.slice();
        // keep cache in sync if filteredVideos changes (re-render will re-setup)
        try{ window._modalVideos = filteredVideos; }catch(e){}
        function openVideoModalAt(idx){
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
            // update title/meta — Title / Day · Topic · Date
            if(titleEl) titleEl.textContent = video.name || video.topic || 'Untitled';
            if(metaEl){
                const parts = [];
                if(video.day) parts.push(video.day);
                if(video.topic) parts.push(video.topic);
                const d = formatCardDate(video.createdAt);
                if(d) parts.push(d);
                metaEl.textContent = parts.length ? parts.join(' \u00b7 ') : '';
            }
            // show modal
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // reset player
            try{ player.pause(); }catch(e){}
            player.preload = 'metadata';
            player.crossOrigin = 'use-credentials';
            player.setAttribute('crossorigin','use-credentials');
            player.playsInline = true;
            player.setAttribute('playsinline','');
            player.controls = false;
            if(video.thumbnail) player.poster = apiBase + video.thumbnail;
            else { const svgUrl = svgPosterDataUrl(video); if(svgUrl) player.poster = svgUrl; }
            // source
            let src = video.url || '';
            if(src){
                const hasBase = String(src).startsWith('http') || String(src).startsWith('/');
                if(hasBase && String(src).startsWith('/')) src = apiBase + src;
                else if(!hasBase) src = apiBase + '/' + String(src).replace(/^\//,'');
                if(String(src).includes('/manifest')) src = video.url || src;
                player.src = String(src);
            }
            try{ player.load(); }catch(e){}
            if(loader) loader.classList.remove('hidden');
            try{ stage.querySelectorAll('.video-watermark-tiled,.video-watermark-canvas').forEach(function(n){ n.remove(); }); }catch(e){}
            // cleanup previous
            try{ if(modal._unharden) modal._unharden(); }catch(e){}
            try{ if(modal._stopJitter) modal._stopJitter(); }catch(e){}
            try{ if(modal._unhardenCanvas) modal._unhardenCanvas(); }catch(e){}
            try{ if(modal._cancelPoll) modal._cancelPoll(); }catch(e){}
            const useCanvas = (function(){ try{ return new URLSearchParams(location.search).has('canvas'); }catch(e){ return false; } })();
            let watermark = null;
            let canvasLayer = null;
            if(useCanvas){
                try{ canvasLayer = createCanvasWatermark(viewerName, stage); stage.appendChild(canvasLayer); modal._unhardenCanvas = hardenWatermark(modal, canvasLayer); if(canvasLayer && canvasLayer._wmCleanup) modal._wmCleanup = canvasLayer._wmCleanup; }catch(e){}
            } else {
                try{ watermark = createWatermark(viewerName); stage.appendChild(watermark); modal._unharden = hardenWatermark(stage, watermark); modal._stopJitter = jitterWatermark(watermark, player); }catch(e){}
            }
            try{
                if(!video.personalizedUrl){
                    modal._cancelPoll = fetchPersonalizedManifest(video, {player: player, stage: stage, wrapper: stage, viewer: viewerName});
                }
            }catch(e){}
            // loader hide on canplay
            function onCanPlay(){ if(loader) loader.classList.add('hidden'); player.removeEventListener('canplay', onCanPlay); player.removeEventListener('loadeddata', onCanPlay); }
            player.addEventListener('canplay', onCanPlay);
            player.addEventListener('loadeddata', onCanPlay);
            // also hide on error
            function onError(){ if(loader) loader.classList.add('hidden'); }
            player.addEventListener('error', onError, {once:true});
            // auto play
            player.play().catch(function(){});
            // bind controls once (if not already)
            if(!modal._controlsBound){
                modal._controlsBound = true;
                (function bindModalControls(){
                    const controls = document.getElementById('videoModalControls');
                    if(!controls) return;
                    const timeline = document.getElementById('videoModalTimeline');
                    const fill = document.getElementById('videoModalFill');
                    const thumb = document.getElementById('videoModalThumb');
                    const range = document.getElementById('videoModalProgress');
                    const timeCurrent = document.getElementById('videoModalCurrent');
                    const timeDuration = document.getElementById('videoModalDuration');
                    const playBtn = document.getElementById('videoModalPlay');
                    const muteBtn = document.getElementById('videoModalMute');
                    const volumeInput = document.getElementById('videoModalVolume');
                    const fullscreenBtn = document.getElementById('videoModalFullscreen');
                    let isScrubbing = false;
                    let wasPlayingBeforeScrub = false;
                    let pendingSeekPct = null;
                    function syncTimeLabels(cur, dur){
                        const curStr = formatPlayerTime(cur);
                        const durStr = formatPlayerTime(dur);
                        if(timeCurrent) timeCurrent.textContent = curStr;
                        if(timeDuration) timeDuration.textContent = durStr;
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
                            try{ player.currentTime = (pct/100)*dur; }catch(e){}
                            syncTimeLabels((pct/100)*dur, dur);
                        } else {
                            pendingSeekPct = pct;
                            syncTimeLabels(0,0);
                        }
                    }
                    function pctFromClientX(clientX){
                        const src = timeline || range;
                        const rect = src ? src.getBoundingClientRect() : null;
                        if(!rect || !rect.width) return 0;
                        let pct = ((clientX - rect.left)/rect.width)*100;
                        if(pct<0) pct=0;
                        if(pct>100) pct=100;
                        return pct;
                    }
                    function updatePlayIcon(isPlaying){
                        if(!playBtn) return;
                        if(isPlaying){
                            playBtn.innerHTML = '<svg viewBox=\'0 0 24 24\' width=\'14\' height=\'14\' fill=\'currentColor\' stroke=\'none\'><rect x=\'7\' y=\'5\' width=\'4\' height=\'14\' rx=\'1\'/><rect x=\'13\' y=\'5\' width=\'4\' height=\'14\' rx=\'1\'/></svg>';
                            playBtn.setAttribute('aria-label','Pause');
                        } else {
                            playBtn.innerHTML = '<svg viewBox=\'0 0 24 24\' width=\'14\' height=\'14\' fill=\'currentColor\' stroke=\'none\'><path d=\'M8 5v14l11-7z\'/></svg>';
                            playBtn.setAttribute('aria-label','Play');
                        }
                    }
                    function updateVolumeIcon(){
                        if(!muteBtn) return;
                        const muted = player.muted || player.volume===0;
                        if(muted){
                            muteBtn.innerHTML = '<svg viewBox=\'0 0 24 24\' width=\'14\' height=\'14\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.7\'><path d=\'M11 5L6 9H2v6h4l5 5V5z\'/><path d=\'M16 9l6 6M22 9l-6 6\'/></svg>';
                            muteBtn.setAttribute('aria-label','Unmute');
                        } else {
                            const v = player.volume;
                            const path2 = v < 0.5 ? '<path d=\'M15.54 8.46a5 5 0 010 7.07\'/>' : '<path d=\'M15.54 8.46a5 5 0 010 7.07\'/><path d=\'M19 6a9 9 0 010 12\'/>';
                            muteBtn.innerHTML = '<svg viewBox=\'0 0 24 24\' width=\'14\' height=\'14\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.7\'><path d=\'M11 5L6 9H2v6h4l5 5V5z\'/>'+path2+'</svg>';
                            muteBtn.setAttribute('aria-label','Mute');
                        }
                    }
                    function togglePlay(){ if(player.paused) player.play().catch(function(){}); else player.pause(); }
                    if(playBtn) playBtn.addEventListener('click', togglePlay);
                    player.addEventListener('click', togglePlay);
                    player.addEventListener('play', function(){ updatePlayIcon(true); });
                    player.addEventListener('pause', function(){ updatePlayIcon(false); });
                    player.addEventListener('timeupdate', function(){
                        if(isScrubbing) return;
                        const dur = player.duration||0;
                        const cur = player.currentTime||0;
                        const pct = dur && isFinite(dur) && dur>0 ? (cur/dur)*100 : 0;
                        if(range) range.value=String(pct);
                        if(fill) fill.style.width=pct+'%';
                        if(thumb) thumb.style.left=pct+'%';
                        syncTimeLabels(cur,dur);
                    });
                    player.addEventListener('loadedmetadata', function(){
                        const dur=player.duration||0;
                        const cur=player.currentTime||0;
                        const pct = dur && isFinite(dur) && dur>0 ? (cur/dur)*100 : 0;
                        if(range) range.value=String(pct);
                        if(fill) fill.style.width=pct+'%';
                        if(thumb) thumb.style.left=pct+'%';
                        syncTimeLabels(cur,dur);
                    });
                    if(timeline){
                        timeline.style.touchAction='none';
                        const handlePointerDown = function(e){
                            if(e.button!==undefined && e.button!==0) return;
                            isScrubbing=true;
                            timeline.classList.add('is-dragging');
                            if(timeline.setPointerCapture) try{ timeline.setPointerCapture(e.pointerId);}catch(err){}
                            wasPlayingBeforeScrub=!player.paused;
                            try{ if(wasPlayingBeforeScrub) player.pause(); }catch(e2){}
                            const pct=pctFromClientX(e.clientX);
                            seekToPct(pct);
                            e.preventDefault();
                        };
                        timeline.addEventListener('pointerdown', handlePointerDown);
                        window.addEventListener('pointermove', function(e){
                            if(!isScrubbing) return;
                            const pct=pctFromClientX(e.clientX);
                            seekToPct(pct);
                            if(e.cancelable) e.preventDefault();
                        }, {passive:false});
                        window.addEventListener('pointerup', function(e){
                            if(!isScrubbing) return;
                            if(typeof e.clientX==='number' && isFinite(e.clientX)){
                                const pct=pctFromClientX(e.clientX);
                                seekToPct(pct);
                            }
                            isScrubbing=false;
                            if(timeline) timeline.classList.remove('is-dragging');
                            if(wasPlayingBeforeScrub){ try{ player.play().catch(function(){});}catch(e2){} wasPlayingBeforeScrub=false; }
                        });
                        timeline.addEventListener('click', function(e){
                            if(e.target===range) return;
                            if(!isScrubbing){
                                const pct=pctFromClientX(e.clientX);
                                seekToPct(pct);
                            }
                            e.preventDefault();
                        });
                    }
                    if(volumeInput){
                        try{
                            const saved=localStorage.getItem('trax-player-volume');
                            if(saved!==null){ const v=parseFloat(saved); if(isFinite(v)&&v>=0&&v<=1){ player.volume=v; volumeInput.value=String(v);} }
                            const muted=localStorage.getItem('trax-player-muted');
                            if(muted==='true') player.muted=true;
                        }catch(e){}
                        updateVolumeIcon();
                        volumeInput.addEventListener('input', function(){
                            player.muted=false;
                            player.volume=parseFloat(volumeInput.value)||0;
                            try{ localStorage.setItem('trax-player-volume',String(player.volume)); localStorage.setItem('trax-player-muted','false'); }catch(e){}
                            updateVolumeIcon();
                        });
                    }
                    if(muteBtn) muteBtn.addEventListener('click', function(){
                        player.muted=!player.muted;
                        try{ localStorage.setItem('trax-player-muted',String(player.muted)); }catch(e){}
                        updateVolumeIcon();
                    });
                    if(fullscreenBtn) fullscreenBtn.addEventListener('click', function(){
                        const modalEl = document.getElementById('videoModal');
                        if(!modalEl) return;
                        const isFs = document.fullscreenElement===modalEl || document.webkitFullscreenElement===modalEl || document.mozFullScreenElement===modalEl || document.msFullscreenElement===modalEl;
                        if(!isFs){
                            try{
                                if(modalEl.requestFullscreen) modalEl.requestFullscreen();
                                else if(modalEl.webkitRequestFullscreen) modalEl.webkitRequestFullscreen();
                                else if(modalEl.mozRequestFullScreen) modalEl.mozRequestFullScreen();
                                else if(modalEl.msRequestFullscreen) modalEl.msRequestFullscreen();
                            }catch(e){}
                        } else {
                            try{
                                if(document.exitFullscreen) document.exitFullscreen();
                                else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
                                else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
                                else if(document.msExitFullscreen) document.msExitFullscreen();
                            }catch(e){}
                        }
                    });
                    try{
                        const stageEl = document.getElementById('videoModalStage');
                        const modalEl2 = document.getElementById('videoModal');
                        function toggleWrapperFs(){
                            const isFs2 = document.fullscreenElement===modalEl2 || document.webkitFullscreenElement===modalEl2 || document.mozFullScreenElement===modalEl2 || document.msFullscreenElement===modalEl2;
                            if(!isFs2){
                                try{
                                    if(modalEl2.requestFullscreen) modalEl2.requestFullscreen();
                                    else if(modalEl2.webkitRequestFullscreen) modalEl2.webkitRequestFullscreen();
                                    else if(modalEl2.mozRequestFullScreen) modalEl2.mozRequestFullScreen();
                                    else if(modalEl2.msRequestFullscreen) modalEl2.msRequestFullscreen();
                                }catch(e){}
                            } else {
                                try{
                                    if(document.exitFullscreen) document.exitFullscreen();
                                    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
                                    else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
                                    else if(document.msExitFullscreen) document.msExitFullscreen();
                                }catch(e){}
                            }
                        }
                        if(stageEl) stageEl.addEventListener('dblclick', function(e){ e.preventDefault(); toggleWrapperFs(); });
                        if(player) player.addEventListener('dblclick', function(e){ e.preventDefault(); e.stopPropagation(); toggleWrapperFs(); });
                    function ensureWatermarkVisible(){
                            try{
                                const wm = stageEl ? stageEl.querySelector('.video-watermark-tiled,.video-watermark-canvas') : null;
                                if(wm){
                                    wm.style.display='block';
                                    wm.style.opacity='';
                                    wm.style.visibility='visible';
                                    wm.style.pointerEvents='none';
                                }
                            }catch(e){}
                        }
                        ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'].forEach(function(evt){
                            document.addEventListener(evt, ensureWatermarkVisible);
                        });
                        player.addEventListener('pause', ensureWatermarkVisible);
                        player.addEventListener('play', ensureWatermarkVisible);
                    }catch(e){}
                    // also handle stage fullscreen for video itself fallback
                    updatePlayIcon(false);
                    updateVolumeIcon();
                })();
            }
        }
        window.openVideoModalAt = openVideoModalAt;
        // keep global for hero click
        try{ window._filteredVideos = filteredVideos; }catch(e){}

list.replaceChildren(...articles);
		renderHero(filteredVideos[0] || null);
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
		await renderVideos();
		document.addEventListener('visibilitychange', function(){
			if(document.hidden) list.querySelectorAll('video').forEach(function(p){ p.pause(); });
		});
	}catch(error){
		status.textContent = 'Unable to load videos.';
		updateCount(0);
	}
}

loadVideos();
