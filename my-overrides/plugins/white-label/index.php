<?php

/**
 * White-Label Branding Plugin for SnappyMail
 *
 * Provides per-client branding (logo, colors, company name) based on
 * the subdomain or email domain used to access the webmail.
 */
class WhiteLabelPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME        = 'White Label Branding',
		AUTHOR      = 'Custom',
		VERSION     = '1.1',
		RELEASE     = '2024-06-30',
		REQUIRED    = '2.28.0',
		CATEGORY    = 'General',
		LICENSE     = 'MIT',
		DESCRIPTION = 'Dynamic per-client branding based on subdomain or email domain.';

	private ?array $clientsConfig = null;

	public function Init(): void
	{
		$this->addHook('filter.app-data', 'filterAppData');
		$this->addHook('main.content-security-policy', 'adjustCSP');
		$this->addJs('js/white-label.js');
		$this->addCss('css/white-label.css');
	}

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

	private function detectClient(): ?array
	{
		$clients = $this->getClientsConfig();
		$host = \strtolower(\trim($_SERVER['HTTP_HOST'] ?? '', ' \t\n\r\0\x0B'));

		// Remove port if present
		$host = \explode(':', $host)[0];

		// Try exact host match first
		foreach ($clients as $clientId => $config) {
			if ($clientId === 'default') continue;
			if (!is_array($config)) continue;
			$domains = $config['domains'] ?? [];
			foreach ($domains as $domain) {
				if (\strtolower($domain) === $host) {
					return \array_merge(['_id' => $clientId], $config);
				}
			}
		}

		// Try subdomain prefix match
		$parts = \explode('.', $host);
		if (\count($parts) > 2) {
			$subdomain = $parts[0];
			if (isset($clients[$subdomain]) && $subdomain !== 'default') {
				return \array_merge(['_id' => $subdomain], $clients[$subdomain]);
			}
		}

		// Fall back to default
		if (isset($clients['default'])) {
			return \array_merge(['_id' => 'default'], $clients['default']);
		}

		return null;
	}

	private function detectClientByEmail(string $email): ?array
	{
		$clients = $this->getClientsConfig();
		$parts = \explode('@', $email);
		$emailDomain = isset($parts[1]) ? \strtolower($parts[1]) : '';

		if (!$emailDomain) return null;

		foreach ($clients as $clientId => $config) {
			if ($clientId === 'default') continue;
			if (!is_array($config)) continue;
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
	 * Inject client branding into app data — this is available to JS immediately.
	 */
	public function filterAppData(bool $bAdmin, array &$aAppData): void
	{
		$client = $this->detectClient();

		// If user is authenticated, try email domain match too
		if (!$bAdmin && !empty($aAppData['Auth'])) {
			$email = $aAppData['Email'] ?? '';
			if ($email) {
				$emailClient = $this->detectClientByEmail($email);
				if ($emailClient) {
					$client = $emailClient;
				}
			}
		}

		if ($client) {
			$aAppData['WhiteLabel'] = [
				'clientId'       => $client['_id'] ?? 'default',
				'companyName'    => $client['company_name'] ?? '',
				'title'          => $client['title'] ?? ($client['company_name'] ?? ''),
				'logoUrl'        => $client['logo_url'] ?? '',
				'logoWidth'      => $client['logo_width'] ?? '180px',
				'faviconUrl'     => $client['favicon_url'] ?? '',
				'loadingMessage' => $client['loading_message'] ?? '',
				'primaryColor'   => $client['primary_color'] ?? '#18d26e',
				'accentColor'    => $client['accent_color'] ?? '#13a456',
			];
		}

		// Pass all clients for dynamic login branding
		if (!$bAdmin) {
			$allClients = [];
			foreach ($this->getClientsConfig() as $id => $config) {
				if (!is_array($config)) continue;
				$allClients[$id] = [
					'companyName'    => $config['company_name'] ?? '',
					'title'          => $config['title'] ?? ($config['company_name'] ?? ''),
					'logoUrl'        => $config['logo_url'] ?? '',
					'logoWidth'      => $config['logo_width'] ?? '180px',
					'faviconUrl'     => $config['favicon_url'] ?? '',
					'loadingMessage' => $config['loading_message'] ?? '',
					'primaryColor'   => $config['primary_color'] ?? '#18d26e',
					'accentColor'    => $config['accent_color'] ?? '#13a456',
					'emailDomains'   => $config['email_domains'] ?? [],
				];
			}
			$aAppData['WhiteLabelClients'] = $allClients;
		}
	}

	public function adjustCSP(\SnappyMail\HTTP\CSP $oCSP): void
	{
		$client = $this->detectClient();
		if ($client) {
			foreach (['logo_url', 'favicon_url'] as $key) {
				$url = $client[$key] ?? '';
				if ($url && \preg_match('#^https?://([^/]+)#', $url, $m)) {
					$oCSP->add('img-src', 'https://' . $m[1]);
				}
			}
		}
	}

	protected function configMapping(): array
	{
		return [];
	}
}
