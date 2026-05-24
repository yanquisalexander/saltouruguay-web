#!/usr/bin/env node
const { execSync } = require('child_process');

function getGitUser() {
    try {
        return execSync('git config user.name', { encoding: 'utf8' }).trim();
    } catch (e) {
        return null;
    }
}

function main() {
    const args = process.argv.slice(2);
    const paths = args.length ? args : [];
    const gitUser = getGitUser();

    const prohibitedPattern = /SaltoUruguayServer/i;
    const dbPaths = ['src/db/', 'src/db/schema.ts'];

    const touchesDb = paths.some(p => dbPaths.some(dp => p.includes(dp)));

    if (gitUser && prohibitedPattern.test(gitUser) && touchesDb) {
        console.error('ERROR: Según la política del agente, el autor git "%s" tiene prohibido modificar archivos relacionados con la DB.', gitUser);
        console.error('Archivos detectados en la lista:');
        paths.filter(p => dbPaths.some(dp => p.includes(dp))).forEach(p => console.error(' - %s', p));
        console.error('\nSolución: crea una especificación de alto nivel y solicita revisión humana.');
        process.exit(1);
    }

    // Si no hay coincidencias, imprimimos OK
    console.log('OK: comprobación de prohibición DB pasada.');
    process.exit(0);
}

if (require.main === module) main();
