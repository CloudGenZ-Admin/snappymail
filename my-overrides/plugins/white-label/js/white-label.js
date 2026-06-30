/**
 * White-Label Branding - Client-side
 * Reads branding from rl.settings (injected by PHP filter.app-data hook)
 */
(rl => {
	'use strict';
	if (!rl) return;

	function getConfig() {
		try {
			return rl.settings && rl.settings.get('WhiteLabel');
		} catch(e) {
			return null;
		}
	}

	function applyColors(config) {
		if (!config || !config.primaryColor) return;
		const root = document.documentElement;
		root.style.setProperty('--wl-primary-color', config.primaryColor);
		root.style.setProperty('--wl-accent-color', config.accentColor || config.primaryColor);
	}

	function applyLoginBranding(config) {
		if (!config) return;

		// Set login background
		if (config.loginBgColor) {
			document.body.style.background = config.loginBgColor;
			const rlContent = document.getElementById('rl-content');
			if (rlContent) rlContent.style.background = config.loginBgColor;
		}

		// Find the login form container
		const loginView = document.querySelector('#V-Login') || document.querySelector('#V-AdminLogin');
		if (!loginView) return;

		// Insert branding above the form
		let brandEl = document.getElementById('wl-branding');
		if (!brandEl) {
			brandEl = document.createElement('div');
			brandEl.id = 'wl-branding';
			brandEl.className = 'wl-branding-header';
			const form = loginView.querySelector('form');
			if (form) {
				form.insertBefore(brandEl, form.firstChild);
			}
		}

		let html = '';
		if (config.logoUrl) {
			html += '<img src="' + config.logoUrl + '" alt="' + (config.companyName || '') + '" class="wl-logo" style="max-width:' + (config.logoWidth || '180px') + ';height:auto;">';
		}
		if (config.companyName) {
			html += '<div class="wl-company-name">' + config.companyName + '</div>';
		}
		if (html) {
			brandEl.innerHTML = html;
		}

		// Update title
		if (config.companyName) {
			document.title = config.companyName;
		}

		// Update favicon
		if (config.faviconUrl) {
			const link = document.querySelector("link[rel*='icon']");
			if (link) link.href = config.faviconUrl;
		}
	}

	function applyAppBranding(config) {
		if (!config) return;
		if (config.companyName) {
			document.title = config.companyName;
		}
		if (config.faviconUrl) {
			const link = document.querySelector("link[rel*='icon']");
			if (link) link.href = config.faviconUrl;
		}
	}

	// When Login view renders
	addEventListener('rl-view-model', e => {
		const id = e.detail && e.detail.viewModelTemplateID;
		if ('Login' === id || 'AdminLogin' === id) {
			const config = getConfig();
			if (config) {
				applyColors(config);
				applyLoginBranding(config);
			}
		}
	});

	// When main screen shows
	addEventListener('sm-show-screen', () => {
		const config = getConfig();
		if (config) {
			applyColors(config);
			applyAppBranding(config);
		}
	});

	// After successful login
	addEventListener('sm-user-login-response', e => {
		if (e.detail && !e.detail.error) {
			setTimeout(() => {
				const config = getConfig();
				if (config) {
					applyColors(config);
					applyAppBranding(config);
				}
			}, 300);
		}
	});

})(window.rl);
