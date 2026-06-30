<?php

/**
 * White-Label Branding Plugin for SnappyMail
 *
 * Provides per-client branding (logo, colors, company name) based on
 * the subdomain or email domain used to access the webmail.
 *
 * Client configurations are stored in clients.json in this plugin's directory.
 */
class WhiteLabelPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME        = 'White Label Branding',
		AUTHOR      = 'Custom',
		VERSION     = '1.0',
		RELEASE     = '2024-01-01',
		REQUIRED    = '2.28.0',
		CATEGORY    = 'General',
		LICENSE     = 'MIT',
		DESCRIPTION = 'Dynamic per-client branding based on subdomain or email domain. Supports custom logos, colors, and company names for white-label email service.';

	private ?array $clientsConfig = null;

	public function Init(): void
	{
		$this->addHook('filter.app-data', 'filterAppData');
		$this->addHook('main.content-security-policy', 'adjustCSP');
		$this->addJs('js/white-label.js');
		$this->addCss('css/white-label.css');
		$this->addPartHook('white-label-config', 'serviceClientConfig');
	}

	/**
	 * Load all client configurations from the JSON file.
	 */
	private function getClientsConfig(): array
	{
		if ($this->clientsConfig === null) {
			$configFile = __DIR__ . '/clients.json';
			if (\file_exists($configFile)) {
				$json = \file_get_contents($configFile);
				$this->clientsConfig = \json_decode($json, true) ?: [];
			} else {
				$this->clientsConfig = [];
			}
		}
		return $this->clientsConfig;
	}

	/**
	 * Detect the current client based on the HTTP host (subdomain matching).
	 * Falls back to 'default' config if no match.
	 */
	private function detectClient(): ?array
	{
		$clients = $this->getClientsConfig();
		$host = \strtolower($_SERVER['HTTP_HOST'] ?? '');

		// Try exact host match first
		foreach ($clients as $clientId => $config) {
			if ($clientId === 'default') continue;
			$domains = $config['domains'] ?? [];
			foreach ($domains as $domain) {
				if (\strtolower($domain) === $host) {
					return \array_merge(['_id' => $clientId], $config);
				}
			}
		}

		// Try subdomain prefix match (e.g., "clientA.mail.example.com" matches clientA)
		$parts = \explode('.', $host);
		if (\count($parts) > 2) {
			$subdomain = $parts[0];
			if (isset($clients[$subdomain])) {
				return \array_merge(['_id' => $subdomain], $clients[$subdomain]);
			}
		}

		// Fall back to default
		if (isset($clients['default'])) {
			return \array_merge(['_id' => 'default'], $clients['default']);
		}

		return null;
	}

	/**
	 * Detect client from email domain (used post-login).
	 */
	private function detectClientByEmail(string $email): ?array
	{
		$clients = $this->getClientsConfig();
		$emailDomain = \strtolower(\explode('@', $email)[1] ?? '');

		if (!$emailDomain) return null;

		foreach ($clients as $clientId => $config) {
			if ($clientId === 'default') continue;
			$emailDomains = $config['email_domains'] ?? [];
			foreach ($emailDomains as $domain) {
				if (\strtolower($domain) === $emailDomain) {
					return \array_merge(['_id' => $clientId], $config);
				}
			}
		}

		return null;
	}

	/**
	 * Inject client branding data into the app data sent to the browser.
	 */
	public function filterAppData(bool $bAdmin, array &$aAppData): void
	{
		$client = $this->detectClient();

		// If user is authenticated, try to match by email domain too
		if (!$bAdmin && !empty($aAppData['Auth'])) {
			$email = $aAppData['Email'] ?? '';
			$emailClient = $this->detectClientByEmail($email);
			if ($emailClient) {
				$client = $emailClient;
			}
		}

		if ($client) {
			// Expose branding data to JavaScript
			$aAppData['WhiteLabel'] = [
				'clientId'     => $client['_id'],
				'companyName'  => $client['company_name'] ?? '',
				'logoUrl'      => $client['logo_url'] ?? '',
				'logoWidth'    => $client['logo_width'] ?? '200px',
				'faviconUrl'   => $client['favicon_url'] ?? '',
				'primaryColor' => $client['primary_color'] ?? '#0078d4',
				'accentColor'  => $client['accent_color'] ?? '#106ebe',
				'loginBg'      => $client['login_background'] ?? '',
				'loginBgColor' => $client['login_bg_color'] ?? '',
				'darkMode'     => $client['dark_mode'] ?? false,
			];
		}
	}

	/**
	 * Serve client config as a JSON endpoint for the JS to fetch on page load.
	 * This is needed because filter.app-data fires after the page shell loads,
	 * but we want branding visible immediately on the login page.
	 */
	public function serviceClientConfig(): bool
	{
		\header('Content-Type: application/json; charset=utf-8');
		\header('Cache-Control: public, max-age=300');

		$client = $this->detectClient();
		echo \json_encode($client ?: ['_id' => 'default']);
		return true;
	}

	/**
	 * Allow external logo images in CSP.
	 */
	public function adjustCSP(\SnappyMail\HTTP\CSP $oCSP): void
	{
		$client = $this->detectClient();
		if ($client) {
			$logoUrl = $client['logo_url'] ?? '';
			$faviconUrl = $client['favicon_url'] ?? '';
			foreach ([$logoUrl, $faviconUrl] as $url) {
				if ($url && \preg_match('#^https?://([^/]+)#', $url, $m)) {
					$oCSP->add('img-src', 'https://' . $m[1]);
				}
			}
		}
	}

	protected function configMapping(): array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance('enabled')
				->SetLabel('Enable White-Label Branding')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(true)
				->SetAllowedInJs(true),
		];
	}
}
