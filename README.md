![HellCorp Banner](./Image/Banner.png)

<h1 align="center">HellCorp Global Enterprise (HGE)</h1>

<p align="center">
  <img src="https://img.shields.io/badge/PROJECT-HELLCORP-c0392b?style=for-the-badge" />
  <img src="https://img.shields.io/badge/SECURITY-RESEARCH-black?style=for-the-badge" />
  <img src="https://img.shields.io/badge/ENVIRONMENT-DOCKER-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/STATUS-ACTIVE-success?style=for-the-badge" />
</p>

<p align="center">
  <b>A Realistic Enterprise-Grade Vulnerable Environment for Advanced Web Application Penetration Testing, Exploit Development, and Security Research.</b>
</p>

---

## 01. Project Overview

**HellCorp Global Enterprise (HGE)** is an intentionally vulnerable, enterprise-inspired web application designed to simulate the complexity of a modern corporate ERP ecosystem.

Unlike conventional CTF environments that focus on isolated vulnerabilities, HGE introduces interconnected business logic flaws, multi-layered attack surfaces, and realistic exploitation scenarios.

The platform provides security researchers and penetration testers with a dedicated environment to investigate, exploit, and understand vulnerabilities commonly encountered in enterprise applications.

### Core Objectives

- Simulate realistic enterprise application architecture.
- Expose complex authorization and business logic vulnerabilities.
- Demonstrate advanced exploitation techniques and attack chains.
- Provide hands-on experience with modern web security assessments.
- Develop practical offensive security and vulnerability analysis skills.

> **Security Notice:** HGE contains deliberately introduced security vulnerabilities. It is intended exclusively for authorized educational research and isolated laboratory environments. Never expose this application to public networks or production infrastructure.

---

## 02. Quick Start & Deployment

Deploy the complete HGE environment using Docker Compose.

### Prerequisites

| Requirement | Purpose |
|---|---|
| Kali Linux / Debian | Host operating system |
| Docker | Container runtime |
| Docker Compose | Multi-container orchestration |
| Git | Repository management |
| Python 3 | Health-check utilities |

### Step 1 — Clone Repository

```bash
git clone https://github.com/project-hellhound-org/HellCorp.git
cd HellCorp
```

### Step 2 — Initialize Environment

Execute the initialization script to configure environment variables and generate application secrets.

```bash
chmod +x init-setup.sh
./init-setup.sh
```

### Step 3 — Build & Deploy

Build the application images and launch the complete infrastructure stack.

```bash
docker-compose up --build -d
```

### Step 4 — Access Management Console

Once the containers are running, access the application through your browser.

```text
http://localhost:3000
```

### Step 5 — Verify Deployment

Execute the health-check utility to verify the availability of application components and configured services.

```bash
python tools/healthcheck.py
```

---

## 03. System Architecture

HGE implements a distributed, multi-stack architecture that represents a modern enterprise application ecosystem.

| Component | Technology | Responsibility |
|---|---|---|
| Management Console | Node.js / Express | API Gateway & Business Logic |
| Enterprise Dashboard | Vanilla JS / CSS3 | Corporate Management Interface |
| Primary Data Lake | MongoDB 6.0 | Personnel, Financial & Asset Storage |
| Global Event Bus | Redis 7.0 | Session Management & Messaging |
| R&D Analytics | Python / Flask | Analytics & Reporting |
| Legacy Wiki | PHP 8.2 | Internal Documentation & Legacy Storage |

### Architecture Highlights

- Distributed application components.
- Multiple backend technologies and service interfaces.
- Database-driven enterprise workflows.
- Session-based authentication and authorization.
- Interconnected internal services.
- Simulated corporate infrastructure.

---

## 04. Vulnerability Landscape

HGE incorporates multiple intentionally vulnerable components across different security domains, providing opportunities to investigate individual vulnerabilities and chained exploitation paths.

### 4.1 Access Control & Authorization

| Vulnerability | Attack Surface |
|---|---|
| IDOR | Personnel Records & Financial Transactions |
| Broken Access Control | Unauthorized Resource Access |
| Privilege Escalation | Administrative Functionality |
| JWT Manipulation | Authentication & Token Validation |

### 4.2 Data Integrity & Application Logic

| Vulnerability | Attack Surface |
|---|---|
| NoSQL Injection | Authentication & Database Queries |
| Prototype Pollution | Object Manipulation & Application Logic |
| Mass Assignment | Asset Provisioning & Object Updates |
| Business Logic Flaws | Enterprise Workflows & Transactions |

### 4.3 Infrastructure & Server-Side Execution

| Vulnerability | Attack Surface |
|---|---|
| SSRF | Internal Infrastructure Monitoring |
| OS Command Injection | Diagnostic Utilities |
| XXE | R&D Reporting Engine |
| SSTI | Project Preview Engine |
| Remote Code Execution | Vulnerable Server-Side Components |

---

## 05. Research & Testing Environment

HGE is designed around a no-hint research methodology, encouraging independent vulnerability discovery and systematic attack-surface analysis.

### Recommended Research Areas

- Application reconnaissance and endpoint enumeration.
- Authentication and authorization assessments.
- API security testing.
- Database injection analysis.
- Server-side request manipulation.
- Insecure deserialization and object manipulation.
- Server-side template injection.
- Infrastructure exposure and service pivoting.
- Multi-stage vulnerability chaining.

### CTF Mechanics

| Parameter | Configuration |
|---|---|
| Flag Format | `HC{...}` |
| Environment | Isolated Enterprise Lab |
| Starting Points | Personnel Search / Financial Ledger |
| Challenge Style | Black-Box Security Assessment |
| Research Approach | Manual Discovery & Exploitation |

---

## 06. Application Navigation

### Management Console

Access the HGE dashboard through:

```text
http://localhost:3000
```

Authentication and authorization mechanisms form part of the security assessment surface.

### Infrastructure Terminal

The dashboard includes a simulated infrastructure terminal for inspecting operational activity and application events.

Researchers can investigate system messages, application logs, and security-related indicators to identify potential attack paths.

### Diagnostic Utilities

Run the provided health-check utility:

```bash
python tools/healthcheck.py
```

Use the output to verify service availability and troubleshoot deployment issues.

---

## 07. Manual Installation & Configuration

For environments where Docker deployment is unavailable, HGE supports manual service provisioning.

### System Requirements

- Node.js 18+
- MongoDB 6+
- Redis 7+
- Python 3
- PHP 8.2
- Nginx / PHP-FPM

### Step 1 — Configure Environment

```bash
cp .env.example .env
```

Configure the required database connections, service endpoints, and application secrets in the `.env` file.

### Step 2 — Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3 — Initialize Database

Execute the database seeding process to provision enterprise users and challenge flags.

```bash
npm run seed
```

### Step 4 — Start Backend

```bash
npm run dev
```

Backend API:

```text
http://localhost:3001
```

### Step 5 — Start Supporting Services

**R&D Analytics**

```bash
python services/analytics/app.py
```

Service Port: `5005`

**Legacy Wiki**

Configure PHP-FPM and Nginx.

Service Port: `8085`

---

## 08. Technology Stack

| Category | Technologies |
|---|---|
| Backend | Node.js, Express |
| Frontend | JavaScript, HTML5, CSS3 |
| Database | MongoDB |
| Caching & Messaging | Redis |
| Analytics | Python, Flask |
| Legacy Services | PHP, Nginx |
| Infrastructure | Docker, Docker Compose |
| Testing | Python Utilities, Security Testing Tools |

---

## 09. Security & Responsible Usage

HGE is developed exclusively for controlled security research, cybersecurity education, and authorized penetration testing exercises.

**Important Security Considerations:**

- Do not deploy HGE on production infrastructure.
- Do not expose vulnerable services to public networks.
- Use isolated Docker networks or dedicated virtual machines.
- Never reuse production credentials or sensitive information.
- Restrict access to the laboratory environment.
- Reset the environment after completing research activities.

The project authors assume no responsibility for unauthorized deployment, misuse, or damage resulting from improper configuration.

---

## 10. Project Credits

<p align="center">
  <img src="https://img.shields.io/badge/Develop-ALPH4_X3-c0392b?style=for-the-badge" alt="Develop ALPH4_X3" />
</p>

<p align="center">
  <b>Built by Project Hellhound</b>
  <br/>
  Part of the <a href="https://github.com/project-hellhound-org">Project Hellhound</a> Security Research Ecosystem.
</p>
