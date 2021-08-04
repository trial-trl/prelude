#!/usr/bin/env node

let fs           = require('fs-extra');
let argv         = require('minimist')(process.argv.slice(2));
let colors       = require('colors');
let inquirer     = require('inquirer');
let package      = __dirname;
let cwd          = process.cwd();
let apimConfig   = null;
let operation    = argv._[0] ?? '';
let version      = argv._[1] ?? '';
let childProcess = require('child_process');

(function() {
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();

let child = childProcess.spawn('gulp', ['serve'], {
    stdio: 'inherit',
    cwd: package,
    shell: true,
    env: {
        ...process.env,
        REAL_CWD: cwd
    }
});

child.on('error', function (err) {
    throw err
});

child.on('close', function (code) {
    console.log(code)
});

child.on('data', function (code) {
    console.log(code)
});

try {
    switch (operation) {
        case 'init':
            init();
            return;
        case 'help':
            help();
            return;
    }

    loadConfig();

    switch (operation) {
        case 'list':
            list();
            break;
        default:
            if (operation !== '') {
                console.log(colors.red('Unknown command \'' + operation + '\''));
            }
            help();
    }
} catch (err) {
    console.error(colors.red(err.message));
}

function help() {
    let cli = 'apim';
    let opt_file = '{openapi}'.bold;
    let opt_base = '--base={version}'.gray;
    console.log('Usage: ' + cli + ' ' + '{operation} '.bold + opt_file + ' ['.gray + opt_base + ']'.gray);
    console.log('');
    console.log(_ident(4) + cli + ' ' + 'help'.bold + _ident(36) + ' »  prints this message');
    console.log(_ident(4) + cli + ' ' + 'init'.bold + _ident(36)  + ' »  initialize the manager on this project');
    console.log(_ident(4) + cli + ' ' + 'list'.bold + _ident(36) + ' »  list all versions managed');
    console.log(_ident(4) + cli + ' ' + 'generate'.bold + _ident(2) + opt_file + _ident(1) + ' ['.gray + opt_base + ']'.gray + _ident(1) + ' »  (re)generate the API based on specified OpenAPI schema');
    console.log('');
}

function init() {
    const apimConfig = {};

    inquirer.prompt({
        name: 'side',
        message: 'Which side is this project?',
        type: 'list',
        choices: ['server', 'client']
    }).then(({side}) => {
        apimConfig.side = side;

        const languages = side === 'server' ? [
            'php'
        ] : [
            'php'
        ];

        inquirer.prompt([
            {
                name: 'lang',
                message: 'Which language should be used?',
                type: 'list',
                choices: languages
            },
            {
                name: 'root',
                message: 'Where API\'s should be located?',
                type: 'input',
                default: '/api'
            }
        ]).then(({lang, root}) => {
            apimConfig.lang = lang;
            apimConfig.root = root;
            console.log('Take a look on your chooses:');
            console.log(JSON.stringify(apimConfig, null, 4));
            inquirer.prompt({
                name: 'confirm',
                message: 'Everything is ok?',
                type: 'confirm'
            }).then(({confirm}) => {
                if (!confirm) {
                    console.log('\n\n\n');
                    return init();
                }

                fs.writeFile(cwd + '/apim.config.json', JSON.stringify(apimConfig, null, 4));
            })
        });
    });
}

function loadConfig() {
    if (fs.existsSync(cwd + '/apim.config.json')) {
        apimConfig = JSON.parse(fs.readFileSync(cwd + '/apim.config.json').toString());
        return;
    }
    
    throw new Error('Configuration file not found. Did you initialize the API manager by calling \'apim init\'?')
}

async function list() {
    if (!fs.pathExistsSync(cwd + apimConfig.root)) {
        console.log('No managed APIs found'.gray);
        return;
    }
    
    console.log('Managed API versions:'.bold);
    const versions = await (await fs.readdir(cwd + apimConfig.root, {withFileTypes: true}))
        .filter(dirent => dirent.isDirectory() && dirent.name.charAt(0) !== '.' && fs.pathExistsSync(cwd + apimConfig.root + dirent.name + '/api.json'))
        .map(dirent => dirent.name);
    for (let version of versions) {
        console.log(version.green);
    }
}

async function _generate(api) {
    const root = cwd + apimConfig.root + '/' + api.info.version;
    const rootLang = apimConfig.lang.charAt(0) === '/' 
        ? cwd + apimConfig.lang
        : __dirname + "/" + apimConfig.lang;

        console.log(rootLang);

    if (!fs.pathExistsSync(rootLang + '/structure.json')) {
        console.error('Tree map not found. Aborting...'.red);
        process.exit();
    }

    const structure = await fs.readFile(rootLang + '/structure.json');
    const { treeMap, noRegenerate } = JSON.parse(structure);

    await _createFolder(root);

    iterateTreeMap(treeMap, null, api).then(() => fs.writeFile(root + '/api.json', JSON.stringify(api, null, 4)));
    
    async function iterateTreeMap(map, currentKey, data, path, dataKey) {
        if (!path) path = [];

        for (let i in map) {
            const options = map[i];
            
            if (i.charAt(0) === '$') {
                await iterateTreeMap(map[i], i, data[i.replace('$', '')], path);
                continue;
            }

            if (i.charAt(0) === '[') {

                for (let k in data) {
                    
                    if (i.indexOf('.') !== -1) {
                        let single = {};
                        single[i.replace('[', '').replace(']', '')] = map[i];
                        await iterateTreeMap(single, currentKey, data[k], path, k);

                        continue;
                    }

                    const tag = k.substr(1, k.length).split('/').shift();
                    let single = {};
                    single[tag] = map[i];
                    await iterateTreeMap(single, currentKey, data[k], path, k);

                }

                continue;
            }

            if (i.indexOf('.') !== -1) {
                const parsed = await parseArgs(i, data, dataKey);
                if (parsed !== false) {
                    const concat = path.join('/') + '/' + parsed;
                    await fs.writeFile(root + concat, JSON.stringify(data, null, 4));
                    continue;
                }

                let rename = options.rename ?? null;
                if (rename) {
                    const parsed = await parseArgs(rename, data, dataKey);
                    if (parsed !== false) {
                        rename = parsed;
                    }
                }

                const concat = path.join('/') + '/' + (rename ?? i);

                let canRegenerate = true;
                for (let nr of noRegenerate) {
                    if ((nr.charAt(0) === '/' && concat.indexOf(nr) === 0) || 
                        ((rename ?? i) === nr)) {
                        canRegenerate = false;
                        break;
                    }
                }

                if (!canRegenerate) {
                    const fileAlreadyCreated = await fs.pathExists(root + concat);
                    if (fileAlreadyCreated) {
                        continue;
                    }
                }

                const template = await fs.readFile(rootLang + '/' + i);
                let d = data;
                d.key = dataKey;
                await fs.writeFile(root + concat, '')(d);
                continue;
            } else {
                await createFolder(i, data);
            }
        }

        async function parseArgs(original, data, parentKey) {
            let parsed = original;
            const placeholders = parsed.match(/({.*})/g);
            if (placeholders !== null) {
                for (let p of placeholders) {
                    const dataTreePath = p.replace('{', '').replace('}', '').split('.');
    
                    let value = data;
                    for (let deep of dataTreePath) {
                        value = deep === 'key' ? parentKey : (value[deep] ?? '');
                    }
    
                    parsed = parsed.replace(p, value);
                }
                return parsed;
            }
            return false;
        }
    
        async function createFolder(i, data) {
            path = [path.join('/')];
            path.push(i);
            const concat = path.join('/');
            await _createFolder(root + concat);
            await iterateTreeMap(map[i], i, data, path);
            path = [path[0]];
        }
    }
}

async function _createFolder(path) {
    const exists = await fs.pathExists(path);
    if (!exists) {
        await fs.mkdir(path, {recursive: true});
    }
    return true;
}

function _ident(times) {
    let space = ' ';
    let identation = '';
    for (let i = 0; i < times; i++) {
        identation += space;
    }
    return identation;
}