// LDAP Directory Server (simulated corporate directory)
// Uses ldapjs to create an in-process LDAP server for admin authentication
const ldap = require('ldapjs');

const LDAP_PORT = 1389;
const BASE_DN = 'dc=hellcorp,dc=com';

// Simulated LDAP directory entries
const DIRECTORY = [
  {
    dn: `cn=sysadmin,ou=admins,${BASE_DN}`,
    attributes: {
      cn: 'sysadmin',
      uid: 'sysadmin',
      sn: 'Admin',
      givenName: 'System',
      mail: 'sysadmin@hellcorp.onion',
      userPassword: 'ldap_pass',
      objectclass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
      title: 'System Administrator',
      departmentNumber: 'IT-SEC'
    }
  },
  {
    dn: `cn=j.smith,ou=staff,${BASE_DN}`,
    attributes: {
      cn: 'j.smith',
      uid: 'j.smith',
      sn: 'Smith',
      givenName: 'John',
      mail: 'j.smith@hellcorp.onion',
      userPassword: 'smith123',
      objectclass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
      title: 'Senior Developer',
      departmentNumber: 'DEV'
    }
  },
  {
    dn: `cn=hc_support,ou=staff,${BASE_DN}`,
    attributes: {
      cn: 'hc_support',
      uid: 'hc_support',
      sn: 'Support',
      givenName: 'HC',
      mail: 'support@hellcorp.onion',
      userPassword: 'sup789',
      objectclass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
      title: 'Support Lead',
      departmentNumber: 'SUPPORT'
    }
  },
  {
    dn: `cn=flag_user,ou=hidden,${BASE_DN}`,
    attributes: {
      cn: 'flag_user',
      uid: 'flag_user',
      sn: 'Flag',
      givenName: 'Hidden',
      mail: 'flag@hellcorp.onion',
      userPassword: 'flag{ldap_3num3r4t10n}',
      objectclass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
      title: 'Hidden Account',
      departmentNumber: 'SECRET',
      description: 'This account contains sensitive infrastructure credentials'
    }
  },
  {
    dn: `cn=backup_admin,ou=admins,${BASE_DN}`,
    attributes: {
      cn: 'backup_admin',
      uid: 'backup_admin',
      sn: 'Backup',
      givenName: 'Admin',
      mail: 'backup@hellcorp.onion',
      userPassword: 'b4ckup_4dm1n_2024',
      objectclass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
      title: 'Backup Administrator',
      departmentNumber: 'IT-OPS'
    }
  }
];

function startLdap() {
  const server = ldap.createServer();

  // Allow anonymous bind (common misconfiguration)
  server.bind(BASE_DN, (req, res, next) => {
    res.end();
    return next();
  });

  // Search handler — returns matching entries
  server.search(BASE_DN, (req, res, next) => {
    DIRECTORY.forEach(entry => {
      try {
        if (req.filter.matches(entry.attributes)) {
          res.send({
            dn: entry.dn,
            attributes: entry.attributes
          });
        }
      } catch (e) {
        // Filter parse errors are silently ignored
      }
    });
    res.end();
    return next();
  });

  server.listen(LDAP_PORT, () => {
    console.log(`[LDAP] Directory server listening on ldap://localhost:${LDAP_PORT}`);
    console.log(`[LDAP] Base DN: ${BASE_DN}`);
    console.log(`[LDAP] ${DIRECTORY.length} entries loaded`);
  });

  return server;
}

module.exports = { startLdap, DIRECTORY, BASE_DN };
