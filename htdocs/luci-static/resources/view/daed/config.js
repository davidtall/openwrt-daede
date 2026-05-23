// SPDX-License-Identifier: Apache-2.0

'use strict';
'require form';
'require fs';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

const CSS = [
	'.dd-wrap{padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}',
	'.dd-card{border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.03);background:rgba(255,255,255,.02)}',
	'.dd-card-title{font-size:12px;font-weight:600;opacity:.55;margin:0 0 10px;letter-spacing:.3px;text-transform:uppercase}',
	'.dd-status-row{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:10px}',
	'.dd-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.3px;border:1px solid transparent;line-height:1.3}',
	'.dd-badge-run{color:#3da66a;border-color:rgba(61,166,106,.5)}',
	'.dd-badge-stop{color:#d96d6d;border-color:rgba(217,109,109,.55)}',
	'.dd-badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block}',
	'.dd-meta{font-size:12px;opacity:.7;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}',
	'.dd-meta-label{opacity:.55;margin-right:4px}',
	'.dd-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}',
	'.dd-actions .cbi-button{font-size:12px;padding:6px 14px;border-radius:6px}',
	'.dd-actions a.cbi-button{display:inline-flex;align-items:center;gap:4px}',
	'body.dark .dd-card,html[data-theme="dark"] .dd-card,html[data-bs-theme="dark"] .dd-card{border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.02)}'
].join('');

function execInit(action) {
	return fs.exec('/etc/init.d/daed', [action]).then(function(res) {
		if (res.code !== 0)
			ui.addNotification(null, E('p', _('Action "%s" failed (exit %d): %s').format(action, res.code, res.stderr || res.stdout || '')), 'danger');
		else
			ui.addNotification(null, E('p', _('Action "%s" succeeded.').format(action)), 'info');
	}).catch(function(e) {
		ui.addNotification(null, E('p', _('Action "%s" error: %s').format(action, e)), 'danger');
	});
}

function fetchStatus() {
	return Promise.all([
		L.resolveDefault(callServiceList('daed'), {}),
		L.resolveDefault(fs.read_direct('/proc/uptime'), '')
	]).then(function(results) {
		const svc = results[0];
		let pid = 0, running = false, startTs = 0;
		try {
			const inst = svc['daed']['instances']['daed'];
			running = !!inst.running;
			pid = inst.pid || 0;
			if (inst.start)
				startTs = inst.start;
		} catch (e) { /* not installed or not started */ }

		let uptime = 0;
		if (running && startTs) {
			const sysUp = parseFloat((results[1] || '').split(' ')[0] || '0');
			// procd "start" is monotonic seconds since boot
			uptime = Math.max(0, Math.floor(sysUp - startTs));
		}
		return { running: running, pid: pid, uptime: uptime };
	});
}

function fmtUptime(sec) {
	if (!sec || sec < 0) return '-';
	const d = Math.floor(sec / 86400);
	const h = Math.floor((sec % 86400) / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	if (d) return '%dd %dh %dm'.format(d, h, m);
	if (h) return '%dh %dm %ds'.format(h, m, s);
	if (m) return '%dm %ds'.format(m, s);
	return '%ds'.format(s);
}

function renderStatusCard(state, listenAddr) {
	const port = (listenAddr || '0.0.0.0:2023').split(':').slice(-1)[0];
	const host = window.location.hostname;
	const badge = state.running
		? E('span', { 'class': 'dd-badge dd-badge-run' }, [ E('span', { 'class': 'dd-badge-dot' }), 'RUNNING' ])
		: E('span', { 'class': 'dd-badge dd-badge-stop' }, [ E('span', { 'class': 'dd-badge-dot' }), 'STOPPED' ]);

	const meta = [];
	if (state.running) {
		if (state.pid)
			meta.push(E('span', { 'class': 'dd-meta' }, [ E('span', { 'class': 'dd-meta-label' }, 'PID'), state.pid ]));
		if (state.uptime > 0)
			meta.push(E('span', { 'class': 'dd-meta' }, [ E('span', { 'class': 'dd-meta-label' }, 'Uptime'), fmtUptime(state.uptime) ]));
	}
	meta.push(E('span', { 'class': 'dd-meta' }, [ E('span', { 'class': 'dd-meta-label' }, 'Listen'), listenAddr || '0.0.0.0:2023' ]));

	const openBtn = E('a', {
		'class': 'cbi-button cbi-button-action',
		'href': 'http://%s:%s'.format(host, port),
		'target': '_blank',
		'rel': 'noreferrer noopener'
	}, _('Open WebUI'));

	const mkBtn = function(label, action, style) {
		const b = E('button', { 'class': 'cbi-button cbi-button-' + style }, label);
		b.addEventListener('click', function(ev) {
			ev.preventDefault();
			b.disabled = true;
			execInit(action).finally(function() { b.disabled = false; });
		});
		return b;
	};

	const actions = state.running
		? [ openBtn, mkBtn(_('Restart'), 'restart', 'positive'), mkBtn(_('Reload'), 'reload', 'neutral'), mkBtn(_('Stop'), 'stop', 'negative') ]
		: [ mkBtn(_('Start'), 'start', 'positive') ];

	return [
		E('div', { 'class': 'dd-status-row' }, [ badge ].concat(meta)),
		E('div', { 'class': 'dd-actions' }, actions)
	];
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('daed')
		]);
	},

	render: function(data) {
		const self = this;
		const listenAddr = uci.get(data[0], 'config', 'listen_addr') || '0.0.0.0:2023';

		const statusBody = E('div', { 'id': 'dd-status-body' }, E('em', {}, _('Collecting data…')));
		const statusCard = E('div', { 'class': 'dd-card' }, [
			E('h4', { 'class': 'dd-card-title' }, _('Service Status')),
			statusBody
		]);

		const refresh = function() {
			return fetchStatus().then(function(state) {
				while (statusBody.firstChild) statusBody.removeChild(statusBody.firstChild);
				renderStatusCard(state, uci.get('daed', 'config', 'listen_addr') || listenAddr)
					.forEach(function(el) { statusBody.appendChild(el); });
			});
		};
		poll.add(refresh);
		refresh();

		let m, s, o;
		m = new form.Map('daed', _('daed'),
			_('A modern dashboard for dae — eBPF-based transparent proxy. Subscriptions, nodes, routing and DNS are managed in the daed WebUI.'));

		// Basic card
		s = m.section(form.NamedSection, 'config', 'daed', _('Basic'));
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'listen_addr', _('Listen Address'),
			_('Host:port that the daed WebUI and GraphQL API listen on.'));
		o.datatype = 'ipaddrport(1)';
		o.default = '0.0.0.0:2023';
		o.rmempty = false;

		// Log card
		s = m.section(form.NamedSection, 'config', 'daed', _('Log'));
		s.addremove = false;

		o = s.option(form.Value, 'log_maxsize', _('Max Log Size (MB)'),
			_('Rotate the log file once it grows past this many megabytes.'));
		o.datatype = 'uinteger';
		o.default = '5';

		o = s.option(form.Value, 'log_maxbackups', _('Max Log Backups'),
			_('Number of rotated log files to keep.'));
		o.datatype = 'uinteger';
		o.default = '1';

		return Promise.resolve(m.render()).then(function(node) {
			return E('div', { 'class': 'dd-wrap' }, [
				E('style', {}, CSS),
				statusCard,
				node
			]);
		});
	}
});
