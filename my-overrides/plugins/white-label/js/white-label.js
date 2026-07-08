/**
 * White-Label Branding Plugin
 * Sets title, favicon, loading message, logo, and brand colors from server config.
 * Dynamically switches branding on the login page as the user types their email.
 * On login page: no branding shown until email domain matches a client.
 */
(rl => {
	'use strict';
	if (!rl) return;

	const originalTitle = document.title;
	const originalFavicons = [];

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

	function saveOriginalFavicons() {
		if (originalFavicons.length) return;
		document.querySelectorAll("link[rel*='icon']").forEach(link => {
			originalFavicons.push({ el: link, href: link.href });
		});
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

	function clearColors() {
		const root = document.documentElement;
		root.style.removeProperty('--wl-primary-color');
		root.style.removeProperty('--wl-primary-button');
		root.style.removeProperty('--wl-accent-color');
	}

	function applyTitle(config) {
		if (!config) return;
		if (config.title) {
			document.title = config.title;
		} else if (config.companyName) {
			document.title = config.companyName;
		}
	}

	function resetTitle() {
		document.title = 'Webmail';
	}

	function applyFavicon(config) {
		if (!config || !config.faviconUrl) return;
		document.querySelectorAll("link[rel*='icon']").forEach(link => {
			link.href = config.faviconUrl;
		});
		const apple = document.querySelector("link[rel='apple-touch-icon']");
		if (apple) apple.href = config.faviconUrl;
	}

	function resetFavicon() {
		originalFavicons.forEach(item => {
			item.el.href = item.href;
		});
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

	function clearLoginBranding() {
		const brandEl = document.getElementById('wl-branding');
		if (brandEl) brandEl.innerHTML = '';
	}

	function applyAppBranding(config) {
		if (!config) return;
		const root = document.documentElement;

		if (config.companyName) {
			root.style.setProperty('--wl-company-name', "'" + config.companyName + "'");
		}
		if (config.logoUrl) {
			root.style.setProperty('--wl-logo-bg', "url('" + config.logoUrl + "') no-repeat left center");
		}
	}

	function applyAll(config) {
		if (!config) return;
		applyColors(config);
		applyTitle(config);
		applyFavicon(config);
		applyAppBranding(config);
	}

	function applyFullLoginBranding(config) {
		if (!config) return;
		applyColors(config);
		applyTitle(config);
		applyFavicon(config);
		applyLoginBranding(config);
	}

	function clearFullLoginBranding() {
		clearColors();
		resetTitle();
		resetFavicon();
		clearLoginBranding();
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
				applyFullLoginBranding(matchedClient);
			} else {
				// No match — clear all branding
				clearFullLoginBranding();
			}
		});
	}

	// On login page — don't apply any branding by default, just watch for input
	addEventListener('rl-view-model', e => {
		const id = e.detail && e.detail.viewModelTemplateID;
		if ('Login' === id || 'AdminLogin' === id) {
			saveOriginalFavicons();
			resetTitle();
			// Start watching email input for dynamic branding
			setTimeout(watchEmailInput, 100);
		}
	});

	// On main screen (after login)
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
