USE hellcorp;

-- ============================================
-- USERS (passwords are bcrypt hashes)
-- admin123, vendor123, shadow99, buyer123, ghost99, support1
-- ============================================
INSERT INTO users (username, password, email, role, nickname, bio, address, private_key, is_verified, balance) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@hellcorp.onion', 'admin', 'SYSOP', 'HellCorp System Administrator. Root access to all modules.', '666 Void Street, Dark Web', 'sk_live_HC_adm1n_pr1v4t3_k3y_x9z', 1, 999999.99),
('darkvendor', '$2a$10$YRjhEg0xvGe7Y1QhKtC5UuG3jHZwH6b3xj8v2q1ePfMnGk5W0XaKm', 'darkvendor@hellcorp.onion', 'seller', 'DarkVendor', 'Premium exploit developer. 5 years in the game.', '13 Shadow Lane, Darknet City', 'sk_live_HC_v3nd0r_k3y_abc123', 1, 48750.00),
('shadowmerch', '$2a$10$K8jQZPYGz7WxV3hPqM2fXOaR5sT9bN1cD4eF6gH8iJ0kL2mN4oP6', 'shadowmerch@hellcorp.onion', 'seller', 'ShadowMerch', 'Malware architect. Custom builds only.', '0x00 Binary Blvd, Sector 7', 'sk_live_HC_sh4d0w_k3y_def456', 1, 31200.00),
('buyer1', '$2a$10$A1bC2dE3fG4hI5jK6lM7nOoP8qR9sT0uV1wX2yZ3aB4cD5eF6gH7', 'buyer1@protonmail.com', 'buyer', 'CyberGhost', 'Just browsing the dark side.', '42 Anonymous Ave, TorCity', NULL, 1, 5000.00),
('ghostuser', '$2a$10$B2cD3eF4gH5iJ6kL7mN8oOpQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8', 'ghost@tutanota.com', 'buyer', 'admin''--', 'Nothing to see here.', '99 Phantom Road, NullSec', NULL, 0, 1200.00),
('support1', '$2a$10$C3dE4fG5hI6jK7lM8nO9pPqR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9', 'support@hellcorp.onion', 'admin', 'HCSupport', 'HellCorp Support Staff', '666 Void Street, Dark Web', 'sk_live_HC_supp0rt_k3y_ghi789', 1, 0.00);

-- ============================================
-- PRODUCTS (24 items)
-- ============================================
INSERT INTO products (product_id, name, category, tier, price, description, specs, seller_id, is_hidden) VALUES
('HC-001', 'Chrome V8 Type Confusion', 'exploit', 'TIER-S', 24900.00, 'Full chain renderer-to-kernel RCE. Affects Chrome 118-124. Bypasses V8 sandbox, ASLR, and MitigationPolicy. Weaponized shellcode included with comprehensive documentation.', '{"platform":"Windows / macOS","reliability":"94.2%","discovered":"2024-Q3","format":"C++ / Python"}', 2, 0),
('HC-002', 'Phantom Botnet Controller', 'botnet', 'TIER-S', 8400.00, 'Encrypted C2 infrastructure with 40,000 active nodes. DDoS, spam, cryptomining, credential harvest modules. Self-healing mesh topology with automatic failover.', '{"nodes":"40,000+","protocol":"Tor + WireGuard","panel":"React + WebRTC","geo":"Global"}', 2, 0),
('HC-003', 'ShadowCred Harvester', 'malware', 'TIER-A', 1200.00, 'Silent credential stealer targeting 200+ applications. Browser cookies, saved passwords, 2FA seeds, crypto wallets. Fully undetected against all major AV solutions.', '{"targets":"200+ apps","evasion":"Polymorphic","exfil":"HTTPS beacon","persist":"Registry + WMI"}', 3, 0),
('HC-004', 'MedusaPhish Enterprise', 'tool', 'TIER-B', 499.00, 'Adversary-in-the-middle phishing platform. Pre-built kits for 300+ financial institutions. Real-time victim dashboard with automatic TLS provisioning.', '{"templates":"300+","capture":"RT Dashboard","bypass":"Cloudflare / 2FA","deploy":"1-click Docker"}', 2, 0),
('HC-005', 'CVE-2024-4899 Weaponized', 'exploit', 'TIER-S', 31000.00, 'Critical CVSS 9.8 RCE in enterprise VPN appliance. Pre-auth, zero interaction required. Compatible with latest firmware revisions. Full PoC + operational documentation.', '{"cvss":"9.8 CRITICAL","affected":"VPN < 22.7R2","auth":"Pre-auth","payload":"x64 reverse shell"}', 2, 0),
('HC-006', 'Corporate Dump — APAC', 'credential', 'TIER-B', 890.00, '14.2M verified credentials from APAC Fortune 500 breach. Email:password combos, 38% unique across domains. Sorted by organization. Updated Q4 2024.', '{"records":"14.2M","verified":"38%","domains":"1,847","format":"CSV + HLS3"}', 3, 0),
('HC-007', 'Kernel Implant v4', 'malware', 'TIER-S', 18500.00, 'Ring-0 persistence implant for Windows 10-11. BYOVD technique. Survives full disk wipe. Invisible to EDR solutions. Hypervisor-aware, VM-escape capable.', '{"target":"Win 10 / 11","persist":"Ring-0","edr":"Full Bypass","av":"0/72 detections"}', 2, 0),
('HC-008', 'WiFi Capture Suite', 'tool', 'TIER-B', 149.00, 'WPA2/WPA3 handshake capture suite. PMKID attack, evil twin, deauth flood on 5GHz. Ships with Alfa AWUS036ACH compatible firmware and antenna drivers.', '{"protocols":"WPA2 / WPA3","attack":"PMKID / Evil-Twin","range":"500m ext. antenna","format":"Python + C"}', 3, 0),
('HC-009', 'Exchange 0-Day — RCE', 'exploit', 'TIER-S', 42000.00, 'Unpatched Microsoft Exchange RCE. Pre-auth SSRF chain to full remote code execution. Affects on-prem Exchange 2016-2019 latest CU. Operational and fully weaponized.', '{"target":"Exchange 2016-2019","auth":"Pre-auth","chain":"SSRF → RCE","status":"No patch"}', 2, 0),
('HC-010', 'Dark Credential API', 'credential', 'TIER-A', 2400.00, 'Programmatic access to 4.8B leaked credential database. Reverse hash lookup, domain pivot, email-to-password history. 99.9% uptime SLA with rate guarantees.', '{"records":"4.8B","lookup":"Email / Hash / Domain","uptime":"99.9%","rate":"10k RPM"}', 3, 0),
('HC-011', 'PolyRansom Builder', 'malware', 'TIER-S', 12000.00, 'Enterprise ransomware factory. AES-256 + RSA-4096 hybrid encryption with automated double extortion portal. Dark web payment processing with automatic Monero handling.', '{"encryption":"AES-256 + RSA-4096","spread":"SMB worm + phish","payment":"XMR auto","portal":"Hosted .onion"}', 2, 0),
('HC-012', 'iOS Zero-Click Implant', 'malware', 'TIER-S', 35000.00, 'Zero-click iOS 17 implant delivered via iMessage. Full device extraction: messages, location, camera, microphone, all app data. Kernel-level persistence across reboots.', '{"delivery":"Zero-click iMessage","persist":"Kernel level","access":"Full device","mdm":"0/14 detected"}', 2, 0),
('HC-013', 'SCADA Exploit Kit', 'exploit', 'TIER-S', 28500.00, 'Multi-vendor SCADA/ICS exploitation framework targeting Siemens S7, Allen-Bradley, Schneider Modicon. PLC code injection, ladder logic manipulation, and HMI takeover.', '{"vendors":"Siemens, AB, Schneider","protocols":"Modbus, S7comm, EtherIP","targets":"PLC + HMI","stealth":"Passive recon mode"}', 2, 0),
('HC-014', 'Banking Trojan Builder', 'malware', 'TIER-A', 3200.00, 'Modular banking trojan with web injection engine. Targets 450+ financial institutions globally. Automatic form grabbing, VNC hidden desktop, and SMS interception.', '{"targets":"450+ banks","modules":"WebInject, VNC, SMS","evasion":"Code signing","c2":"Fast-flux DNS"}', 3, 0),
('HC-015', 'Social Media Scraper Pro', 'tool', 'TIER-B', 299.00, 'Multi-platform OSINT scraper for Instagram, Twitter/X, LinkedIn, Facebook. Bypasses rate limits and authentication walls. Exports to JSON, CSV with relationship mapping.', '{"platforms":"IG, X, LinkedIn, FB","bypass":"Rate limit evasion","output":"JSON / CSV / Neo4j","speed":"50k profiles/hr"}', 3, 0),
('HC-016', 'Government DB Dump — LATAM', 'credential', 'TIER-A', 4500.00, 'Comprehensive government database dump from 3 LATAM countries. National ID records, tax filings, vehicle registrations. 8.7M records with biometric photo links.', '{"records":"8.7M","countries":"3 LATAM","data":"NatID, Tax, Vehicle","photos":"Biometric linked"}', 3, 0),
('HC-017', 'Android Zero-Day — RCE', 'exploit', 'TIER-S', 19800.00, 'Android 13-14 zero-day achieving full RCE via malicious media file. No user interaction beyond opening MMS. Bypasses SELinux and app sandbox completely.', '{"target":"Android 13-14","vector":"MMS media file","sandbox":"Full bypass","persistence":"System partition"}', 2, 0),
('HC-018', 'DDoS-for-Hire API', 'botnet', 'TIER-A', 1800.00, 'REST API access to 200Gbps+ DDoS infrastructure. Layer 3/4/7 attack vectors. Geographic amplification nodes across 40 countries. Pay-per-attack pricing model.', '{"capacity":"200+ Gbps","layers":"L3/L4/L7","nodes":"40 countries","api":"REST + WebSocket"}', 2, 0),
('HC-019', 'Deepfake Generator Enterprise', 'tool', 'TIER-A', 5500.00, 'Production-grade deepfake video and audio generation. Real-time face swap, voice cloning with 3 seconds of sample audio. Undetectable by current forensic tools.', '{"video":"4K real-time","audio":"3s voice clone","detection":"0% by forensics","gpu":"RTX 3060 min"}', 3, 0),
('HC-020', 'Supply Chain Backdoor Kit', 'malware', 'TIER-S', 22000.00, 'Automated supply chain compromise toolkit. Targets npm, PyPI, Maven repositories. Package typosquatting, dependency confusion, and build pipeline injection.', '{"registries":"npm, PyPI, Maven","methods":"Typosquat, DepConfusion","stealth":"Obfuscated payloads","c2":"DNS-over-HTTPS"}', 2, 0),
('HC-021', 'Healthcare Records — 2.1M', 'credential', 'TIER-A', 6200.00, 'Complete EHR dump from major US healthcare network. Patient PII, medical histories, insurance data, SSNs. HIPAA-grade records with prescription histories.', '{"records":"2.1M patients","data":"EHR, PII, SSN, Insurance","source":"US Healthcare Network","format":"HL7 + CSV"}', 3, 0),
('HC-022', 'Satellite Comms Interceptor', 'tool', 'TIER-S', 15000.00, 'SDR-based satellite communication interceptor. Decodes Inmarsat, Iridium, and VSAT traffic. Real-time monitoring with geolocation tracking of maritime and aviation targets.', '{"satellites":"Inmarsat, Iridium, VSAT","hardware":"SDR + LNA","tracking":"Maritime + Aviation","output":"PCAP + decoded text"}', 2, 0),
('HC-023', 'ATM Jackpotting Firmware', 'exploit', 'TIER-S', 8900.00, 'Custom firmware for NCR and Diebold Nixdorf ATMs. Remote cash-out capability via network access. Includes USB deployment tool and black box attack module.', '{"vendors":"NCR, Diebold Nixdorf","method":"Network + USB + BlackBox","cashout":"Remote trigger","success":"97% tested models"}', 3, 0),
('HC-024', 'Corporate Espionage Suite', 'tool', 'TIER-S', 27500.00, 'Full-spectrum corporate espionage platform. Email intercept, document exfil, meeting recording, and insider threat detection evasion. Used by nation-state actors.', '{"capabilities":"Email, Docs, Audio, Video","evasion":"EDR/DLP bypass","deployment":"Fileless + USB","attribution":"False flag module"}', 2, 0);

-- ============================================
-- SAMPLE ORDERS
-- ============================================
INSERT INTO orders (order_id, user_id, total, status, payment_method) VALUES
('ORD-20240801-001', 4, 24900.00, 'completed', 'XMR'),
('ORD-20240815-002', 4, 1200.00, 'completed', 'BTC'),
('ORD-20240901-003', 5, 499.00, 'pending', 'XMR'),
('ORD-20240915-004', 4, 42000.00, 'escrow', 'XMR'),
('ORD-20241001-005', 5, 149.00, 'completed', 'BTC');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 24900.00),
(2, 3, 1, 1200.00),
(3, 4, 1, 499.00),
(4, 9, 1, 42000.00),
(5, 8, 1, 149.00);

-- ============================================
-- SAMPLE MESSAGES
-- ============================================
INSERT INTO messages (sender_id, recipient_id, subject, body, is_read) VALUES
(2, 4, 'Order Confirmation', 'Your Chrome V8 exploit has been delivered. Check your secure drop.', 1),
(4, 2, 'RE: Order Confirmation', 'Received. Testing now. Will leave review.', 1),
(5, 6, 'Need help with purchase', 'I bought the WiFi suite but the download link is broken. Can you help?', 0),
(1, 4, 'Welcome to HellCorp', 'Welcome, operator. Your Tier-S access has been provisioned. Browse responsibly.', 1);

-- ============================================
-- SAMPLE ANNOUNCEMENTS
-- ============================================
INSERT INTO announcements (admin_id, title, content) VALUES
(1, 'System Maintenance — 2024-10-15', 'HellCorp will undergo scheduled maintenance. All escrow transactions will be paused for 2 hours.'),
(1, 'New Tier System', 'We have introduced Tier-S access for premium operators. Contact support for upgrade.');

-- ============================================
-- SAMPLE SUPPORT TICKETS
-- ============================================
INSERT INTO support_tickets (user_id, subject, description, status) VALUES
(4, 'Download issue', 'Cannot download HC-001 after purchase. Getting 403 error.', 'open'),
(5, 'Account verification', 'How do I get verified? I want seller access.', 'closed');

-- ============================================
-- SAMPLE SELLER NOTES
-- ============================================
INSERT INTO seller_notes (seller_id, product_id, note) VALUES
(2, 1, 'Updated PoC for Chrome 124. Reliability improved to 94.2%.'),
(3, 3, 'New AV bypass module added. 0/72 on VirusTotal.');

-- ============================================
-- SAMPLE DISCOUNT RULES
-- ============================================
INSERT INTO discount_rules (name, formula, created_by) VALUES
('Holiday Sale', 'price * 0.85', 1),
('Bulk Buyer', 'price - (quantity > 3 ? price * 0.1 : 0)', 1);

-- ============================================
-- SAMPLE EMAIL TEMPLATES
-- ============================================
INSERT INTO email_templates (seller_id, template_name, template_content) VALUES
(2, 'Order Confirmation', 'Hello {{ buyer_name }},\n\nYour order for {{ product_name }} has been confirmed.\nOrder ID: {{ order_id }}\n\nThank you for choosing DarkVendor.\n\n- DarkVendor'),
(3, 'Delivery Notice', 'Hi {{ buyer_name }},\n\nYour item {{ product_name }} is ready for pickup at the secure drop.\nAccess code: {{ access_code }}\n\n- ShadowMerch');

-- ============================================
-- SAMPLE PASSWORD RESETS
-- ============================================
INSERT INTO password_resets (user_id, token, email) VALUES
(4, 'a1b2c3d4e5f6g7h8i9j0', 'buyer1@protonmail.com');

-- ============================================
-- SAMPLE SESSIONS (for SQLi extraction)
-- ============================================
INSERT INTO sessions_store (session_id, user_id, token, ip_address, user_agent) VALUES
('sess_adm_001', 1, 'eyJhbGciOiJIUzI1NiJ9.admin.secret_token_do_not_leak', '10.0.0.1', 'Mozilla/5.0 AdminBrowser'),
('sess_sell_001', 2, 'eyJhbGciOiJIUzI1NiJ9.darkvendor.vendor_session_key', '10.0.0.2', 'Mozilla/5.0 SellerClient');
