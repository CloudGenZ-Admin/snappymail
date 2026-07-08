/**
 * White-Label Branding Plugin
 * Sets title, favicon, loading message, logo, and brand colors from server config.
 * Dynamically switches branding on the login page as the user types their email.
 */
(rl => {
	'use strict';
	if (!rl) return;

	function getConfig() {
		try { return rl.settings && rl.settings.get('WhiteLabel'); }
		catch(e) { return null; }
	}

	function getAllClients() {
		try { return rl.settings && rl.settings.get('WhiteLabelClients'); }
		catch(e) { return null; }
	}

	function findClientByEmail(email) {
		const clients = getAllClients();
		if (!clients || !email) return null;

		const parts = email.split('@');
		const domain = parts[1] ? parts[1].toLowerCase() : '';
		if (!domain) return null;

		for (const [id, config] of Object.entries(clients)) {
			const emailDomains = config.emailDomains || [];
			for (const ed of emailDomains) {
				if (ed.toLowerCase() === domain) {
					return config;
				}
			}
		}
		return null;
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
		document.querySelectorAll("link[rel*='icon']").forEach(link => {
			link.href = config.faviconUrl;
		});
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

	function applyFullBranding(config) {
		if (!config) return;
		applyAll(config);
		applyLoginBranding(config);
		applyLoadingMessage(config);
	}

	// Watch email input on login page and switch branding dynamically
	function watchEmailInput() {
		const emailInput = document.querySelector('#V-Login input[type="email"], #V-Login input[name="Email"], #V-Login input[autocomplete="username"]');
		if (!emailInput) return;

		let lastDomain = '';

		emailInput.addEventListener('input', function() {
			const value = emailInput.value || '';
			const parts = value.split('@');
			const domain = parts[1] ? parts[1].toLowerCase() : '';

			if (domain === lastDomain) return;
			lastDomain = domain;

			const matchedClient = findClientByEmail(value);
			if (matchedClient) {
				applyFullBranding(matchedClient);
			} else {
				// Revert to default (domain-based) config
				const defaultConfig = getConfig();
				if (defaultConfig) applyFullBranding(defaultConfig);
			}
		});
	}

	// On login page
	addEventListener('rl-view-model', e => {
		const id = e.detail && e.detail.viewModelTemplateID;
		if ('Login' === id || 'AdminLogin' === id) {
			const config = getConfig();
			if (config) {
				applyFullBranding(config);
			}
			// Start watching email input for dynamic branding
			setTimeout(watchEmailInput, 100);
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
