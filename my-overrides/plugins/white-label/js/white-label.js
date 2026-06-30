/**
 * White-Label Branding Plugin
 * Sets title, favicon, loading message, logo, and brand colors from server config
 */
(rl => {
	'use strict';
	if (!rl) return;

	function getConfig() {
		try { return rl.settings && rl.settings.get('WhiteLabel'); }
		catch(e) { return null; }
	}

	function applyColors(config) {
		if (!config) return;
		const root = document.documentElement;
		if (config.primaryColor) {
			root.style.setProperty('--wl-primary-color', config.primaryColor);
			root.style.setProperty('--wl-primary-button', config.primaryColor);
		}
		if (config.accentColor) {
			root.style.setProperty('--wl-accent-color', config.accentColor);
		}
	}

	function applyTitle(config) {
		if (!config) return;
		if (config.title) {
			document.title = config.title;
		} else if (config.companyName) {
			document.title = config.companyName;
		}
	}

	function applyFavicon(config) {
		if (!config || !config.faviconUrl) return;
		// Update all favicon links
		document.querySelectorAll("link[rel*='icon']").forEach(link => {
			link.href = config.faviconUrl;
		});
		// Also set apple-touch-icon
		const apple = document.querySelector("link[rel='apple-touch-icon']");
		if (apple) apple.href = config.faviconUrl;
	}

	function applyLoadingMessage(config) {
		if (!config || !config.loadingMessage) return;
		const el = document.getElementById('rl-loading-desc');
		if (el) el.textContent = config.loadingMessage;
	}

	function applyLoginBranding(config) {
		if (!config) return;
		const loginView = document.querySelector('#V-Login') || document.querySelector('#V-AdminLogin');
		if (!loginView) return;

		// Insert branding above the form
		let brandEl = document.getElementById('wl-branding');
		if (!brandEl) {
			brandEl = document.createElement('div');
			brandEl.id = 'wl-branding';
			const form = loginView.querySelector('form');
			if (form) form.insertBefore(brandEl, form.firstChild);
		}

		let html = '';
		if (config.logoUrl) {
			html += '<img src="' + config.logoUrl + '" alt="' + (config.companyName || '') + '" style="max-width:' + (config.logoWidth || '180px') + ';height:auto;display:block;margin:0 auto 12px;">';
		}
		if (config.companyName) {
			html += '<div style="text-align:center;font-size:20px;font-weight:700;margin-bottom:24px;color:inherit;">' + config.companyName + '</div>';
		}
		if (html) brandEl.innerHTML = html;
	}

	function applyAll(config) {
		if (!config) return;
		applyColors(config);
		applyTitle(config);
		applyFavicon(config);
	}

	// On login page
	addEventListener('rl-view-model', e => {
		const id = e.detail && e.detail.viewModelTemplateID;
		if ('Login' === id || 'AdminLogin' === id) {
			const config = getConfig();
			if (config) {
				applyAll(config);
				applyLoginBranding(config);
				applyLoadingMessage(config);
			}
		}
	});

	// On main screen
	addEventListener('sm-show-screen', () => {
		const config = getConfig();
		if (config) applyAll(config);
	});

	// After login
	addEventListener('sm-user-login-response', e => {
		if (e.detail && !e.detail.error) {
			setTimeout(() => {
				const config = getConfig();
				if (config) applyAll(config);
			}, 300);
		}
	});

})(window.rl);
