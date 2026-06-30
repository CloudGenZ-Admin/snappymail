/**
 * White-Label Branding - Client-side JavaScript
 *
 * Applies dynamic branding (logo, colors, company name) based on
 * the configuration injected by the PHP plugin via filter.app-data
 * or fetched from the /?white-label-config endpoint.
 */
(rl => {
	'use strict';

	if (!rl) return;

	/**
	 * Apply CSS custom properties for client branding colors.
	 */
	function applyBrandingColors(config) {
		if (!config) return;

		const root = document.documentElement;
		const primaryColor = config.primaryColor || config.primary_color;
		const accentColor = config.accentColor || config.accent_color;

		if (primaryColor) {
			root.style.setProperty('--wl-primary-color', primaryColor);
			// Override key theme variables with brand color
			root.style.setProperty('--link-color', primaryColor);
			root.style.setProperty('--folders-selected-color', primaryColor);
			root.style.setProperty('--folders-focused-color', primaryColor);
			root.style.setProperty('--settings-menu-selected-color', primaryColor);
			root.style.setProperty('--unread-count-color', primaryColor);
			root.style.setProperty('--input-focus-border-clr', primaryColor);
			root.style.setProperty('--tab-hover-border-clr', primaryColor);
			root.style.setProperty('--spinner-color', primaryColor);
			root.style.setProperty('--loading-color', primaryColor);
		}

		if (accentColor) {
			root.style.setProperty('--wl-accent-color', accentColor);
		}
	}

	/**
	 * Apply logo and company name to the login page.
	 */
	function applyLoginBranding(config) {
		if (!config) return;

		const logoUrl = config.logoUrl || config.logo_url;
		const companyName = config.companyName || config.company_name;
		const loginBg = config.loginBg || config.login_background;
		const loginBgColor = config.loginBgColor || config.login_bg_color;

		// Set login page background
		if (loginBgColor) {
			const rlContent = document.getElementById('rl-content');
			if (rlContent) {
				rlContent.style.background = loginBgColor;
			}
			document.body.style.background = loginBgColor;
		}
		if (loginBg) {
			const rlContent = document.getElementById('rl-content');
			if (rlContent) {
				rlContent.style.background = loginBg;
			}
		}

		// Replace or add logo above the login form
		const loginForm = document.querySelector('#V-Login form') ||
		                   document.querySelector('#V-Login');
		if (!loginForm) return;

		// Find or create the branding container
		let brandingEl = document.getElementById('wl-branding');
		if (!brandingEl) {
			brandingEl = document.createElement('div');
			brandingEl.id = 'wl-branding';
			brandingEl.style.cssText = 'text-align:center;margin-bottom:24px;';
			const loginBox = loginForm.closest('.LoginView') || loginForm.parentElement;
			if (loginBox) {
				loginBox.insertBefore(brandingEl, loginBox.firstChild);
			}
		}

		let html = '';
		if (logoUrl) {
			const logoWidth = config.logoWidth || config.logo_width || '200px';
			html += `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(companyName || 'Logo')}" `
			      + `style="max-width:${escapeHtml(logoWidth)};height:auto;margin-bottom:12px;" `
			      + `class="wl-logo">`;
		}
		if (companyName) {
			html += `<h2 class="wl-company-name" style="margin:0 0 8px;font-weight:600;font-size:20px;color:inherit;">`
			      + `${escapeHtml(companyName)}</h2>`;
		}
		if (html) {
			brandingEl.innerHTML = html;
		}

		// Update page title
		if (companyName) {
			document.title = companyName + ' - Mail';
		}

		// Update favicon if provided
		const faviconUrl = config.faviconUrl || config.favicon_url;
		if (faviconUrl) {
			let link = document.querySelector("link[rel*='icon']");
			if (link) {
				link.href = faviconUrl;
			}
		}
	}

	/**
	 * Apply branding after login (in the main app view).
	 */
	function applyAppBranding(config) {
		if (!config) return;

		const companyName = config.companyName || config.company_name;
		const logoUrl = config.logoUrl || config.logo_url;

		// Update title
		if (companyName) {
			document.title = companyName + ' - Mail';
		}

		// Update favicon
		const faviconUrl = config.faviconUrl || config.favicon_url;
		if (faviconUrl) {
			let link = document.querySelector("link[rel*='icon']");
			if (link) {
				link.href = faviconUrl;
			}
		}

		// Optionally replace the SnappyMail logo in settings
		if (logoUrl) {
			const settingsLogo = document.querySelector('#V-Settings-About .rl-logo');
			if (settingsLogo) {
				settingsLogo.src = logoUrl;
				settingsLogo.style.filter = 'none';
			}
		}
	}

	/**
	 * HTML escape utility.
	 */
	function escapeHtml(str) {
		if (!str) return '';
		const div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	/**
	 * Fetch branding config immediately on page load (before app-data arrives).
	 * This ensures the login page shows branding without delay.
	 */
	function fetchAndApplyBranding() {
		fetch('/?white-label-config', { credentials: 'same-origin' })
			.then(r => r.json())
			.then(config => {
				if (config && config._id) {
					window.__wlConfig = config;
					applyBrandingColors(config);
				}
			})
			.catch(() => {});
	}

	// Fetch config immediately
	fetchAndApplyBranding();

	// Apply branding when the Login view is rendered
	addEventListener('rl-view-model', e => {
		const id = e.detail && e.detail.viewModelTemplateID;
		if ('Login' === id || 'AdminLogin' === id) {
			// Try from app-data first (available if filter.app-data ran)
			const appData = rl.settings && rl.settings.get && rl.settings.get('WhiteLabel');
			const config = appData || window.__wlConfig;
			if (config) {
				applyBrandingColors(config);
				applyLoginBranding(config);
			} else {
				// Retry after a short delay in case fetch hasn't completed
				setTimeout(() => {
					const c = window.__wlConfig;
					if (c) {
						applyBrandingColors(c);
						applyLoginBranding(c);
					}
				}, 300);
			}
		}
	});

	// Apply branding when the main mailbox screen loads
	addEventListener('sm-show-screen', e => {
		const config = (rl.settings && rl.settings.get && rl.settings.get('WhiteLabel'))
		            || window.__wlConfig;
		if (config) {
			applyBrandingColors(config);
			applyAppBranding(config);
		}
	});

	// Also respond to successful login
	addEventListener('sm-user-login-response', e => {
		if (e.detail && !e.detail.error) {
			setTimeout(() => {
				const config = (rl.settings && rl.settings.get && rl.settings.get('WhiteLabel'))
				            || window.__wlConfig;
				if (config) {
					applyBrandingColors(config);
					applyAppBranding(config);
				}
			}, 500);
		}
	});

})(window.rl);
