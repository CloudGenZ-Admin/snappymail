# CloudGenZ Mail - SnappyMail Customizations

White-label email service based on SnappyMail. This repo only contains customizations — the base app comes from the official SnappyMail release tarball during deployment.

## Structure

```
.github/workflows/deploy.yml    # Auto-deploy to Hostinger on push
my-overrides/
├── plugins/white-label/        # Dynamic branding per client
│   ├── index.php               # Plugin PHP logic
│   ├── clients.json            # Client configurations
│   ├── js/white-label.js       # Frontend branding logic
│   └── css/white-label.css     # Branding CSS
└── snappymail/v/2.38.2/themes/ # Custom themes
    ├── Outlook/                # Light theme (default)
    └── OutlookDark/            # Dark theme
```

## Adding a New Client

Edit `my-overrides/plugins/white-label/clients.json`:

```json
{
    "clientname": {
        "company_name": "Client Name",
        "title": "Client Mail",
        "logo_url": "https://...",
        "favicon_url": "https://...",
        "loading_message": "Loading...",
        "primary_color": "#hexcolor",
        "accent_color": "#hexcolor",
        "domains": ["client.mail.cloudgenz.com"],
        "email_domains": ["client.com"]
    }
}
```

## Deployment

Push to `master` → GitHub Actions auto-deploys to Hostinger via FTP.

After deploy, visit `https://mail.cloudgenz.com/setup-plugins.php` to install/update the plugin, then delete the server cache at `/home/u930449354/snappymail-data/_data_/_default_/cache/`.
